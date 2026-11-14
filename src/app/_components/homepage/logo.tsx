import type { SVGProps } from "react";

export interface LogoProps extends SVGProps<SVGSVGElement> {
  className?: string;
  wineColor?: string;
  roseColor?: string;
}

export function Logo({
  className = "h-8 w-8",
  wineColor = "#6B1B34",
  roseColor = "#A26769",
  ...props
}: LogoProps) {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      className={className}
      fill="none"
      viewBox="0 0 40 40"
      {...props}
    >
      <ellipse
        cx="16"
        cy="20"
        rx="12"
        ry="12"
        stroke={wineColor}
        strokeWidth="2.2"
      />
      <ellipse
        cx="24"
        cy="20"
        rx="12"
        ry="12"
        stroke={roseColor}
        strokeWidth="2.2"
      />
      <circle cx="20" cy="20" r="2.5" fill={wineColor} />
    </svg>
  );
}

export interface BrandWordmarkProps {
  className?: string;
  size?: "compact" | "default" | "large";
  subtitle?: string;
  inverted?: boolean;
  titleClassName?: string;
  subtitleClassName?: string;
}

export function BrandWordmark({
  className = "",
  size = "default",
  subtitle = "Wedding Workspace",
  inverted = false,
  titleClassName = "",
  subtitleClassName = "",
}: BrandWordmarkProps) {
  const iconSize =
    size === "compact"
      ? "h-7 w-7 sm:h-8 sm:w-8"
      : size === "large"
        ? "h-9 w-9 sm:h-10 sm:w-10"
        : "h-8 w-8";

  const titleSize =
    size === "compact"
      ? "text-sm sm:text-base"
      : size === "large"
        ? "text-base sm:text-xl"
        : "text-sm sm:text-lg";

  const subSize =
    size === "compact"
      ? "text-[8.5px] sm:text-[10px]"
      : "text-[9px] sm:text-[11px]";

  const defaultTitleColor = inverted ? "text-white" : "text-gray-900";
  const defaultSubColor = inverted ? "text-white/70" : "text-gray-500";

  return (
    <div className={`flex min-w-0 items-center gap-2 sm:gap-3 ${className}`}>
      <Logo
        className={`${iconSize} shrink-0`}
        wineColor={inverted ? "#F4D9DC" : "#6B1B34"}
        roseColor={inverted ? "#D4AF37" : "#A26769"}
      />
      <span className="flex min-w-0 flex-col">
        <span
          className={`truncate leading-none font-bold tracking-tight ${defaultTitleColor} ${titleSize} ${titleClassName}`}
        >
          Make My Marriage
        </span>
        {subtitle ? (
          <span
            className={`mt-1 truncate font-semibold tracking-wider uppercase ${defaultSubColor} ${subSize} ${
              size === "compact" ? "hidden sm:block" : ""
            } ${subtitleClassName}`}
          >
            {subtitle}
          </span>
        ) : null}
      </span>
    </div>
  );
}
