"use client";

import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { authClient } from "@/lib/auth-client";
import { describeAuthError } from "@/lib/auth-error-message";

export default function VerifyTwoFactorPage() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [useBackupCode, setUseBackupCode] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function verify(codeToVerify: string) {
    setPending(true);
    setError(null);

    const { error: verifyError } = useBackupCode
      ? await authClient.twoFactor.verifyBackupCode({ code: codeToVerify })
      : await authClient.twoFactor.verifyTotp({ code: codeToVerify });

    setPending(false);
    if (verifyError) {
      setError(
        describeAuthError(verifyError, "Ce code n'est pas valide. Vérifie-le puis réessaie."),
      );
      return;
    }

    router.push("/");
    router.refresh();
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    verify(code);
  }

  function handleOtpChange(value: string) {
    setCode(value);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Vérification en deux étapes</CardTitle>
        <CardDescription>
          {useBackupCode
            ? "Saisis l'un de tes codes de secours."
            : "Saisis le code affiché par ton application d'authentification."}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit}>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="code">Code</FieldLabel>
              {useBackupCode ? (
                <Input
                  id="code"
                  autoComplete="one-time-code"
                  required
                  value={code}
                  onChange={(event) => setCode(event.target.value)}
                />
              ) : (
                <InputOTP id="code" maxLength={6} value={code} onChange={handleOtpChange}>
                  <InputOTPGroup>
                    {[0, 1, 2, 3, 4, 5].map((index) => (
                      <InputOTPSlot key={index} index={index} />
                    ))}
                  </InputOTPGroup>
                </InputOTP>
              )}
            </Field>
            {error ? <FieldError>{error}</FieldError> : null}
            <Button type="submit" disabled={pending || code.length === 0}>
              {pending ? "Vérification..." : "Valider"}
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setUseBackupCode((current) => !current);
                setCode("");
                setError(null);
              }}
            >
              {useBackupCode
                ? "Utiliser mon application d'authentification"
                : "Utiliser un code de secours"}
            </Button>
          </FieldGroup>
        </form>
      </CardContent>
    </Card>
  );
}
