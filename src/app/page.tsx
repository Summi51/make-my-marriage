import { Header } from "./_components/homepage/header";
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

export default function HomePage() {
  return (
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
  );
}
