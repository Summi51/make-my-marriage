import Image from "next/image";
import { QrGridIcon } from "../icons";

export function PhotoSharingSection() {
  return (
    <section
      id="photo-sharing"
      className="bg-brand-cream border-t border-[#ECE2D7] py-24"
      data-purpose="guest-photo-sharing"
    >
      <div className="mx-auto max-w-7xl px-6">
        <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-12 lg:gap-8">
          <div className="space-y-6 lg:col-span-5">
            <span className="block text-xs font-semibold tracking-widest text-[#581628] uppercase">
              THE MOMENTS BETWEEN THE MOMENTS
            </span>
            <h2 className="font-editorial text-4xl leading-[1.15] font-normal text-gray-900 sm:text-5xl lg:text-[54px]">
              Everyone takes photos.
              <br />
              Now everyone can{" "}
              <span className="font-normal text-[#581628] italic">
                share them.
              </span>
            </h2>
            <p className="max-w-lg text-base leading-relaxed text-gray-600 md:text-[17px]">
              The happy tears. The questionable dance moves. The candid you
              didn&apos;t know you needed. Bring everyone&apos;s favourite
              moments into one private wedding gallery.
            </p>

            <div className="space-y-6 pt-2">
              <div className="flex items-start gap-4">
                <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#581628] text-xs font-bold text-white">
                  1
                </span>
                <div>
                  <h4 className="text-base font-bold text-gray-900">
                    Share your gallery link or QR
                  </h4>
                  <p className="mt-0.5 text-sm text-gray-600">
                    On a table, in a message, wherever your guests are.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#B3937C] text-xs font-bold text-white">
                  2
                </span>
                <div>
                  <h4 className="text-base font-bold text-gray-900">
                    Let everyone add their favourites
                  </h4>
                  <p className="mt-0.5 text-sm text-gray-600">
                    Upload from a phone. No account needed.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#B3937C] text-xs font-bold text-white">
                  3
                </span>
                <div>
                  <h4 className="text-base font-bold text-gray-900">
                    Relive it, together
                  </h4>
                  <p className="mt-0.5 text-sm text-gray-600">
                    Browse, download and treasure your wedding photos.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="relative flex flex-col items-end pt-4 pb-2 lg:col-span-7">
            <div className="z-0 w-full max-w-lg -rotate-2 transform rounded-2xl border border-gray-200/80 bg-white p-3 shadow-xl transition-transform duration-300 hover:rotate-0">
              <div className="aspect-[16/10] w-full overflow-hidden rounded-xl bg-gray-100">
                <Image
                  src="/images/wedding.jpg"
                  alt="A couple celebrating their wedding with family and flower petals"
                  width={1376}
                  height={768}
                  sizes="(max-width: 1024px) 90vw, 512px"
                  className="h-full w-full object-cover"
                />
              </div>
              <div className="flex items-center justify-between px-2 pt-3 pb-1 text-xs text-gray-500">
                <span className="flex items-center gap-1.5">
                  <span className="bg-avatar-warm h-1.5 w-1.5 rounded-full"></span>
                  A little love from everyone
                </span>
                <span className="text-sm font-light text-gray-500">♡</span>
              </div>
            </div>

            <div className="z-10 -mt-16 w-full max-w-lg rotate-2 transform rounded-2xl border border-gray-200/80 bg-white p-3 shadow-2xl transition-transform duration-300 hover:rotate-0 sm:-mr-4">
              <div className="aspect-[16/10] w-full overflow-hidden rounded-xl bg-gray-100">
                <Image
                  src="/images/mehndi.jpg"
                  alt="Family and friends celebrating a Mehndi evening together"
                  width={1376}
                  height={768}
                  sizes="(max-width: 1024px) 90vw, 512px"
                  className="h-full w-full object-cover"
                />
              </div>
              <div className="flex items-center justify-between px-2 pt-3 pb-1 text-xs text-gray-500">
                <span>The dance floor memories ♡</span>
                <span className="font-medium text-gray-500">
                  Mehndi &amp; Dholki
                </span>
              </div>
            </div>

            <div className="bg-brand-cream relative z-20 -mt-10 flex w-full max-w-md items-center gap-5 rounded-2xl border border-[#EDE2D4] p-5 shadow-lg sm:mr-8">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl border border-[#E2D8CC] bg-white p-2 text-[#581628] shadow-sm">
                <QrGridIcon className="h-8 w-8 fill-none stroke-[#581628]" />
              </div>
              <div>
                <span className="text-brand-muted-warm mb-0.5 block text-[10px] font-bold tracking-widest uppercase">
                  SCAN TO SHARE THE LOVE
                </span>
                <h4 className="font-editorial text-2xl leading-tight font-semibold text-[#581628]">
                  Saman &amp; Hasan
                </h4>
                <p className="mt-0.5 text-xs text-gray-500">
                  Your photos. Our favourite memories.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
