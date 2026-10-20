import { APIError } from "better-auth/api";
import type { ProfileActionState } from "@/actions/profile-state";
import type { auth as AuthInstance } from "@/lib/auth";
import { describeAuthError } from "@/lib/auth-error-message";
import { changePasswordSchema, updateNameSchema } from "@/schemas/profile";

type ProfileAuth = Pick<typeof AuthInstance, "api">;

const UNEXPECTED_ERROR = "Ça n'a pas fonctionné. Réessaie dans un instant.";

function describeFailure(error: unknown): string {
  if (!(error instanceof APIError)) throw error;
  const code = typeof error.body?.code === "string" ? error.body.code : undefined;
  if (code === "INVALID_PASSWORD") return "Le mot de passe actuel est incorrect.";
  return describeAuthError({ code, status: error.statusCode }, UNEXPECTED_ERROR);
}

/**
 * The session comes from `headers` (the request cookies), never from the input: Better Auth resolves
 * the user itself, and rejects the call when there is none (ADR-0008).
 */
export async function updateNameWithAuth(
  authInstance: ProfileAuth,
  headers: Headers,
  input: unknown,
): Promise<ProfileActionState> {
  const parsed = updateNameSchema.safeParse(input);
  if (!parsed.success) {
    return { status: "error", message: parsed.error.issues[0]?.message ?? UNEXPECTED_ERROR };
  }
  try {
    await authInstance.api.updateUser({ headers, body: { name: parsed.data.name } });
  } catch (error) {
    return { status: "error", message: describeFailure(error) };
  }
  return { status: "success", message: "Prénom mis à jour." };
}

/** Signs out every other session: whoever knew the old password loses access with it. */
export async function changePasswordWithAuth(
  authInstance: ProfileAuth,
  headers: Headers,
  input: unknown,
): Promise<ProfileActionState> {
  const parsed = changePasswordSchema.safeParse(input);
  if (!parsed.success) {
    return { status: "error", message: parsed.error.issues[0]?.message ?? UNEXPECTED_ERROR };
  }
  try {
    await authInstance.api.changePassword({
      headers,
      body: {
        currentPassword: parsed.data.currentPassword,
        newPassword: parsed.data.newPassword,
        revokeOtherSessions: true,
      },
    });
  } catch (error) {
    return { status: "error", message: describeFailure(error) };
  }
  return {
    status: "success",
    message: "Mot de passe modifié. Tes autres appareils sont déconnectés.",
  };
}
