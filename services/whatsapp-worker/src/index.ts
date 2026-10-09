import { SessionManager } from "./session-manager.js";

const manager = new SessionManager();
const api = process.env.API_URL ?? "http://localhost:4000";

async function discover() {
  const response = await fetch(`${api}/internal/connections/active`, { headers: { "x-worker-secret": process.env.WORKER_SECRET ?? "dev-worker" } });
  if (!response.ok) throw new Error(`Não foi possível descobrir conexões (${response.status})`);
  const connections = await response.json() as Array<{ id: string; companyId: string; label: string }>;
  await Promise.all(connections.map((connection) => manager.start(connection)));
}

await discover().catch((error) => console.error(error));
setInterval(() => void discover().catch((error) => console.error(error)), 30_000);
process.on("SIGTERM", () => void manager.shutdown());
process.on("SIGINT", () => void manager.shutdown());
