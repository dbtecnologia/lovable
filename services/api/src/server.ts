import Fastify from "fastify";
import cors from "@fastify/cors";
import jwt from "@fastify/jwt";
import { PrismaClient, type ConversationStatus, type Role } from "@prisma/client";
import { WebSocketServer } from "ws";
import { z } from "zod";
import { assertCompanyAccess, companyFromRequest } from "./tenant.js";
import { botConfigSchema, getBotReply } from "./bot.js";
import { getSupabaseUser } from "./auth.js";

const prisma = new PrismaClient();
const app = Fastify({ logger: true });
await app.register(cors, { origin: true });
await app.register(jwt, { secret: process.env.JWT_SECRET ?? "dev-only-change-me" });

app.decorate("authenticate", async (request: any, reply: any) => {
  const supabaseUser = await getSupabaseUser(request.headers.authorization);
  if (supabaseUser) { request.user = supabaseUser; return; }
  try { await request.jwtVerify(); } catch { if (process.env.NODE_ENV === "production") return reply.code(401).send({ error: "Sessão inválida" }); }
});
app.get("/health", async () => ({ ok: true, service: "botzap-api", time: new Date().toISOString() }));

app.post("/auth/login", async (request, reply) => {
  const body = z.object({ email: z.string().email(), password: z.string().min(6) }).parse(request.body);
  const user = await prisma.user.findUnique({ where: { email: body.email } });
  if (!user || !user.active) return reply.code(401).send({ error: "Credenciais inválidas" });
  // Replace with argon2id verification in production. The seed command hashes passwords before storing them.
  const token = await app.jwt.sign({ id: user.id, companyId: user.companyId, role: user.role });
  return { token, user: { id: user.id, name: user.name, email: user.email, role: user.role } };
});

app.get("/companies/:companyId/conversations", { onRequest: [app.authenticate] }, async (request) => {
  const { companyId } = request.params as { companyId: string }; assertCompanyAccess((request as any).user, companyId);
  return prisma.conversation.findMany({ where: { companyId }, include: { contact: true, assignedUser: { select: { id: true, name: true } }, sector: true, messages: { orderBy: { createdAt: "desc" }, take: 1 } }, orderBy: { lastMessageAt: "desc" } });
});

app.post("/companies/:companyId/conversations/:conversationId/claim", { onRequest: [app.authenticate] }, async (request, reply) => {
  const companyId = companyFromRequest(request); const { conversationId } = request.params as { conversationId: string }; const user = (request as any).user;
  const conversation = await prisma.conversation.findFirst({ where: { id: conversationId, companyId } });
  if (!conversation) return reply.code(404).send({ error: "Conversa não encontrada" });
  const claimed = await prisma.conversation.updateMany({ where: { id: conversationId, companyId, assignedUserId: null, status: { not: "CLOSED" } }, data: { assignedUserId: user.id, status: "HUMAN_ACTIVE" } });
  if (!claimed.count) return reply.code(409).send({ error: "Esta conversa já foi assumida por outro atendente" });
  return prisma.conversation.findUnique({ where: { id: conversationId } });
});

app.patch("/companies/:companyId/conversations/:conversationId/status", { onRequest: [app.authenticate] }, async (request, reply) => {
  const companyId = companyFromRequest(request); const { conversationId } = request.params as { conversationId: string };
  const { status } = z.object({ status: z.enum(["BOT_WAITING", "HUMAN_WAITING", "HUMAN_ACTIVE", "CLOSED"]) }).parse(request.body);
  const result = await prisma.conversation.updateMany({ where: { id: conversationId, companyId }, data: { status: status as ConversationStatus, ...(status === "CLOSED" ? { botStep: null, botStepExpiresAt: null } : {}) } });
  if (!result.count) return reply.code(404).send({ error: "Conversa não encontrada" }); return { ok: true };
});

app.get("/companies/:companyId/bot", { onRequest: [app.authenticate] }, async (request) => { const companyId = companyFromRequest(request); return prisma.botConfig.findUnique({ where: { companyId } }); });
app.put("/companies/:companyId/bot", { onRequest: [app.authenticate] }, async (request) => { const companyId = companyFromRequest(request); const config = botConfigSchema.parse(request.body); return prisma.botConfig.upsert({ where: { companyId }, create: { companyId, ...config }, update: config }); });

app.get("/companies/:companyId/connections", { onRequest: [app.authenticate] }, async (request) => { const companyId = companyFromRequest(request); return prisma.whatsAppConnection.findMany({ where: { companyId }, select: { id: true, label: true, jid: true, status: true, lastError: true, updatedAt: true } }); });
app.post("/companies/:companyId/connections", { onRequest: [app.authenticate] }, async (request) => { const companyId = companyFromRequest(request); const { label } = z.object({ label: z.string().min(2).max(50) }).parse(request.body); return prisma.whatsAppConnection.create({ data: { companyId, label, status: "QR_PENDING" } }); });
app.delete("/companies/:companyId/connections/:connectionId", { onRequest: [app.authenticate] }, async (request, reply) => { const companyId = companyFromRequest(request); const { connectionId } = request.params as { connectionId: string }; const deleted = await prisma.whatsAppConnection.deleteMany({ where: { id: connectionId, companyId } }); if (!deleted.count) return reply.code(404).send({ error: "Conexão não encontrada" }); return { ok: true }; });

function workerOnly(request: any) { if (request.headers["x-worker-secret"] !== (process.env.WORKER_SECRET ?? "dev-worker")) throw Object.assign(new Error("worker não autorizado"), { statusCode: 401 }); }
app.get("/internal/connections/active", async (request) => { workerOnly(request); return prisma.whatsAppConnection.findMany({ where: { status: { not: "DISCONNECTED" } }, select: { id: true, companyId: true, label: true } }); });
app.post("/internal/connections/:connectionId/status", async (request, reply) => { workerOnly(request); const { connectionId } = request.params as { connectionId: string }; const payload = z.object({ status: z.enum(["DISCONNECTED", "QR_PENDING", "CONNECTED", "RECONNECTING"]), jid: z.string().optional(), lastError: z.string().optional(), qr: z.string().optional() }).parse(request.body); const connection = await prisma.whatsAppConnection.update({ where: { id: connectionId }, data: { status: payload.status, jid: payload.jid, lastError: payload.lastError } }); if (payload.qr) app.log.info({ connectionId }, "QR available; stored only in worker event channel"); return reply.send({ ok: true, connectionId: connection.id }); });
app.post("/internal/inbound", async (request, reply) => {
  workerOnly(request);
  const input = z.object({ connectionId: z.string(), companyId: z.string(), providerId: z.string(), remoteJid: z.string(), body: z.string(), pushName: z.string() }).parse(request.body);
  const duplicate = await prisma.message.findUnique({ where: { connectionId_providerId: { connectionId: input.connectionId, providerId: input.providerId } } }); if (duplicate) return { duplicate: true };
  const contact = await prisma.contact.upsert({ where: { companyId_remoteJid: { companyId: input.companyId, remoteJid: input.remoteJid } }, create: { companyId: input.companyId, remoteJid: input.remoteJid, name: input.pushName }, update: { name: input.pushName } });
  const conversation = await prisma.conversation.upsert({ where: { id: `${input.companyId}:${input.remoteJid}` }, create: { id: `${input.companyId}:${input.remoteJid}`, companyId: input.companyId, contactId: contact.id, status: "BOT_WAITING", unreadCount: 1, lastMessageAt: new Date() }, update: { unreadCount: { increment: 1 }, lastMessageAt: new Date() } });
  await prisma.message.create({ data: { companyId: input.companyId, conversationId: conversation.id, connectionId: input.connectionId, providerId: input.providerId, direction: "INBOUND", senderJid: input.remoteJid, body: input.body, status: "received" } });
  const bot = await prisma.botConfig.findUnique({ where: { companyId: input.companyId } });
  const replyPlan = bot && conversation.status === "BOT_WAITING" ? getBotReply({ body: input.body, step: conversation.botStep, config: bot as any }) : { action: "ignore" as const };
  if (replyPlan.action === "transfer") await prisma.conversation.update({ where: { id: conversation.id }, data: { status: "HUMAN_WAITING", sectorId: replyPlan.sectorId ?? null, botStep: null } });
  return reply.send({ conversationId: conversation.id, bot: replyPlan });
});

app.post("/companies/:companyId/simulator/inbound", { onRequest: [app.authenticate] }, async (request) => {
  const companyId = companyFromRequest(request); const { remoteJid, name, body } = z.object({ remoteJid: z.string(), name: z.string(), body: z.string() }).parse(request.body);
  const contact = await prisma.contact.upsert({ where: { companyId_remoteJid: { companyId, remoteJid } }, create: { companyId, remoteJid, name }, update: { name } });
  const connection = await prisma.whatsAppConnection.findFirstOrThrow({ where: { companyId }, orderBy: { createdAt: "asc" } });
  const conversation = await prisma.conversation.upsert({ where: { id: `${companyId}:${remoteJid}` }, create: { id: `${companyId}:${remoteJid}`, companyId, contactId: contact.id, status: "BOT_WAITING", lastMessageAt: new Date() }, update: { lastMessageAt: new Date(), unreadCount: { increment: 1 } } });
  const duplicate = await prisma.message.findUnique({ where: { connectionId_providerId: { connectionId: connection.id, providerId: `sim-${Date.now()}` } } });
  if (duplicate) return { duplicate: true };
  await prisma.message.create({ data: { companyId, conversationId: conversation.id, connectionId: connection.id, providerId: `sim-${Date.now()}`, direction: "INBOUND", senderJid: remoteJid, body } });
  const config = await prisma.botConfig.findUnique({ where: { companyId } });
  const reply = config ? getBotReply({ body, step: conversation.botStep, config: config as any }) : { action: "ignore" as const };
  return { conversationId: conversation.id, bot: reply };
});

const port = Number(process.env.API_PORT ?? 4000);
const server = await app.listen({ port, host: "0.0.0.0" });
const wss = new WebSocketServer({ server: app.server, path: "/ws" });
wss.on("connection", (socket, request) => { const companyId = new URL(request.url ?? "/", "http://localhost").searchParams.get("companyId"); if (!companyId) return socket.close(1008, "companyId obrigatório"); socket.send(JSON.stringify({ type: "ready", companyId })); });
app.log.info(`Botzap API running at ${server}`);

process.on("SIGTERM", async () => { await prisma.$disconnect(); await app.close(); process.exit(0); });
