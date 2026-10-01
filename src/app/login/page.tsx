import { redirect } from "next/navigation";
import { connection } from "next/server";
import { currentUser } from "@/server/auth/sessions";
import { AuthShell } from "../_components/auth/auth-shell";
import { AuthForm } from "../_components/auth/auth-form";
export const metadata = { title: "Sign in — Make My Marriage" };
export const dynamic = "force-dynamic";
export default async function LoginPage() {
  await connection();
  if (await currentUser()) redirect("/account");
  return (
    <AuthShell>
      <AuthForm mode="login" />
    </AuthShell>
  );
}
