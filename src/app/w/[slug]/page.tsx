import { notFound } from "next/navigation";
import type { Metadata } from "next";
import {
  getPublicWedding,
  getMembershipContext,
} from "@/modules/wedding/use-cases";
import { PublicWebsiteClient } from "@/app/_components/wedding/public-website-client";
import { WeddingError } from "@/modules/wedding/errors";
import { currentUser } from "@/server/auth/sessions";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  try {
    const wedding = await getPublicWedding(slug);
    const title = `${wedding.brideName} & ${wedding.groomName} — Wedding Website`;
    const description =
      wedding.welcomeMessage ||
      wedding.description ||
      `Celebrate the wedding of ${wedding.brideName} & ${wedding.groomName} on ${wedding.weddingDate}.`;
    return {
      title,
      description,
      robots: { index: false, follow: false },
      openGraph: {
        title,
        description,
      },
    };
  } catch {
    return {
      title: "Wedding Website — Make My Marriage",
      robots: { index: false, follow: false },
    };
  }
}

export default async function PublicWeddingPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const { slug } = await params;
  const { tab } = await searchParams;

  let allowWeddingId: string | undefined;
  try {
    const user = await currentUser(tab);
    if (user) {
      const { wedding } = await getMembershipContext(user.id);
      if (wedding && wedding.website?.slug === slug) {
        allowWeddingId = String(wedding._id);
      }
    }
  } catch {
    // Unauthenticated visitors continue with undefined
  }

  let wedding;
  try {
    wedding = await getPublicWedding(slug, {
      allowDraftForWeddingId: allowWeddingId,
    });
  } catch (error) {
    if (error instanceof WeddingError && error.code === "NOT_FOUND") notFound();
    throw error;
  }

  const isDraftPreview = !wedding.isPublished;

  return (
    <PublicWebsiteClient
      wedding={wedding}
      isDraftPreview={isDraftPreview}
      tabId={tab}
    />
  );
}
