import { Suspense } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { SignUpVerificationCard } from "@/components/auth/sign-up-verification-card";

function VerificationFallback() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-2xl">Verify your email</CardTitle>
        <CardDescription>Loading verification details...</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">
          Preparing the confirmation form.
        </p>
      </CardContent>
    </Card>
  );
}

export default function Page() {
  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-sm">
        <div className="flex flex-col gap-6">
          <Suspense fallback={<VerificationFallback />}>
            <SignUpVerificationCard />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
