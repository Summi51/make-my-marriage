"use client";

import { AvailabilityButton } from "./homepage-actions";
import { useHomepageSession } from "./homepage-session";
import { homepageActions } from "./session-actions";

export function PlanningButton({
  className,
  prominent = false,
}: {
  className: string;
  prominent?: boolean;
}) {
  const session = useHomepageSession();
  const action = homepageActions(session).primary;
  const label =
    prominent && session === "signed-out"
      ? `${action.label} for Free`
      : action.label;
  return (
    <AvailabilityButton href={action.href} className={className}>
      <span>{label}</span>
      {prominent ? <span className="text-lg">→</span> : null}
    </AvailabilityButton>
  );
}
