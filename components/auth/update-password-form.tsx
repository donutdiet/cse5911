"use client";

import { cn } from "@/lib/utils";
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
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";

function getRecoveryRedirectUrl() {
  return `${window.location.origin}/confirm?next=${encodeURIComponent("/update-password")}`;
}

export function UpdatePasswordForm({
  className,
  ...props
}: React.ComponentPropsWithoutRef<"div">) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const emailFromQuery = useMemo(
    () => searchParams.get("email")?.trim().toLowerCase() ?? "",
    [searchParams],
  );
  const [email, setEmail] = useState(emailFromQuery);
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [repeatPassword, setRepeatPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);

  const handleForgotPassword = async (e: React.SubmitEvent) => {
    e.preventDefault();
    const supabase = createClient();
    setIsLoading(true);
    setError(null);
    setSuccessMessage(null);

    if (!email.trim()) {
      setError("Email is required.");
      setIsLoading(false);
      return;
    }

    if (password !== repeatPassword) {
      setError("Passwords do not match");
      setIsLoading(false);
      return;
    }

    try {
      if (code.trim()) {
        const { error: verifyError } = await supabase.auth.verifyOtp({
          email: email.trim().toLowerCase(),
          token: code.trim(),
          type: "recovery",
        });

        if (verifyError) {
          throw verifyError;
        }
      }

      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      router.push("/student");
      router.refresh();
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "An error occurred";
      setError(
        code.trim()
          ? message
          : `${message} If you are resetting by code, enter the code from your email first.`,
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendCode = async () => {
    const supabase = createClient();
    setError(null);
    setSuccessMessage(null);
    setIsResending(true);

    if (!email.trim()) {
      setError("Enter your email address first.");
      setIsResending(false);
      return;
    }

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: getRecoveryRedirectUrl(),
      });

      if (error) throw error;

      setSuccessMessage("A new password reset code was sent.");
    } catch (resendError: unknown) {
      setError(
        resendError instanceof Error
          ? resendError.message
          : "Failed to resend the reset code.",
      );
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Reset Your Password</CardTitle>
          <CardDescription>
            Enter the reset code from your email, then choose a new password.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleForgotPassword}>
            <div className="flex flex-col gap-6">
              <div className="grid gap-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="name.#@osu.edu"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isLoading || isResending}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="reset-code">Reset code</Label>
                <Input
                  id="reset-code"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  placeholder="Enter the code from your email"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  disabled={isLoading}
                />
                <p className="text-xs text-muted-foreground">
                  Use the reset code shown in the email to confirm the password
                  reset.
                </p>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="password">New password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="New password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="repeat-password">Repeat new password</Label>
                <Input
                  id="repeat-password"
                  type="password"
                  placeholder="Repeat new password"
                  required
                  value={repeatPassword}
                  onChange={(e) => setRepeatPassword(e.target.value)}
                />
              </div>
              {error && <p className="text-sm text-red-500">{error}</p>}
              {successMessage && (
                <p className="text-sm text-emerald-700">{successMessage}</p>
              )}
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? "Saving..." : "Save new password"}
              </Button>
              <Button
                type="button"
                variant="outline"
                className="w-full"
                disabled={isResending || isLoading}
                onClick={handleResendCode}
              >
                {isResending ? "Resending..." : "Resend reset code"}
              </Button>
              <div className="text-center text-sm">
                Need to request a new reset?{" "}
                <Link
                  href="/forgot-password"
                  className="underline underline-offset-4"
                >
                  Start over
                </Link>
              </div>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
