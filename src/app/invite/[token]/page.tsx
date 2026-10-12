import { notFound } from "next/navigation";
import { resolvePublicInvitation } from "@/modules/guests/use-cases";
import { InvitationClient } from "./invitation-client";

export const dynamic = "force-dynamic";

export async function generateMetadata(props: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await props.params;
  try {
    const data = await resolvePublicInvitation(token);
    return {
      title: `${data.wedding.brideName} & ${data.wedding.groomName} — Wedding Invitation`,
      robots: { index: false, follow: false },
      referrer: "no-referrer",
    };
  } catch {
    return { title: "Wedding Invitation — Make My Marriage" };
  }
}

export default async function PublicInvitationPage(props: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ rsvp?: string }>;
}) {
  const { token } = await props.params;
  const { rsvp } = await props.searchParams;
  let data;
  try {
    data = await resolvePublicInvitation(token);
  } catch {
    notFound();
  }

  return (
    <InvitationClient
      token={token}
      initialData={data}
      initialOpenRsvp={rsvp === "1" || rsvp === "true"}
    />
  );
}
