import { connection } from "next/server";
import { currentUser } from "@/server/auth/sessions";
import { getMembershipContext } from "@/modules/wedding/use-cases";
import { Header } from "./_components/homepage/header";
import { HomepageSessionProvider } from "./_components/homepage/homepage-session";
import { sessionFromMembership } from "./_components/homepage/session-actions";
import { MainFooter } from "./_components/homepage/footer";
import { GuestMobileExperienceSection } from "./_components/homepage/guest-preview";
import { ThemesSection } from "./_components/homepage/theme-gallery";
import { InteractiveWorkspaceCard } from "./_components/homepage/workspace-preview";
import {
  HeroSection,
  ProblemVsSolutionSection,
  FamilyRolesSection,
  FeatureGridSection,
  TimelineSection,
  PhotoSharingSection,
  TrustPillarsSection,
  BottomWineCTABanner,
} from "./_components/homepage/sections";

export const dynamic = "force-dynamic";

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  await connection();
  const { tab } = await searchParams;
  const user = await currentUser(tab);
  const session = user
    ? sessionFromMembership(
        Boolean((await getMembershipContext(user.id)).wedding),
      )
    : "signed-out";
  return (
    <HomepageSessionProvider initial={session}>
      <div id="top">
        <a href="#main-content" className="skip-link">
          Skip to content
        </a>
        <Header />
        <main id="main-content">
          <HeroSection />
          <InteractiveWorkspaceCard />
          <ProblemVsSolutionSection />
          <FamilyRolesSection />
          <FeatureGridSection />
          <TimelineSection />
          <GuestMobileExperienceSection />
          <PhotoSharingSection />
          <ThemesSection />
          <TrustPillarsSection />
          <section
            className="mx-auto grid max-w-6xl gap-6 px-6 py-16 md:grid-cols-2"
            aria-label="Planning guidance"
          >
            {[
              [
                "Your first steps, made simple",
                "Follow our complete guide, from creating your wedding to sharing the memories.",
                "/how-it-works",
                "See how it works",
              ],
              [
                "A little help, whenever you need it",
                "Find free answers about invitations, photos, planning tools and privacy.",
                "/help",
                "Explore Help & FAQs",
              ],
            ].map(([title, description, href, label]) => (
              <article
                key={href}
                className="border-brand-border rounded-3xl border bg-white p-8"
              >
                <h2 className="font-editorial text-brand-wine text-3xl">
                  {title}
                </h2>
                <p className="mt-4 leading-relaxed text-gray-600">
                  {description}
                </p>
                <a
                  href={href}
                  className="text-brand-wine mt-5 inline-block py-3 font-semibold underline-offset-4 hover:underline"
                >
                  {label} →
                </a>
              </article>
            ))}
          </section>
          <BottomWineCTABanner />
        </main>
        <MainFooter />
      </div>
    </HomepageSessionProvider>
  );
}
