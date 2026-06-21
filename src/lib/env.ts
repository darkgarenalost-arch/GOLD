import { z } from "zod";

const envSchema = z.object({
  NEXT_PUBLIC_APP_URL: z.string().url().optional().or(z.literal("")),
  CRON_SECRET: z.string().optional(),
  ALERT_MIN_SCORE: z.coerce.number().min(1).max(100).default(80),
  RESEND_API_KEY: z.string().optional(),
  ALERT_EMAIL_FROM: z.string().email().optional().or(z.literal("")),
  ALERT_EMAIL_TO: z.string().email().optional().or(z.literal("")),
  TELEGRAM_BOT_TOKEN: z.string().optional(),
  TELEGRAM_CHAT_ID: z.string().optional(),
  DISCORD_WEBHOOK_URL: z.string().url().optional().or(z.literal("")),
  SLACK_WEBHOOK_URL: z.string().url().optional().or(z.literal(""))
});

export type AppEnv = z.infer<typeof envSchema>;

export function getEnv(): AppEnv {
  return envSchema.parse(process.env);
}
