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

export default async function HomePage() {
  await connection();
  const user = await currentUser();
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
          <BottomWineCTABanner />
        </main>
        <MainFooter />
      </div>
    </HomepageSessionProvider>
  );
}
