import { z } from "zod";

/** Same bounds as Better Auth's own check (8 to 128), so a rejected password is worded here first. */
export const passwordSchema = z
  .string()
  .min(8, "8 caractères minimum.")
  .max(128, "128 caractères maximum.");
