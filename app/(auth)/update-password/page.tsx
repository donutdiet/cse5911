import { Suspense } from "react";
import { UpdatePasswordForm } from "@/components/auth/update-password-form";

function UpdatePasswordFallback() {
  return (
    <div className="rounded-lg border bg-card px-6 py-8 text-sm text-muted-foreground">
      Loading password reset form...
    </div>
  );
}

export default function UpdatePasswordPage() {
  return (
    <div className="flex min-h-screen justify-center pt-16">
      <div className="w-full max-w-sm">
        <Suspense fallback={<UpdatePasswordFallback />}>
          <UpdatePasswordForm />
        </Suspense>
      </div>
    </div>
  );
}
