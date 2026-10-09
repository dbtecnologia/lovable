import test from "node:test";
import assert from "node:assert/strict";
import { assertCompanyAccess } from "../src/tenant.js";
import { getBotReply } from "../src/bot.js";

test("bloqueia acesso cruzado entre empresas", () => {
  assert.throws(() => assertCompanyAccess({ id: "u1", companyId: "company-a", role: "AGENT" }, "company-b"), /acesso/);
  assert.doesNotThrow(() => assertCompanyAccess({ id: "u1", companyId: "company-a", role: "AGENT" }, "company-a"));
});

test("bot transfere para humano sem responder em loop", () => {
  const config = { enabled: true, welcomeMessage: "Olá", fallbackMessage: "Não entendi", afterHoursMessage: "Fora", timezone: "America/Sao_Paulo", stepTtlMinutes: 30, menu: [{ key: "1", label: "Suporte", reply: "Vou transferir", transfer: true }], businessHours: {} };
  assert.equal(getBotReply({ body: "1", step: "menu", config }).action, "transfer");
  assert.equal(getBotReply({ body: "mensagem humana", step: null, config }).action, "fallback");
});
