import { InvitationAcceptance } from "@/app/_components/wedding/invitation-acceptance";

export const dynamic = "force-dynamic";
export const metadata = { title: "Wedding invitation — Make My Marriage" };

export default async function MemberInvitationPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  return <InvitationAcceptance token={token} />;
}
