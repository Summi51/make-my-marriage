import { LockIcon, UsersIcon, HeartIcon, ImageIcon } from "../icons";

export function TrustPillarsSection() {
  return (
    <section
      className="bg-brand-cream border-t border-[#ECE2D7] py-24"
      data-purpose="trust-and-privacy"
    >
      <div className="mx-auto max-w-6xl px-6">
        <div className="mb-16 flex items-center justify-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-[#E8DDCE] bg-[#F4EFE9] px-4 py-2 text-xs text-gray-600 md:text-sm">
            <span>▷</span>
            <span>
              Loved ones joining from afar? Add your YouTube livestream.
            </span>
          </div>
        </div>

        <div className="mx-auto mb-16 max-w-2xl text-center">
          <span className="text-brand-wine mb-3 block text-xs font-bold tracking-widest uppercase">
            Thoughtfully Built, From the Start
          </span>
          <h2 className="font-editorial text-4xl font-normal text-gray-900 sm:text-5xl">
            For your family. For your peace of mind.
          </h2>
        </div>

        <div className="grid grid-cols-1 gap-8 text-center sm:grid-cols-2 lg:grid-cols-4">
          <TrustPillar
            icon={<LockIcon className="h-6 w-6" />}
            title="Private wedding workspace"
            description="Your planning details stay with your wedding members."
          />
          <TrustPillar
            icon={<UsersIcon className="h-6 w-6" />}
            title="Together, with clear roles"
            description="Admins manage members. Everyone helps with the plans."
          />
          <TrustPillar
            icon={<HeartIcon className="h-6 w-6" />}
            title="No guest accounts"
            description="Invitations and galleries open with secure share links."
          />
          <TrustPillar
            icon={<ImageIcon className="h-6 w-6" />}
            title="Memories to keep"
            description="View and download the photos that mean the most."
          />
        </div>
      </div>
    </section>
  );
}

function TrustPillar({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="space-y-3">
      <div className="mx-auto flex h-10 w-10 items-center justify-center text-[#B08D6F]">
        {icon}
      </div>
      <h3 className="text-sm font-bold text-gray-900">{title}</h3>
      <p className="text-xs leading-relaxed text-gray-600">{description}</p>
    </div>
  );
}
