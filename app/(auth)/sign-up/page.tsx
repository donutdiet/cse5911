import { SignUpForm } from "@/components/auth/sign-up-form";

export default function SignUpPage() {
  return (
    <div className="flex min-h-screen justify-center pt-16">
      <div className="w-full max-w-sm">
        <SignUpForm />
      </div>
    </div>
  );
}
