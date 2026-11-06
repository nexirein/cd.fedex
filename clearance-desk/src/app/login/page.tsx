import { Suspense } from "react";
import { LoginForm } from "./LoginForm";

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen grid place-items-center text-[var(--fx-text-subtle)]">Loading…</div>}>
      <LoginForm />
    </Suspense>
  );
}
