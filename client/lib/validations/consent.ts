import { z } from "zod";

export const consentSchema = z.object({
  kind: z.enum(["tos", "privacy", "cookies", "marketing"]),
  version: z.string().trim().min(1).max(32),
  granted: z.boolean(),
}).strict();

export type ConsentInput = z.infer<typeof consentSchema>;
