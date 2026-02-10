import { LoginForm } from "@/components/auth/login-form";

export default function LoginPage() {
  return (
    <div className="flex min-h-screen justify-center pt-16">
      <div className="w-full max-w-sm">
        <LoginForm />
      </div>
    </div>
  );
}
