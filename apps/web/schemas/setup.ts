import { z } from "zod";

export const createAccountSchema = z.object({
  name: z.string().trim().min(1, "Prénom requis."),
  email: z.string().trim().email("Email invalide."),
  password: z.string().min(8, "8 caractères minimum."),
});
