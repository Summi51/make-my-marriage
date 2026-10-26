export function Logo({ className = "h-8 w-8" }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      className={className}
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
        className="text-brand-rose"
        cx="24"
        cy="20"
        rx="12"
        ry="12"
        strokeWidth="2.2"
      ></ellipse>
      <circle cx="20" cy="20" fill="#6B1B34" r="2.5"></circle>
    </svg>
  );
}
