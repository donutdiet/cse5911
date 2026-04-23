"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function isValidOsuStudentEmail(email: string) {
  return email.trim().toLowerCase().endsWith("@osu.edu");
}

function getConfirmRedirectUrl() {
  return `${window.location.origin}/confirm?next=${encodeURIComponent("/student")}`;
}

export function SignUpVerificationCard() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const emailFromQuery = useMemo(
    () => searchParams.get("email")?.trim().toLowerCase() ?? "",
    [searchParams],
  );
  const [email, setEmail] = useState(emailFromQuery);
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [isEditingEmail, setIsEditingEmail] = useState(emailFromQuery.length === 0);

  const normalizedEmail = email.trim().toLowerCase();
  const emailLocked = emailFromQuery.length > 0 && !isEditingEmail;

  async function handleVerifyCode(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const supabase = createClient();
    setError(null);
    setSuccessMessage(null);
    setIsVerifying(true);

    if (!isValidOsuStudentEmail(normalizedEmail)) {
      setError("Enter the same @osu.edu address used during sign up.");
      setIsVerifying(false);
      return;
    }

    if (!code.trim()) {
      setError("Enter the confirmation code from your email.");
      setIsVerifying(false);
      return;
    }

    try {
      const { error: verifyError } = await supabase.auth.verifyOtp({
        email: normalizedEmail,
        token: code.trim(),
        type: "signup",
      });

      if (verifyError) {
        throw verifyError;
      }

      router.push("/student");
      router.refresh();
    } catch (verifyError: unknown) {
      setError(
        verifyError instanceof Error
          ? verifyError.message
          : "Failed to verify your code.",
      );
    } finally {
      setIsVerifying(false);
    }
  }

  async function handleResendCode() {
    const supabase = createClient();
    setError(null);
    setSuccessMessage(null);
    setIsResending(true);

    if (!isValidOsuStudentEmail(normalizedEmail)) {
      setError("Enter your @osu.edu email address to resend the code.");
      setIsResending(false);
      return;
    }

    try {
      const { error: resendError } = await supabase.auth.resend({
        type: "signup",
        email: normalizedEmail,
        options: {
          emailRedirectTo: getConfirmRedirectUrl(),
        },
      });

      if (resendError) {
        throw resendError;
      }

      setSuccessMessage("A new confirmation code was sent.");
    } catch (resendError: unknown) {
      setError(
        resendError instanceof Error
          ? resendError.message
          : "Failed to resend the confirmation code.",
      );
    } finally {
      setIsResending(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-2xl">Verify your email</CardTitle>
        <CardDescription>
          Enter the confirmation code sent to your OSU email to finish creating
          your account.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleVerifyCode} className="space-y-6">
          <div className="grid gap-2">
            <div className="flex items-center justify-between gap-3">
              <Label htmlFor="verification-email">OSU email</Label>
              {emailFromQuery.length > 0 && (
                <Button
                  type="button"
                  variant="link"
                  size="sm"
                  className="h-auto px-0 py-0 text-xs"
                  disabled={isVerifying || isResending}
                  onClick={() => {
                    setError(null);
                    setSuccessMessage(null);
                    setIsEditingEmail((current) => !current);
                    if (isEditingEmail) {
                      setEmail(emailFromQuery);
                    }
                  }}
                >
                  {emailLocked ? "Wrong email?" : "Use original email"}
                </Button>
              )}
            </div>
            <Input
              id="verification-email"
              type="email"
              placeholder="name.#@osu.edu"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              readOnly={emailLocked}
              disabled={isVerifying || isResending}
              required
            />
            {emailLocked && (
              <p className="text-xs text-muted-foreground">
                This is the email used during sign up.
              </p>
            )}
          </div>

          <div className="grid gap-2">
            <Label htmlFor="verification-code">Confirmation code</Label>
            <Input
              id="verification-code"
              inputMode="numeric"
              autoComplete="one-time-code"
              placeholder="Enter the code from your email"
              value={code}
              onChange={(event) => setCode(event.target.value)}
              disabled={isVerifying}
              required
            />
            <p className="text-xs text-muted-foreground">
              Use the confirmation code shown in the email to verify your
              account.
            </p>
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}
          {successMessage && (
            <p className="text-sm text-emerald-700">{successMessage}</p>
          )}

          <div className="flex flex-col gap-2">
            <Button type="submit" className="w-full" disabled={isVerifying}>
              {isVerifying ? "Verifying..." : "Verify email"}
            </Button>
            <Button
              type="button"
              variant="outline"
              className="w-full"
              disabled={isResending || isVerifying}
              onClick={handleResendCode}
            >
              {isResending ? "Resending..." : "Resend code"}
            </Button>
          </div>

          <div className="text-center text-sm">
            Already verified?{" "}
            <Link href="/login" className="underline underline-offset-4">
              Login
            </Link>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
