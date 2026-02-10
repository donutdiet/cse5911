import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";

export default function LoginPage() {
  return (
    <div className="flex min-h-screen justify-center pt-16">
      <div className="w-full max-w-sm">
        <ForgotPasswordForm />
      </div>
    </div>
  );
}
