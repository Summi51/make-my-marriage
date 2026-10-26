export function InteractiveWorkspaceCard() {
  return (
    <section
      id="workspace-preview"
      aria-label="Sample wedding workspace"
      className="mx-auto max-w-6xl px-4 pb-24"
      data-purpose="workspace-sample-preview"
    >
      <div className="shadow-window overflow-hidden rounded-2xl border border-[#E6DDD3] bg-white">
        <div className="flex items-center justify-between border-b border-[#E5DDD2] bg-[#F2ECE4] px-5 py-3 text-xs font-medium text-gray-600">
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-[#E2A199]"></span>
              <span className="h-2.5 w-2.5 rounded-full bg-[#E6CCA0]"></span>
              <span className="h-2.5 w-2.5 rounded-full bg-[#9CCB9C]"></span>
            </div>
            <span className="ml-2 font-normal text-gray-600">
              Our wedding workspace
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-[11.5px] text-gray-500">
            <svg
              aria-hidden="true"
              focusable="false"
              className="h-3.5 w-3.5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <rect
                height="11"
                rx="2"
                ry="2"
                strokeWidth="2"
                width="18"
                x="3"
                y="11"
              ></rect>
              <path d="M7 11V7a5 5 0 0 1 10 0v4" strokeWidth="2"></path>
            </svg>
            <span>Private to your family</span>
          </div>
        </div>

        <div className="space-y-7 p-6 md:p-8">
          <div className="flex flex-col justify-between gap-4 border-b border-gray-100 pb-5 md:flex-row md:items-center">
            <div>
              <span className="mb-1 block text-[11px] font-bold tracking-widest text-[#937C6E] uppercase">
                Let the countdown begin
              </span>
              <div className="flex flex-wrap items-center gap-3">
                <h2 className="font-editorial text-3xl font-medium text-gray-900 md:text-4xl">
                  Saman &amp; Hasan’s Wedding
                </h2>
                <span className="text-brand-wine rounded-full bg-[#F8EAEB] px-2.5 py-0.5 text-[11px] font-semibold">
                  Made for us
                </span>
              </div>
              <div className="mt-2 flex items-center gap-2 text-xs text-gray-500 md:text-sm">
                <span>📅 42 days to go</span>
                <span>·</span>
                <span>Dehradun, Uttarakhand</span>
              </div>
            </div>

            <div className="flex flex-col md:items-end">
              <div className="flex items-center -space-x-1.5">
                <div className="bg-brand-wine flex h-7 w-7 items-center justify-center rounded-full text-[11px] font-bold text-white ring-2 ring-white">
                  S
                </div>
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#A87456] text-[11px] font-bold text-white ring-2 ring-white">
                  H
                </div>
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#C2B7A8] text-[11px] font-bold text-gray-800 ring-2 ring-white">
                  M
                </div>
              </div>
              <span className="mt-1 text-[11px] text-gray-500">
                Better, together
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="relative rounded-xl border border-[#ECE5DC] bg-[#FAF7F2] p-4">
              <div className="mb-1 flex items-center justify-between text-xs text-gray-500">
                <span>Events</span>
                <svg
                  aria-hidden="true"
                  focusable="false"
                  className="h-4 w-4 text-gray-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <rect
                    height="18"
                    rx="2"
                    ry="2"
                    strokeWidth="2"
                    width="18"
                    x="3"
                    y="4"
                  ></rect>
                  <line strokeWidth="2" x1="16" x2="16" y1="2" y2="6"></line>
                  <line strokeWidth="2" x1="8" x2="8" y1="2" y2="6"></line>
                  <line strokeWidth="2" x1="3" x2="21" y1="10" y2="10"></line>
                </svg>
              </div>
              <div className="mb-2 text-3xl font-bold text-gray-900">6</div>
              <div className="text-[11px] text-gray-500">
                A celebration at every step
              </div>
            </div>

            <div className="relative rounded-xl border border-[#ECE5DC] bg-[#FAF7F2] p-4">
              <div className="mb-1 flex items-center justify-between text-xs text-gray-500">
                <span>Tasks completed</span>
                <svg
                  aria-hidden="true"
                  focusable="false"
                  className="h-4 w-4 text-gray-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <polyline points="9 11 12 14 22 4" strokeWidth="2"></polyline>
                  <path
                    d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"
                    strokeWidth="2"
                  ></path>
                </svg>
              </div>
              <div className="mb-2 text-2xl font-bold text-gray-900">
                32 / 48
              </div>
              <div className="mb-2 h-1.5 w-full overflow-hidden rounded-full bg-gray-200">
                <div className="bg-brand-wine h-full w-[66%]"></div>
              </div>
              <div className="text-[11px] text-gray-500">
                The little things, taken care of
              </div>
            </div>

            <div className="rounded-xl border border-[#ECE5DC] bg-[#FAF7F2] p-4">
              <div className="mb-1 flex items-center justify-between text-xs text-gray-500">
                <span>Guests invited</span>
                <svg
                  aria-hidden="true"
                  focusable="false"
                  className="h-4 w-4 text-gray-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"
                    strokeWidth="2"
                  ></path>
                  <circle cx="9" cy="7" r="4" strokeWidth="2"></circle>
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87" strokeWidth="2"></path>
                  <path d="M16 3.13a4 4 0 0 1 0 7.75" strokeWidth="2"></path>
                </svg>
              </div>
              <div className="mb-2 text-3xl font-bold text-gray-900">186</div>
              <div className="text-[11px] text-gray-500">
                132 RSVPs received
              </div>
            </div>

            <div className="rounded-xl border border-[#ECE5DC] bg-[#FAF7F2] p-4">
              <div className="mb-1 flex items-center justify-between text-xs text-gray-500">
                <span>Total expenses</span>
                <span className="text-sm font-semibold text-gray-500">₹</span>
              </div>
              <div className="mb-2 text-2xl font-bold text-gray-900">
                ₹12,45,000
              </div>
              <div className="text-[11px] text-gray-500">
                Every expense in one place
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 pt-2 lg:grid-cols-12">
            <div className="rounded-xl border border-[#ECE5DC] bg-[#FAF7F2]/60 p-5 lg:col-span-7">
              <div className="flex items-center justify-between border-b border-[#E8DFD5] pb-3">
                <h3 className="text-sm font-medium text-gray-900">
                  Coming up on our calendar
                </h3>
                <span className="text-[10px] font-bold tracking-wider text-gray-500 uppercase">
                  The Celebrations
                </span>
              </div>
              <div className="divide-y divide-[#EDE5DC]">
                <div className="flex items-center justify-between py-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 flex-col items-center justify-center rounded-lg border border-[#E2D8CD] bg-white text-center">
                      <span className="text-brand-wine text-[9px] font-bold uppercase">
                        Feb
                      </span>
                      <span className="-mt-1 text-sm font-bold text-gray-800">
                        12
                      </span>
                    </div>
                    <div>
                      <h4 className="text-sm font-medium text-gray-900">
                        Mehndi &amp; Dholki
                      </h4>
                      <p className="text-[11px] text-gray-500">
                        The garden lawn · 6:00 PM
                      </p>
                    </div>
                  </div>
                  <span className="text-xs font-medium text-gray-500">
                    120 guests
                  </span>
                </div>

                <div className="flex items-center justify-between py-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 flex-col items-center justify-center rounded-lg border border-[#E2D8CD] bg-white text-center">
                      <span className="text-[9px] font-bold text-[#A87456] uppercase">
                        Feb
                      </span>
                      <span className="-mt-1 text-sm font-bold text-gray-800">
                        13
                      </span>
                    </div>
                    <div>
                      <h4 className="text-sm font-medium text-gray-900">
                        Nikah Ceremony
                      </h4>
                      <p className="text-[11px] text-gray-500">
                        The Grand Mosque &amp; Banquet · 4:00 PM
                      </p>
                    </div>
                  </div>
                  <span className="text-xs font-medium text-gray-500">
                    200 guests
                  </span>
                </div>

                <div className="flex items-center justify-between py-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 flex-col items-center justify-center rounded-lg border border-[#E2D8CD] bg-white text-center">
                      <span className="text-brand-wine text-[9px] font-bold uppercase">
                        Feb
                      </span>
                      <span className="-mt-1 text-sm font-bold text-gray-800">
                        14
                      </span>
                    </div>
                    <div>
                      <h4 className="text-sm font-medium text-gray-900">
                        Walima Reception
                      </h4>
                      <p className="text-[11px] text-gray-500">
                        The Royal Courtyard · 7:30 PM
                      </p>
                    </div>
                  </div>
                  <span className="text-xs font-medium text-gray-500">
                    300 guests
                  </span>
                </div>
              </div>
            </div>

            <div className="flex flex-col justify-between rounded-xl border border-[#ECE5DC] bg-[#FAF7F2]/60 p-5 lg:col-span-5">
              <div>
                <div className="flex items-center justify-between border-b border-[#E8DFD5] pb-3">
                  <h3 className="text-sm font-medium text-gray-900">
                    A little closer to the big day
                  </h3>
                  <svg
                    aria-hidden="true"
                    focusable="false"
                    className="text-brand-wine h-4 w-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <polyline
                      points="9 11 12 14 22 4"
                      strokeWidth="2"
                    ></polyline>
                    <path
                      d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"
                      strokeWidth="2"
                    ></path>
                  </svg>
                </div>
                <div className="space-y-3 pt-3 text-xs">
                  <div className="flex items-center justify-between rounded-lg border border-[#EBE3D8] bg-white p-2.5">
                    <div className="flex items-center gap-2.5">
                      <div className="h-4 w-4 rounded border border-gray-300"></div>
                      <div>
                        <p className="font-medium text-gray-800">
                          Finalise Nikahnama details
                        </p>
                        <p className="text-[10px] text-gray-500">
                          Hasan · Tomorrow
                        </p>
                      </div>
                    </div>
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#EFE4D6] text-[9px] font-bold text-[#7E5739]">
                      H
                    </span>
                  </div>

                  <div className="flex items-center justify-between rounded-lg border border-[#EBE3D8] bg-white p-2.5">
                    <div className="flex items-center gap-2.5">
                      <div className="h-4 w-4 rounded border border-gray-300"></div>
                      <div>
                        <p className="font-medium text-gray-800">
                          Review Walima caterer menu
                        </p>
                        <p className="text-[10px] text-gray-500">
                          Saman · 12 Feb
                        </p>
                      </div>
                    </div>
                    <span className="text-brand-wine flex h-5 w-5 items-center justify-center rounded-full bg-[#F4D9DC] text-[9px] font-bold">
                      S
                    </span>
                  </div>

                  <div className="flex items-center justify-between rounded-lg border border-[#EBE3D8] bg-white/70 p-2.5">
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-4 w-4 items-center justify-center rounded bg-[#976A58] text-[10px] text-white">
                        ✓
                      </div>
                      <div>
                        <p className="font-medium text-gray-500 line-through">
                          Send invitations to family
                        </p>
                        <p className="text-[10px] text-gray-500">
                          Ammi · Completed
                        </p>
                      </div>
                    </div>
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-gray-200 text-[9px] font-bold text-gray-600">
                      A
                    </span>
                  </div>
                </div>
              </div>
              <div className="mt-3 flex items-center gap-1.5 border-t border-[#EDE5DB] pt-4 text-[11px] text-gray-500">
                <span>♡</span>
                <span>A shared plan. A lighter to-do list.</span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[#E8DFD5] bg-[#FAF7F2] px-6 py-3 text-xs text-gray-500">
          <span className="flex items-center gap-2">
            <span className="bg-brand-wine h-1.5 w-1.5 rounded-full"></span>
            One wedding. One shared workspace.
          </span>
          <span className="text-gray-500">Sample wedding preview</span>
        </div>
      </div>
    </section>
  );
}
