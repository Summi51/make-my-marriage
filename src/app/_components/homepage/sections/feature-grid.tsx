import {
  CalendarIcon,
  CheckboxIcon,
  UserIcon,
  HeartIcon,
  GlobeIcon,
  ImageIcon,
  GridIcon,
} from "../icons";

export function FeatureGridSection() {
  return (
    <section
      className="bg-brand-cream border-t border-[#ECE2D7] py-24"
      data-purpose="features-grid"
      id="features"
    >
      <div className="mx-auto max-w-6xl px-6">
        <div className="mx-auto mb-16 max-w-3xl text-center">
          <span className="text-brand-wine mb-3 block text-xs font-bold tracking-widest uppercase">
            The Details, Taken Care Of
          </span>
          <h2 className="font-editorial mb-4 text-4xl font-normal text-gray-900 sm:text-5xl lg:text-6xl">
            Everything your wedding needs. One lovely place.
          </h2>
          <p className="text-base text-gray-600 md:text-lg">
            Simple tools for the big decisions and the thousand little things.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <FeatureCard
            icon={<CalendarIcon />}
            label="Events"
            title="Every event, in its place"
            description="From the first Dholki to the grand Walima. Keep dates, venues and dress codes together."
            tag="Mehendi · 12 February"
          />
          <FeatureCard
            icon={<CheckboxIcon />}
            label="Tasks"
            title="A little help from everyone"
            description="Assign tasks to family, set priorities and keep track of what's done."
            tag="Photographer confirmed"
          />
          <FeatureCard
            icon={<UserIcon />}
            label="Guests & Invitations"
            title="Your guests, thoughtfully invited"
            description="Manage your guest list, share personal invitations and collect RSVPs."
            tag="132 invitations answered"
          />
          <FeatureCard
            icon={<span className="text-sm font-semibold">₹</span>}
            label="Expenses"
            title="Know what you've spent"
            description="Record wedding expenses and see your total, with everything in rupees."
            tag="Photography · ₹1,80,000"
          />
          <FeatureCard
            icon={<HeartIcon className="h-4 w-4" />}
            label="Vendors"
            title="The people behind the day"
            description="Keep vendor details handy and discover local professionals for your celebration."
            tag="8 vendors, one place"
          />
          <FeatureCard
            icon={<GlobeIcon />}
            label="Website & Livestream"
            title="A home for your love story"
            description="Publish a themed wedding website with your events and a YouTube livestream."
            tag="Made for Saman & Hasan"
          />
          <FeatureCard
            icon={<ImageIcon />}
            label="Photo Gallery"
            title="All the moments, together"
            description="Collect and enjoy wedding photos in a private gallery, organised by event."
            tag="Wedding memories, preserved"
          />
          <FeatureCard
            icon={<GridIcon />}
            label="Guest Photo Sharing"
            title="Scan. Upload. Relive."
            description="Let guests share photos through one gallery link or a printed QR. No account needed."
            tag="Everyone has a camera"
          />
        </div>
      </div>
    </section>
  );
}

function FeatureCard({
  icon,
  label,
  title,
  description,
  tag,
}: {
  icon: React.ReactNode;
  label: string;
  title: string;
  description: string;
  tag: string;
}) {
  return (
    <div className="flex flex-col justify-between rounded-2xl border border-[#E8DDD1] bg-white p-6 shadow-sm">
      <div>
        <div className="text-brand-wine mb-5 flex h-9 w-9 items-center justify-center rounded-lg bg-[#FAF4ED]">
          {icon}
        </div>
        <span className="mb-1.5 block text-[10.5px] font-bold tracking-wider text-gray-500 uppercase">
          {label}
        </span>
        <h3 className="font-editorial mb-2 text-2xl font-medium text-gray-900">
          {title}
        </h3>
        <p className="mb-6 text-xs leading-relaxed text-gray-600">
          {description}
        </p>
      </div>
      <div className="flex items-center gap-1.5 rounded-lg border border-[#ECE3D8] bg-[#FAF7F2] px-3 py-2 text-[11px] text-gray-600">
        <span className="bg-brand-wine h-1.5 w-1.5 rounded-full"></span>
        {tag}
      </div>
    </div>
  );
}
