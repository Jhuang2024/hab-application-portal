import { env } from "cloudflare:workers";
export function database(): D1Database { if (!env.DB)
    throw new Error("Database unavailable"); return env.DB; }
export function organizerEmails(): string[] { return String((env as unknown as Record<string, unknown>).ORGANIZER_EMAILS || "").split(",").map(s => s.trim().toLowerCase()).filter(Boolean); }
