import { AvailabilityButton } from "../homepage-actions";
import { HeartIcon } from "../icons";

export function BottomWineCTABanner() {
  return (
    <section
      className="mx-auto max-w-6xl px-6 pb-24"
      data-purpose="big-cta-card"
      id="start"
    >
      <div className="shadow-window relative overflow-hidden rounded-3xl bg-[#5B172A] p-10 text-center text-white md:p-16">
        <div className="mx-auto mb-5 h-8 w-8 text-[#E7C49B]">
          <HeartIcon className="mx-auto h-7 w-7" />
        </div>
        <span className="mb-4 block text-[10px] font-bold tracking-widest text-[#E6C291] uppercase md:text-xs">
          Here&apos;s to the beginning of everything
        </span>

        <h2 className="font-editorial mx-auto mb-5 max-w-2xl text-4xl leading-[1.15] font-normal text-[#FAF6F2] sm:text-5xl lg:text-6xl">
          Your wedding already has enough moving parts.
        </h2>

        <p className="mx-auto mb-8 max-w-lg text-sm leading-relaxed text-[#E5D2C2] md:text-base">
          Bring them together in one beautifully organised place. And make a
          little more room for the joy.
        </p>

        <div className="mb-6">
          <AvailabilityButton className="inline-flex items-center gap-3 rounded-xl bg-[#E9CFB0] px-8 py-3.5 text-sm font-semibold text-[#4A1624] shadow-md transition-all hover:bg-[#DFC2A0] md:text-base">
            <span>Start Planning for Free</span>
            <span>→</span>
          </AvailabilityButton>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-6 text-xs text-[#E1D1C5]">
          <div className="flex items-center gap-1.5">
            <span className="text-[#E7C49B]">✓</span>
            <span>Made for Indian weddings</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-[#E7C49B]">✓</span>
            <span>Better with your family</span>
          </div>
        </div>
      </div>
    </section>
  );
}
