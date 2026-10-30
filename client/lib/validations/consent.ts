import { z } from "zod";

export const consentSchema = z.object({
  kind: z.enum(["tos", "privacy", "cookies", "marketing"]),
  version: z.string(),
  granted: z.boolean(),
});

export type ConsentInput = z.infer<typeof consentSchema>;
