/** Better Auth answers in English; these are the cases a person can run into, worded for them. */
const AUTH_ERROR_MESSAGES: Record<string, string> = {
  INVALID_EMAIL_OR_PASSWORD: "Email ou mot de passe incorrect.",
  INVALID_PASSWORD: "Mot de passe incorrect.",
  INVALID_EMAIL: "Cette adresse email n'est pas valide.",
  INVALID_TWO_FACTOR_COOKIE: "La vérification a expiré. Reconnecte-toi.",
  INVALID_CODE: "Ce code n'est pas valide. Vérifie-le puis réessaie.",
  INVALID_BACKUP_CODE: "Ce code de secours n'est pas valide ou a déjà servi.",
  TOO_MANY_ATTEMPTS: "Trop de tentatives. Patiente un moment avant de réessayer.",
  TOO_MANY_ATTEMPTS_REQUEST_NEW_CODE:
    "Trop de tentatives. Reconnecte-toi pour obtenir un nouveau code.",
};

type AuthError = { code?: string; status?: number; message?: string };

export function describeAuthError(error: AuthError, fallback: string): string {
  const known = error.code ? AUTH_ERROR_MESSAGES[error.code] : undefined;
  if (known) return known;
  if (error.status === 429) return "Trop de tentatives. Patiente un moment avant de réessayer.";
  if (error.status === 0 || error.status === 500) {
    return "Le serveur ne répond pas. Vérifie ta connexion puis réessaie.";
  }
  return fallback;
}
