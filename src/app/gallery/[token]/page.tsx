import { GuestGalleryClient } from "@/app/_components/wedding/guest-gallery-client";
export const metadata = {
  title: "Wedding memories — Make My Marriage",
  robots: { index: false, follow: false },
  referrer: "no-referrer" as const,
};
export default async function Page({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  return <GuestGalleryClient token={token} />;
}
