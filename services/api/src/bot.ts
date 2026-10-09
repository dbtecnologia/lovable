import { z } from "zod";

const menuOption = z.object({ key: z.string().min(1), label: z.string().min(1), reply: z.string().min(1), sectorId: z.string().optional(), transfer: z.boolean().default(false) });
export const botConfigSchema = z.object({
  enabled: z.boolean(), welcomeMessage: z.string().min(1), fallbackMessage: z.string().min(1), afterHoursMessage: z.string().min(1),
  timezone: z.string().min(1), stepTtlMinutes: z.number().int().min(1).max(1440), menu: z.array(menuOption).min(1),
  businessHours: z.record(z.string(), z.object({ enabled: z.boolean(), start: z.string(), end: z.string() }))
});

export type BotConfigInput = z.infer<typeof botConfigSchema>;

export function normalizeInboundText(value: unknown) { return typeof value === "string" ? value.trim().toLocaleLowerCase("pt-BR") : ""; }

export function getBotReply(input: { body: string; step: string | null; config: BotConfigInput }) {
  const body = normalizeInboundText(input.body);
  const option = input.config.menu.find((item) => item.key === body || item.label.toLocaleLowerCase("pt-BR") === body);
  if (!input.config.enabled) return { action: "ignore" as const };
  if (!input.step && ["oi", "olá", "ola", "bom dia", "boa tarde", "boa noite"].includes(body)) return { action: "reply" as const, text: `${input.config.welcomeMessage}\n\n${input.config.menu.map((item) => `${item.key} — ${item.label}`).join("\n")}` };
  if (option?.transfer) return { action: "transfer" as const, sectorId: option.sectorId };
  if (option) return { action: "reply" as const, text: option.reply, sectorId: option.sectorId };
  return { action: "fallback" as const, text: input.config.fallbackMessage };
}
