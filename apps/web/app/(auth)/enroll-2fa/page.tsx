"use client";

import { useRouter } from "next/navigation";
import QRCode from "qrcode";
import { type FormEvent, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { authClient } from "@/lib/auth-client";

type EnrollmentStep =
  | { name: "password" }
  | { name: "verify"; totpUri: string; backupCodes: string[] };

export default function EnrollTwoFactorPage() {
  const router = useRouter();
  const [step, setStep] = useState<EnrollmentStep>({ name: "password" });
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleEnable(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const password = new FormData(event.currentTarget).get("password");
    if (typeof password !== "string") return;

    setPending(true);
    setError(null);
    const { data, error: enableError } = await authClient.twoFactor.enable({
      password,
      method: "totp",
    });
    setPending(false);

    if (enableError || !data || data.method !== "totp") {
      setError(enableError?.message ?? "Impossible d'activer le second facteur.");
      return;
    }

    setStep({ name: "verify", totpUri: data.totpURI, backupCodes: data.backupCodes });
  }

  async function handleVerify(code: string) {
    setPending(true);
    setError(null);
    const { error: verifyError } = await authClient.twoFactor.verifyTotp({ code });
    setPending(false);

    if (verifyError) {
      setError(verifyError.message ?? "Code invalide.");
      return;
    }

    router.push("/");
    router.refresh();
  }

  if (step.name === "verify") {
    return (
      <EnrollmentVerifyStep
        totpUri={step.totpUri}
        backupCodes={step.backupCodes}
        error={error}
        pending={pending}
        onVerify={handleVerify}
      />
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Activer la vérification en deux étapes</CardTitle>
        <CardDescription>
          Confirmez votre mot de passe pour générer votre code d'authentification.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleEnable}>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="password">Mot de passe</FieldLabel>
              <Input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
              />
            </Field>
            {error ? <FieldError>{error}</FieldError> : null}
            <Button type="submit" disabled={pending}>
              {pending ? "..." : "Continuer"}
            </Button>
          </FieldGroup>
        </form>
      </CardContent>
    </Card>
  );
}

function EnrollmentVerifyStep({
  totpUri,
  backupCodes,
  error,
  pending,
  onVerify,
}: {
  totpUri: string;
  backupCodes: string[];
  error: string | null;
  pending: boolean;
  onVerify: (code: string) => void;
}) {
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [qrError, setQrError] = useState(false);
  const [code, setCode] = useState("");

  useEffect(() => {
    let cancelled = false;
    QRCode.toDataURL(totpUri, { width: 256, margin: 2 })
      .then((dataUrl) => {
        if (!cancelled) setQrDataUrl(dataUrl);
      })
      .catch(() => {
        if (!cancelled) setQrError(true);
      });
    return () => {
      cancelled = true;
    };
  }, [totpUri]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onVerify(code);
  }

  function handleCodeChange(value: string) {
    setCode(value);
    if (value.length === 6 && !pending) {
      onVerify(value);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Scannez le code</CardTitle>
        <CardDescription>
          Scannez ce QR code avec votre application d'authentification, puis saisissez le code
          qu'elle affiche.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <FieldGroup>
          {qrDataUrl ? (
            // biome-ignore lint/performance/noImgElement: data URI, not an optimizable remote image
            <img
              src={qrDataUrl}
              alt="QR code d'activation du second facteur"
              className="mx-auto size-56"
            />
          ) : null}
          {qrError ? (
            <FieldError>
              Le QR code n'a pas pu être généré. Saisissez cette clé manuellement dans votre
              application d'authentification :{" "}
              <span className="font-mono break-all">{totpUri}</span>
            </FieldError>
          ) : null}
          <div>
            <p className="mb-1.5 text-sm font-medium">Codes de secours</p>
            <p className="text-sm text-muted-foreground">
              Conservez-les en lieu sûr : ils permettent de vous connecter si vous perdez l'accès à
              votre application d'authentification.
            </p>
            <ul className="mt-2 grid grid-cols-2 gap-1 font-mono text-sm">
              {backupCodes.map((backupCode) => (
                <li key={backupCode}>{backupCode}</li>
              ))}
            </ul>
          </div>
          <form onSubmit={handleSubmit}>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="code">Code de vérification</FieldLabel>
                <InputOTP
                  id="code"
                  maxLength={6}
                  value={code}
                  onChange={handleCodeChange}
                  autoComplete="one-time-code"
                >
                  <InputOTPGroup>
                    {[0, 1, 2, 3, 4, 5].map((index) => (
                      <InputOTPSlot key={index} index={index} />
                    ))}
                  </InputOTPGroup>
                </InputOTP>
              </Field>
              {error ? <FieldError>{error}</FieldError> : null}
              <Button type="submit" disabled={pending || code.length !== 6}>
                {pending ? "Vérification..." : "Activer"}
              </Button>
            </FieldGroup>
          </form>
        </FieldGroup>
      </CardContent>
    </Card>
  );
}
