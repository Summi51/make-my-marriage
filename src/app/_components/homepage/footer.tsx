export function MainFooter() {
  return (
    <footer
      className="border-t border-[#EAE1D7] bg-[#FAF8F5] pt-16 pb-12"
      data-purpose="site-footer"
    >
      <div className="mx-auto max-w-6xl px-6">
        <div className="grid grid-cols-1 gap-10 pb-16 md:grid-cols-12">
          <div className="space-y-4 md:col-span-5">
            <a className="flex items-center gap-3" href="#top">
              <svg
                aria-hidden="true"
                focusable="false"
                className="text-brand-wine h-8 w-8"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 40 40"
              >
                <ellipse
                  className="text-brand-wine"
                  cx="16"
                  cy="20"
                  rx="12"
                  ry="12"
                  strokeWidth="2.2"
                ></ellipse>
                <ellipse
                  className="text-[#A26769]"
                  cx="24"
                  cy="20"
                  rx="12"
                  ry="12"
                  strokeWidth="2.2"
                ></ellipse>
                <circle cx="20" cy="20" fill="#6B1B34" r="2.5"></circle>
              </svg>
              <div className="flex flex-col">
                <span className="text-lg leading-none font-bold text-gray-900">
                  Make My Marriage
                </span>
                <span className="mt-1 text-[10px] font-semibold tracking-wider text-gray-500 uppercase">
                  Wedding Workspace
                </span>
              </div>
            </a>
            <p className="max-w-sm pt-2 text-sm leading-relaxed text-gray-600">
              One wedding. A thousand little details. One place to bring them
              all together.
            </p>
            <span className="block pt-4 text-[10px] font-bold tracking-widest text-[#B59C86] uppercase">
              Made with love, for your big day.
            </span>
          </div>

          <div className="md:col-span-2">
            <h4 className="mb-4 text-[11px] font-bold tracking-wider text-gray-500 uppercase">
              Explore
            </h4>
            <ul className="space-y-2.5 text-sm text-gray-600">
              <li>
                <a
                  className="hover:text-brand-wine transition-colors"
                  href="#features"
                >
                  Our features
                </a>
              </li>
              <li>
                <a
                  className="hover:text-brand-wine transition-colors"
                  href="/how-it-works"
                >
                  How it works
                </a>
              </li>
              <li>
                <a
                  className="hover:text-brand-wine transition-colors"
                  href="#themes"
                >
                  Wedding themes
                </a>
              </li>
            </ul>
          </div>

          <div className="md:col-span-2">
            <h4 className="mb-4 text-[11px] font-bold tracking-wider text-gray-500 uppercase">
              Celebrate
            </h4>
            <ul className="space-y-2.5 text-sm text-gray-600">
              <li>
                <a
                  className="hover:text-brand-wine transition-colors"
                  href="#invitations"
                >
                  Guest invitations
                </a>
              </li>
              <li>
                <a
                  className="hover:text-brand-wine transition-colors"
                  href="#photo-sharing"
                >
                  Photo sharing
                </a>
              </li>
              <li>
                <a
                  className="hover:text-brand-wine transition-colors"
                  href="#workspace-preview"
                >
                  Your workspace
                </a>
              </li>
            </ul>
          </div>

          <div className="flex flex-col justify-between md:col-span-3">
            <div>
              <div className="text-brand-wine mb-3">
                <svg
                  aria-hidden="true"
                  focusable="false"
                  className="h-5 w-5 text-[#8F5234]"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"
                    strokeWidth="1.8"
                  ></path>
                </svg>
              </div>
              <p className="font-editorial text-2xl leading-snug text-gray-900">
                Less coordinating.
                <br />
                <span className="text-brand-wine font-medium italic">
                  More celebrating.
                </span>
              </p>
            </div>
            <div className="pt-6">
              <a
                className="hover:text-brand-wine inline-flex items-center gap-1 text-xs font-medium text-gray-500 transition-colors"
                href="#top"
              >
                <span>Back to the beginning</span>
                <span>↑</span>
              </a>
            </div>
          </div>
        </div>

        <div className="flex flex-col items-center justify-between gap-4 border-t border-[#EAE1D7] pt-8 text-xs text-gray-500 sm:flex-row">
          <p>© 2026 Make My Marriage</p>
          <p className="text-gray-500 italic">
            Made for the moments that matter.
          </p>
        </div>
      </div>
    </footer>
  );
}
