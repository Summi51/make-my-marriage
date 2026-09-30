import { AvailabilityButton } from "../homepage-actions";

export function HeroSection() {
  return (
    <section
      className="relative overflow-hidden px-4 pt-16 pb-14 text-center"
      data-purpose="hero-section"
    >
      <div className="mx-auto flex max-w-4xl flex-col items-center">
        <div className="text-brand-wine mb-8 inline-flex items-center gap-2 rounded-full bg-[#EFE8E1] px-3.5 py-1.5 text-[11.5px] font-semibold tracking-wider uppercase">
          <span className="bg-brand-wine inline-block h-1.5 w-1.5 rounded-full"></span>
          The Modern Wedding Workspace
        </div>

        <h1 className="font-editorial mb-5 text-5xl leading-[1.08] font-normal tracking-tight text-gray-900 sm:text-6xl md:text-7xl lg:text-[84px]">
          Plan your entire wedding. <br className="hidden sm:block" />
          <span className="text-brand-wine font-medium italic">Together.</span>
        </h1>

        <p className="mx-auto mb-10 max-w-2xl text-lg leading-relaxed font-normal text-gray-600 md:text-[20px]">
          A shared space for all the people, plans and little details that make
          your Indian wedding, yours.
        </p>

        <div className="mb-9 flex flex-col items-center gap-4 sm:flex-row">
          <AvailabilityButton className="bg-brand-wine hover:bg-brand-wine-dark inline-flex w-full items-center justify-center gap-3 rounded-xl px-7 py-3.5 text-[15.5px] font-medium text-white shadow-md transition-all sm:w-auto">
            <span>Start Planning for Free</span>
            <span className="text-lg">→</span>
          </AvailabilityButton>
          <a
            className="inline-flex w-full items-center justify-center gap-2.5 rounded-xl border border-[#E4DBD0] bg-[#F4EFEA] px-6 py-3.5 text-[15.5px] font-medium text-gray-800 transition-colors hover:bg-[#EDE5DE] sm:w-auto"
            href="#how-it-works"
          >
            <svg
              aria-hidden="true"
              focusable="false"
              className="text-brand-wine h-4 w-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <polygon
                points="5 3 19 12 5 21 5 3"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
              ></polygon>
            </svg>
            <span>See How It Works</span>
          </a>
        </div>
        <div className="inline-flex flex-wrap items-center justify-center gap-3 rounded-full border border-[#EDE4DA] bg-[#FAF6F2] px-4 py-1.5 text-xs font-medium text-gray-600 md:text-sm">
          <div className="flex items-center -space-x-1.5">
            <span className="text-brand-wine border-brand-cream flex h-6 w-6 items-center justify-center rounded-full border-2 bg-[#EAD8D8] text-[10px] font-bold">
              S
            </span>
            <span className="border-brand-cream flex h-6 w-6 items-center justify-center rounded-full border-2 bg-[#E2D4C9] text-[11px] font-bold text-[#78543E] text-white">
              H
            </span>
            <span className="border-brand-cream flex h-6 w-6 items-center justify-center rounded-full border-2 bg-[#D8DDD3] text-[10px] font-bold text-[#3D5B3A]">
              R
            </span>
          </div>
          <span className="inline-flex items-center gap-1 font-medium text-gray-800">
            <span className="text-brand-wine" aria-hidden="true">
              ♡
            </span>{" "}
            Together
          </span>
          <span className="text-gray-400">|</span>
          <span>Made for Indian weddings</span>
        </div>
      </div>
    </section>
  );
}
