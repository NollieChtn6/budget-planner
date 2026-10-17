"use client";

import { twoFactorClient } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient({
  plugins: [
    twoFactorClient({
      // Full reload is fine here: this app has no client-side auth state
      // to preserve across the redirect.
      twoFactorPage: "/verify-2fa",
    }),
  ],
});
