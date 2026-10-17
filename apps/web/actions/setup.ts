"use server";

import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { AccountAlreadyExistsError, createUser } from "@/lib/create-user";
import { isSetupTokenValid } from "@/lib/setup-token";
import { createAccountSchema } from "@/schemas/setup";
import type { SetupActionState } from "./setup-state";

/**
 * The page gating `/setup` on a valid token (see app/(auth)/setup/page.tsx)
 * is not sufficient proof the token was presented: this action is a
 * separate request and re-checks it independently (ADR-0008).
 */
export async function createAccountAction(
  _prevState: SetupActionState,
  formData: FormData,
): Promise<SetupActionState> {
  const token = formData.get("token");
  if (typeof token !== "string" || !isSetupTokenValid(token)) {
    return { status: "error", message: "Jeton invalide." };
  }

  const parsed = createAccountSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { status: "error", message: parsed.error.issues[0]?.message ?? "Entrée invalide." };
  }

  try {
    await createUser(auth, parsed.data);
  } catch (error) {
    if (error instanceof AccountAlreadyExistsError) {
      return { status: "error", message: error.message };
    }
    throw error;
  }

  redirect("/sign-in");
}
