import { z } from "zod";
import { PASSWORD_MAX, PASSWORD_MIN, USERNAME_MAX, USERNAME_MIN } from "@/lib/limits";

export const loginSchema = z.object({
  username: z.string().min(USERNAME_MIN).max(USERNAME_MAX),
  password: z.string().min(PASSWORD_MIN).max(PASSWORD_MAX),
});
export const registerSchema = loginSchema.extend({
  turnstileToken: z.string().min(1).max(2048).optional(),
  acceptRules: z.literal(true, {
    error: "Tenés que aceptar las reglas de Voxer para crear una cuenta.",
  }),
});

export const acceptRulesSchema = z.object({
  version: z.number().int().positive(),
});
