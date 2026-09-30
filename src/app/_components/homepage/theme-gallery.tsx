import { ThemePreviewButton } from "./homepage-actions";

export function ThemesSection() {
  return (
    <section
      className="border-t border-[#ECE2D7] bg-[#FAF8F5] py-24"
      data-purpose="website-themes"
      id="themes"
    >
      <div className="mx-auto max-w-6xl px-6">
        <div className="mx-auto mb-16 max-w-3xl text-center">
          <span className="text-brand-wine mb-3 block text-xs font-bold tracking-widest uppercase">
            A Little Corner of the Internet, All Yours
          </span>
          <h2 className="font-editorial mb-4 text-4xl font-normal text-gray-900 sm:text-5xl lg:text-6xl">
            Your wedding gets a home of its own.
          </h2>
          <p className="text-base text-gray-600 md:text-lg">
            Your names. Your story. Your celebrations.
            <br className="hidden sm:inline" />
            Choose a theme and make your guests feel welcome before they arrive.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-7 md:grid-cols-3">
          <div className="shadow-soft group flex flex-col justify-between overflow-hidden rounded-2xl border border-[#E7DDD0] bg-white">
            <div>
              <div className="relative flex h-60 flex-col items-center justify-center bg-[#581628] p-6 text-center text-white">
                <span className="mb-2 text-[9px] font-bold tracking-widest text-white/60 uppercase">
                  The Wedding Collection
                </span>
                <div className="font-editorial mb-3 text-4xl font-normal text-[#E8C2B3] italic">
                  S &amp; H
                </div>
                <h3 className="font-editorial text-2xl font-normal text-white">
                  Editorial Romance
                </h3>
                <p className="mt-1 text-[11px] text-white/70">
                  Warm, timeless &amp; full of heart
                </p>
              </div>

              <div className="p-6">
                <h4 className="mb-1.5 text-sm font-bold text-gray-900">
                  Classic Indian
                </h4>
                <p className="text-xs leading-relaxed text-gray-600">
                  Wine and ivory, graceful typography, and a warm welcome to
                  your celebration.
                </p>
              </div>
            </div>
            <div className="p-6 pt-0">
              <ThemePreviewButton theme="Classic Indian" />
            </div>
          </div>

          <div className="shadow-soft group flex flex-col justify-between overflow-hidden rounded-2xl border border-[#E7DDD0] bg-white">
            <div>
              <div className="relative flex h-60 flex-col items-center justify-center bg-[#EFE9E0] p-6 text-center text-gray-800">
                <span className="mb-2 text-[9px] font-bold tracking-widest text-gray-500 uppercase">
                  The Wedding Collection
                </span>
                <div className="font-editorial mb-3 text-4xl font-normal text-[#4A4744]">
                  S &amp; H
                </div>
                <h3 className="font-editorial text-2xl font-medium text-gray-800">
                  Modern Minimalist
                </h3>
                <p className="mt-1 text-[11px] text-gray-500">
                  A little less, beautifully done
                </p>
              </div>

              <div className="p-6">
                <h4 className="mb-1.5 text-sm font-bold text-gray-900">
                  Minimal Elegant
                </h4>
                <p className="text-xs leading-relaxed text-gray-600">
                  Quiet colours and a simple layout that lets your wedding story
                  take the lead.
                </p>
              </div>
            </div>
            <div className="p-6 pt-0">
              <ThemePreviewButton theme="Minimal Elegant" />
            </div>
          </div>

          <div className="shadow-soft group flex flex-col justify-between overflow-hidden rounded-2xl border border-[#E7DDD0] bg-white">
            <div>
              <div className="relative flex h-60 flex-col items-center justify-center bg-[#303B35] p-6 text-center text-white">
                <span className="mb-2 text-[9px] font-bold tracking-widest text-white/50 uppercase">
                  The Wedding Collection
                </span>
                <div className="font-editorial mb-3 text-4xl font-normal text-[#E2C39B] italic">
                  S &amp; H
                </div>
                <h3 className="font-editorial text-2xl font-normal text-[#FAF6F0]">
                  The Celebration Edit
                </h3>
                <p className="mt-1 text-[11px] text-white/70">
                  For a day as vibrant as you
                </p>
              </div>

              <div className="p-6">
                <h4 className="mb-1.5 text-sm font-bold text-gray-900">
                  Modern Celebration
                </h4>
                <p className="text-xs leading-relaxed text-gray-600">
                  Playful colour and a fresh perspective on your favourite
                  traditions.
                </p>
              </div>
            </div>
            <div className="p-6 pt-0">
              <ThemePreviewButton theme="Modern Celebration" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
