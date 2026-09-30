export function TimelineSection() {
  return (
    <section
      className="bg-brand-cream overflow-hidden border-t border-[#ECE2D7] py-24"
      data-purpose="multiday-timeline"
    >
      <div className="mx-auto max-w-6xl px-6">
        <div className="mb-16 flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
          <div>
            <span className="text-brand-wine mb-3 block text-xs font-bold tracking-widest uppercase">
              More than a single day
            </span>
            <h2 className="font-editorial text-4xl leading-tight font-normal text-gray-900 sm:text-5xl lg:text-6xl">
              Because your wedding
              <br />
              is never just one event.
            </h2>
          </div>
          <p className="max-w-sm text-sm leading-relaxed text-gray-600 md:text-base">
            A week of sacred traditions and joyful memories. Give every
            celebration its own moment.
          </p>
        </div>

        <div className="relative pt-6">
          <div className="bg-brand-border absolute top-[34px] right-6 left-6 z-0 hidden h-[1.5px] lg:block"></div>

          <div className="relative z-10 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <TimelineCard
              date="10 Feb"
              year="2027"
              name="Dholki / Manjha"
              subtitle="Pre-wedding songs & turmeric"
              venue="The family home"
              time="6:30 PM · 60 guests"
              highlight={false}
              tone="neutral"
            />
            <TimelineCard
              date="12 Feb"
              year="2027"
              name="Mehndi"
              subtitle="Henna night & folk rhythms"
              venue="The garden lawn"
              time="6:00 PM · 120 guests"
              highlight={true}
              tone="warm"
            />
            <TimelineCard
              date="13 Feb"
              year="2027"
              name="Nikah"
              subtitle="Sacred vows & Qubool Hai"
              venue="Grand Mosque & Banquet"
              time="4:00 PM · 200 guests"
              highlight={true}
              tone="rose"
            />
            <TimelineCard
              date="13 Feb"
              year="2027"
              name="Rukhsati"
              subtitle="Farewell & family du'as"
              venue="The banquet hall"
              time="8:30 PM · Warm blessings"
              highlight={false}
              tone="neutral"
            />
            <TimelineCard
              date="14 Feb"
              year="2027"
              name="Walima"
              subtitle="Grand reception & feast"
              venue="The Royal Courtyard"
              time="7:30 PM · 300 guests"
              highlight={true}
              tone="warm"
            />
          </div>
        </div>

        <div className="mt-12 text-center">
          <span className="text-brand-muted-warm text-xs font-semibold tracking-widest uppercase">
            Saman &amp; Hasan&apos;s celebrations · An example of a wedding made
            yours.
          </span>
        </div>
      </div>
    </section>
  );
}

function TimelineCard({
  date,
  year,
  name,
  subtitle,
  venue,
  time,
  highlight,
  tone,
}: {
  date: string;
  year: string;
  name: string;
  subtitle: string;
  venue: string;
  time: string;
  highlight: boolean;
  tone: "neutral" | "warm" | "rose";
}) {
  return (
    <div>
      <div className="mb-6 hidden items-center justify-center lg:flex">
        <span
          className={`h-3.5 w-3.5 rounded-full border-2 ${
            highlight
              ? "bg-brand-wine border-brand-cream"
              : "bg-brand-cream border-[#CBB6A1]"
          }`}
        ></span>
      </div>
      <div
        className={`flex h-full flex-col justify-between rounded-xl border p-5 ${
          {
            neutral: "border-[#E7DDD0] bg-[#F6EFE8]",
            warm: "border-[#EADBD0] bg-[#F8EFE9]",
            rose: "border-[#E9D5D6] bg-[#F7EBEB]",
          }[tone]
        }`}
      >
        <div>
          <span
            className={`mb-1 block text-[10px] font-bold uppercase ${
              highlight ? "text-brand-wine" : "text-gray-500"
            }`}
          >
            {date} <span className="font-normal">{year}</span>
          </span>
          <h3 className="font-editorial text-2xl font-medium text-gray-900">
            {name}
          </h3>
          <p className="mb-6 text-[11px] text-gray-500 italic">{subtitle}</p>
        </div>
        <div className="space-y-1 text-[11px] text-gray-600">
          <p className="flex items-center gap-1">
            📍 <span>{venue}</span>
          </p>
          <p className="text-gray-500">{time}</p>
        </div>
      </div>
    </div>
  );
}
