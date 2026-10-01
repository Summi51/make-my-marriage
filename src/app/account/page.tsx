import Link from "next/link";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { currentUser } from "@/server/auth/sessions";
import { AuthShell } from "../_components/auth/auth-shell";
import { LogoutButton } from "../_components/auth/logout-button";
export const metadata = { title: "Your account — Make My Marriage" };
export const dynamic = "force-dynamic";
export default async function AccountPage() {
  await connection();
  const user = await currentUser();
  if (!user) redirect("/login");
  return (
    <AuthShell>
      <p className="text-brand-wine mb-3 text-xs font-semibold tracking-widest uppercase">
        You’re in
      </p>
      <h2 className="font-editorial text-4xl text-gray-900">
        Welcome, {user.name}.
      </h2>
      <p className="mt-4 text-sm text-gray-600">Signed in as {user.email}</p>
      <div className="border-brand-border bg-brand-cream mt-8 rounded-xl border p-5">
        <h3 className="font-editorial text-brand-wine text-2xl">
          Your account is ready.
        </h3>
        <p className="mt-2 text-sm leading-6 text-gray-600">
          Wedding setup is coming next. In the meantime, explore how your
          celebrations can come together.
        </p>
        <Link
          href="/"
          className="text-brand-wine mt-4 inline-block text-sm font-semibold underline underline-offset-4"
        >
          Explore the sample wedding →
        </Link>
      </div>
      <LogoutButton />
    </AuthShell>
  );
}
