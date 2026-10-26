export function HeartIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      className={className}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"
        strokeWidth="1.8"
      ></path>
    </svg>
  );
}

export function CalendarIcon({
  className = "h-4 w-4",
}: {
  className?: string;
}) {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      className={className}
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
  );
}

export function UsersIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      className={className}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"
        strokeWidth="1.8"
      ></path>
      <circle cx="9" cy="7" r="4" strokeWidth="1.8"></circle>
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" strokeWidth="1.8"></path>
      <path d="M16 3.13a4 4 0 0 1 0 7.75" strokeWidth="1.8"></path>
    </svg>
  );
}

export function UserIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      className={className}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"
        strokeWidth="2"
      ></path>
      <circle cx="9" cy="7" r="4" strokeWidth="2"></circle>
    </svg>
  );
}

export function CheckboxIcon({
  className = "h-4 w-4",
}: {
  className?: string;
}) {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      className={className}
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
  );
}

export function LockIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      className={className}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <rect
        height="11"
        rx="2"
        ry="2"
        strokeWidth="1.8"
        width="18"
        x="3"
        y="11"
      ></rect>
      <path d="M7 11V7a5 5 0 0 1 10 0v4" strokeWidth="1.8"></path>
    </svg>
  );
}

export function GlobeIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      className={className}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <circle cx="12" cy="12" r="10" strokeWidth="2"></circle>
      <line strokeWidth="2" x1="2" x2="22" y1="12" y2="12"></line>
      <path
        d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"
        strokeWidth="2"
      ></path>
    </svg>
  );
}

export function ImageIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      className={className}
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
        y="3"
      ></rect>
      <circle cx="8.5" cy="8.5" r="1.5"></circle>
      <polyline points="21 15 16 10 5 21" strokeWidth="2"></polyline>
    </svg>
  );
}

export function GridIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      className={className}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <rect height="7" strokeWidth="2" width="7" x="3" y="3"></rect>
      <rect height="7" strokeWidth="2" width="7" x="14" y="3"></rect>
      <rect height="7" strokeWidth="2" width="7" x="14" y="14"></rect>
      <rect height="7" strokeWidth="2" width="7" x="3" y="14"></rect>
    </svg>
  );
}

export function QrGridIcon({ className = "h-8 w-8" }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      viewBox="0 0 24 24"
    >
      <rect height="6" width="6" x="3" y="3" rx="1"></rect>
      <rect height="6" width="6" x="15" y="3" rx="1"></rect>
      <rect height="6" width="6" x="15" y="15" rx="1"></rect>
      <rect height="6" width="6" x="3" y="15" rx="1"></rect>
    </svg>
  );
}

export function PlayIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      className={className}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <polygon
        points="5 3 19 12 5 21 5 3"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      ></polygon>
    </svg>
  );
}
