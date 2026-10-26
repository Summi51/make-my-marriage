export function ProblemVsSolutionSection() {
  return (
    <section
      className="bg-brand-cream border-t border-[#EDE4DB] py-20"
      data-purpose="problem-vs-solution"
      id="how-it-works"
    >
      <div className="mx-auto max-w-6xl px-6">
        <div className="mx-auto mb-16 max-w-3xl text-center">
          <span className="text-brand-wine mb-3 block text-xs font-bold tracking-widest uppercase">
            Sound familiar?
          </span>
          <h2 className="font-editorial mb-4 text-4xl leading-tight font-normal text-gray-900 sm:text-5xl lg:text-6xl">
            One wedding shouldn&apos;t live across 40 WhatsApp chats.
          </h2>
          <p className="text-base text-gray-600 md:text-lg">
            The guest list is in a spreadsheet. The tasks are in a group chat.
            The latest plan? Someone has it. Bring it all home.
          </p>
        </div>

        <div className="mb-20 grid grid-cols-1 items-stretch gap-8 md:grid-cols-2">
          <div className="flex flex-col justify-between rounded-2xl border border-[#E2D8CC] bg-[#F0E9E1] p-8">
            <div>
              <span className="mb-3 block text-xs font-bold tracking-wider text-gray-500 uppercase">
                The way it usually goes
              </span>
              <h3 className="font-editorial mb-8 text-3xl leading-snug font-medium text-gray-900">
                So many details.
                <br />
                So many different places.
              </h3>
              <div className="space-y-3">
                <div className="flex items-center gap-3 rounded-xl border border-[#DFD3C5] bg-white/80 p-4 text-sm text-gray-700">
                  <span className="text-xs font-bold text-gray-500">✕</span>
                  <span>&ldquo;Who has the latest guest list?&rdquo;</span>
                </div>
                <div className="flex items-center gap-3 rounded-xl border border-[#DFD3C5] bg-white/80 p-4 text-sm text-gray-700">
                  <span className="text-xs font-bold text-gray-500">✕</span>
                  <span>
                    &ldquo;I thought you booked the photographer.&rdquo;
                  </span>
                </div>
                <div className="flex items-center gap-3 rounded-xl border border-[#DFD3C5] bg-white/80 p-4 text-sm text-gray-700">
                  <span className="text-xs font-bold text-gray-500">✕</span>
                  <span>&ldquo;Where did we save those photos?&rdquo;</span>
                </div>
              </div>
            </div>
          </div>

          <div className="shadow-soft flex flex-col justify-between rounded-2xl border border-[#E9DFD4] bg-white p-8">
            <div>
              <div className="text-brand-wine mb-3 flex items-center gap-1.5 text-xs font-bold tracking-wider uppercase">
                <span>✦</span>
                <span>The Make My Marriage Way</span>
              </div>
              <h3 className="font-editorial text-brand-wine mb-8 text-3xl leading-snug font-medium">
                One shared space.
                <br />A little more peace of mind.
              </h3>
              <div className="space-y-3">
                <div className="flex items-center gap-3 rounded-xl border border-[#ECE4DB] bg-[#FAF7F2] p-4 text-sm text-gray-800">
                  <span className="text-brand-wine text-xs font-bold">✓</span>
                  <span>One guest list, with every RSVP</span>
                </div>
                <div className="flex items-center gap-3 rounded-xl border border-[#ECE4DB] bg-[#FAF7F2] p-4 text-sm text-gray-800">
                  <span className="text-brand-wine text-xs font-bold">✓</span>
                  <span>Clear tasks, shared with your family</span>
                </div>
                <div className="flex items-center gap-3 rounded-xl border border-[#ECE4DB] bg-[#FAF7F2] p-4 text-sm text-gray-800">
                  <span className="text-brand-wine text-xs font-bold">✓</span>
                  <span>Your wedding memories, all together</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-8 border-t border-[#ECE2D7] pt-8 md:grid-cols-3">
          <div className="flex gap-4">
            <span className="font-editorial text-3xl font-medium text-[#C8AA8B]">
              01
            </span>
            <div>
              <h4 className="mb-1 text-sm font-bold text-gray-900">
                Create your wedding
              </h4>
              <p className="text-xs leading-relaxed text-gray-600">
                Add your names, date and the place it all begins.
              </p>
            </div>
          </div>
          <div className="flex gap-4">
            <span className="font-editorial text-3xl font-medium text-[#C8AA8B]">
              02
            </span>
            <div>
              <h4 className="mb-1 text-sm font-bold text-gray-900">
                Bring your family in
              </h4>
              <p className="text-xs leading-relaxed text-gray-600">
                Invite your favourite people to help with the planning.
              </p>
            </div>
          </div>
          <div className="flex gap-4">
            <span className="font-editorial text-3xl font-medium text-[#C8AA8B]">
              03
            </span>
            <div>
              <h4 className="mb-1 text-sm font-bold text-gray-900">
                Make it yours, together
              </h4>
              <p className="text-xs leading-relaxed text-gray-600">
                Plan the events, invite the guests and enjoy the journey.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
