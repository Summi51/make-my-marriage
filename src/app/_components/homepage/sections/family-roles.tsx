import { HeartIcon, UsersIcon } from "../icons";

export function FamilyRolesSection() {
  return (
    <section
      className="bg-brand-cream border-t border-[#ECE2D7] py-20"
      data-purpose="roles-and-family"
    >
      <div className="mx-auto max-w-6xl px-6">
        <div className="mx-auto mb-16 max-w-2xl text-center">
          <span className="text-brand-wine mb-3 block text-xs font-bold tracking-widest uppercase">
            A Family Affair
          </span>
          <h2 className="font-editorial mb-3 text-4xl font-normal text-gray-900 sm:text-5xl">
            One shared plan. Many helping hands.
          </h2>
          <p className="text-base text-gray-600">
            Your wedding brings everyone together. Planning it should do the
            same.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          <div className="flex flex-col justify-between rounded-2xl border border-[#E9DFD4] bg-white p-7 shadow-sm">
            <div>
              <div className="text-brand-wine mb-6 flex h-10 w-10 items-center justify-center rounded-xl bg-[#F7F0E8]">
                <HeartIcon className="h-5 w-5" />
              </div>
              <span className="mb-2 block text-xs font-bold tracking-wider text-gray-500 uppercase">
                Admins
              </span>
              <h3 className="font-editorial mb-3 text-2xl font-medium text-gray-900">
                You, your partner. Your trusted circle.
              </h3>
              <p className="mb-6 text-xs leading-relaxed text-gray-600">
                Plan every detail and invite the people who&apos;ll help make it
                happen. Admins also manage members and their roles.
              </p>
            </div>
            <div className="text-brand-wine border-t border-gray-100 pt-4 text-xs font-medium">
              Plan together. Bring everyone in.
            </div>
          </div>

          <div className="flex flex-col justify-between rounded-2xl border border-[#E9DFD4] bg-white p-7 shadow-sm">
            <div>
              <div className="text-brand-wine mb-6 flex h-10 w-10 items-center justify-center rounded-xl bg-[#F7F0E8]">
                <UsersIcon className="h-5 w-5" />
              </div>
              <span className="mb-2 block text-xs font-bold tracking-wider text-gray-500 uppercase">
                Managers
              </span>
              <h3 className="font-editorial mb-3 text-2xl font-medium text-gray-900">
                Parents, cousins. Your behind-the-scenes stars.
              </h3>
              <p className="mb-6 text-xs leading-relaxed text-gray-600">
                Manage events, tasks, guests, expenses and more. Everyone works
                with the same wedding information.
              </p>
            </div>
            <div className="text-brand-wine border-t border-gray-100 pt-4 text-xs font-medium">
              A full view of the plan. A shared sense of joy.
            </div>
          </div>

          <div className="flex flex-col justify-between rounded-2xl border border-[#E4D7C8] bg-[#F4ECE3] p-7">
            <div>
              <div className="mb-6 flex items-center -space-x-1.5">
                <span className="bg-brand-wine flex h-7 w-7 items-center justify-center rounded-full border-2 border-[#F4ECE3] text-[11px] font-bold text-white">
                  S
                </span>
                <span className="bg-avatar-warm flex h-7 w-7 items-center justify-center rounded-full border-2 border-[#F4ECE3] text-[11px] font-bold text-white">
                  H
                </span>
                <span className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-[#F4ECE3] bg-[#627264] text-[11px] font-bold text-white">
                  M
                </span>
                <span className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-[#F4ECE3] bg-[#A39281] text-[11px] font-bold text-white">
                  R
                </span>
              </div>
              <div className="text-brand-wine mb-3">♡</div>
              <blockquote className="font-editorial mb-4 text-2xl leading-snug text-gray-900 italic">
                &ldquo;You bring the people. We&apos;ll help you bring the plans
                together.&rdquo;
              </blockquote>
            </div>
            <div className="border-t border-[#DFD0C0] pt-4 text-[11px] font-bold tracking-wider text-gray-500 uppercase">
              Made for your whole family
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
