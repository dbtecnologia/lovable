import type { FastifyRequest } from "fastify";

export type SessionUser = { id: string; companyId: string | null; role: "PLATFORM_ADMIN" | "COMPANY_ADMIN" | "AGENT" };

export function assertCompanyAccess(user: SessionUser, companyId: string) {
  if (user.role !== "PLATFORM_ADMIN" && user.companyId !== companyId) {
    const error = new Error("Você não tem acesso a esta empresa");
    (error as Error & { statusCode?: number }).statusCode = 403;
    throw error;
  }
}

export function companyFromRequest(request: FastifyRequest): string {
  const user = request.user as SessionUser | undefined;
  const companyId = user?.companyId ?? request.headers["x-company-id"];
  if (!companyId || Array.isArray(companyId)) throw Object.assign(new Error("Empresa não identificada"), { statusCode: 401 });
  assertCompanyAccess(user ?? { id: "demo", companyId: String(companyId), role: "AGENT" }, String(companyId));
  return String(companyId);
}
