import { z } from "zod";
import { passwordSchema } from "./password";

export const createAccountSchema = z.object({
  name: z.string().trim().min(1, "Prénom requis."),
  email: z.string().trim().email("Email invalide."),
  password: passwordSchema,
});
