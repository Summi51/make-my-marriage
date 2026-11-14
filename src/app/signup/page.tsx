import { redirect } from "next/navigation";
import { connection } from "next/server";
import { currentUser } from "@/server/auth/sessions";
import { safeReturnPath } from "@/lib/safe-return-path";
import { tabPath } from "@/lib/tab-session";
import { AuthShell } from "../_components/auth/auth-shell";
import { AuthForm } from "../_components/auth/auth-form";
export const metadata = { title: "Create account — Make My Marriage" };
export const dynamic = "force-dynamic";
export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; email?: string; tab?: string }>;
}) {
  await connection();
  const params = await searchParams;
  const nextPath = safeReturnPath(params.next);
  if (params.tab && (await currentUser(params.tab)))
    redirect(tabPath(nextPath, params.tab));
  return (
    <AuthShell>
      <AuthForm mode="signup" nextPath={nextPath} email={params.email} />
    </AuthShell>
  );
}
