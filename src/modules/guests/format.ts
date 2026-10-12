export function getGuestInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "G";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return (parts[0]![0]! + parts[parts.length - 1]![0]!).toUpperCase();
}

export function getRsvpStatusBadge(
  status: "PENDING" | "ATTENDING" | "NOT_ATTENDING",
  attendingCount?: number | null,
) {
  switch (status) {
    case "ATTENDING":
      return {
        label:
          attendingCount && attendingCount > 0
            ? `Attending • ${attendingCount}`
            : "Attending",
        dotColor: "bg-emerald-600",
        badgeBg: "bg-emerald-50 text-emerald-800 border-emerald-200",
      };
    case "NOT_ATTENDING":
      return {
        label: "Not attending",
        dotColor: "bg-rose-500",
        badgeBg: "bg-rose-50 text-rose-800 border-rose-200",
      };
    case "PENDING":
    default:
      return {
        label: "Pending",
        dotColor: "bg-amber-500",
        badgeBg: "bg-[#F5ECE1] text-[#8C6843] border-[#EDE4D8]",
      };
  }
}
