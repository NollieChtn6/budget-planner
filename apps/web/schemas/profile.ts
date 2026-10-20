import { z } from "zod";
import { passwordSchema } from "./password";

export const updateNameSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Saisis ton prénom.")
    .max(50, "Ton prénom ne peut pas dépasser 50 caractères."),
});

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Saisis ton mot de passe actuel."),
    newPassword: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((input) => input.newPassword === input.confirmPassword, {
    path: ["confirmPassword"],
    message: "Les deux mots de passe ne correspondent pas.",
  })
  .refine((input) => input.newPassword !== input.currentPassword, {
    path: ["newPassword"],
    message: "Choisis un mot de passe différent de l'actuel.",
  });
