import fs from "node:fs/promises";
import path from "node:path";
import makeWASocket, { DisconnectReason, useMultiFileAuthState, type WASocket } from "@whiskeysockets/baileys";
import { Boom } from "@hapi/boom";
import pino from "pino";

type Connection = { id: string; companyId: string; label: string };
type ConnectionStatus = "DISCONNECTED" | "QR_PENDING" | "CONNECTED" | "RECONNECTING";
const log = pino({ level: process.env.LOG_LEVEL ?? "info" });

export class SessionManager {
  private sockets = new Map<string, WASocket>();
  private reconnectTimers = new Map<string, NodeJS.Timeout>();
  private stopped = false;
  private readonly root = process.env.SESSION_ROOT ?? path.resolve("sessions");

  async start(connection: Connection) {
    if (this.stopped || this.sockets.has(connection.id)) return;
    const dir = path.join(this.root, connection.companyId, connection.id);
    await fs.mkdir(dir, { recursive: true, mode: 0o700 });
    const lock = path.join(dir, ".lock");
    try { const handle = await fs.open(lock, "wx"); await handle.writeFile(String(process.pid)); await handle.close(); }
    catch { log.warn({ connectionId: connection.id }, "session already locked; skipping duplicate process"); return; }
    await this.connect(connection, dir, lock, 0);
  }

  private async connect(connection: Connection, dir: string, lock: string, attempt: number) {
    const { state, saveCreds } = await useMultiFileAuthState(dir);
    await this.publish(connection.id, "RECONNECTING");
    const socket = makeWASocket({ auth: state, markOnlineOnConnect: false, logger: log.child({ connectionId: connection.id }) });
    this.sockets.set(connection.id, socket);
    socket.ev.on("creds.update", saveCreds);
    socket.ev.on("connection.update", async ({ connection: status, lastDisconnect, qr }) => {
      if (qr) { await this.publish(connection.id, "QR_PENDING", { qr }); }
      if (status === "open") { await this.publish(connection.id, "CONNECTED", { jid: socket.user?.id }); }
      if (status !== "close") return;
      this.sockets.delete(connection.id);
      const code = (lastDisconnect?.error as Boom)?.output?.statusCode;
      const loggedOut = code === DisconnectReason.loggedOut || code === DisconnectReason.badSession;
      if (loggedOut) { await this.publish(connection.id, "DISCONNECTED", { lastError: "Sessão inválida; novo pareamento necessário" }); await this.releaseLock(lock); return; }
      const delay = Math.min(30_000, 1_000 * 2 ** Math.min(attempt, 5));
      await this.publish(connection.id, "RECONNECTING", { lastError: `Reconectando em ${Math.round(delay / 1000)}s` });
      const timer = setTimeout(() => void this.connect(connection, dir, lock, attempt + 1), delay);
      this.reconnectTimers.set(connection.id, timer);
    });
    socket.ev.on("messages.upsert", async ({ messages, type }) => {
      if (type !== "notify") return;
      for (const message of messages) {
        if (message.key.fromMe || !message.key.remoteJid || message.key.remoteJid.endsWith("@g.us") || message.key.remoteJid === "status@broadcast") continue;
        const body = message.message?.conversation ?? message.message?.extendedTextMessage?.text ?? null;
        if (!body) continue;
        await this.publishInbound(connection, { providerId: message.key.id ?? crypto.randomUUID(), remoteJid: message.key.remoteJid, body, pushName: message.pushName ?? "Contato" });
      }
    });
  }

  async stop(connectionId: string) { const timer = this.reconnectTimers.get(connectionId); if (timer) clearTimeout(timer); const socket = this.sockets.get(connectionId); if (socket) { socket.end(undefined); this.sockets.delete(connectionId); } }
  async shutdown() { this.stopped = true; for (const id of this.sockets.keys()) await this.stop(id); }

  private async publish(connectionId: string, status: ConnectionStatus, extra: Record<string, unknown> = {}) {
    await fetch(`${process.env.API_URL ?? "http://localhost:4000"}/internal/connections/${connectionId}/status`, { method: "POST", headers: { "content-type": "application/json", "x-worker-secret": process.env.WORKER_SECRET ?? "dev-worker" }, body: JSON.stringify({ status, ...extra }) }).catch(() => undefined);
  }

  private async publishInbound(connection: Connection, message: { providerId: string; remoteJid: string; body: string; pushName: string }) {
    await fetch(`${process.env.API_URL ?? "http://localhost:4000"}/internal/inbound`, { method: "POST", headers: { "content-type": "application/json", "x-worker-secret": process.env.WORKER_SECRET ?? "dev-worker" }, body: JSON.stringify({ ...message, connectionId: connection.id, companyId: connection.companyId }) }).catch((error) => log.error({ error, connectionId: connection.id }, "inbound publish failed"));
  }

  private async releaseLock(lock: string) { await fs.unlink(lock).catch(() => undefined); }
}
