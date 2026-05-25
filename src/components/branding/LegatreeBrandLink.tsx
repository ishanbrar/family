import Link from "next/link";
import { LegatreeTreeIcon } from "@/components/branding/LegatreeTreeIcon";
import { cn } from "@/lib/cn";

type BrandSize = "sm" | "md" | "lg" | "header";

const SIZE_PRESETS: Record<
  BrandSize,
  {
    icon: number;
    gap: string;
    box: string;
    text: string;
    /** Scales the tree mark with the container (marketing header). */
    iconWrapper?: string;
  }
> = {
  sm: { icon: 24, gap: "gap-2.5", box: "w-9 h-9", text: "text-sm" },
  md: { icon: 36, gap: "gap-3.5", box: "w-12 h-12", text: "text-xl" },
  lg: { icon: 52, gap: "gap-4", box: "w-14 h-14", text: "text-2xl sm:text-3xl" },
  header: {
    icon: 56,
    gap: "gap-2 sm:gap-3 lg:gap-4",
    box: "w-8 h-8 sm:w-10 sm:h-10 lg:w-14 lg:h-14",
    iconWrapper: "w-8 h-8 sm:w-10 sm:h-10 lg:w-14 lg:h-14",
    text: "text-base sm:text-xl lg:text-3xl",
  },
};

type LegatreeBrandLinkProps = {
  destination: "public" | "app";
  size?: BrandSize;
  /** Boxed icon container (sidebar) vs plain mark (landing header). */
  variant?: "boxed" | "plain";
  className?: string;
  iconClassName?: string;
  textClassName?: string;
  showText?: boolean;
  ariaLabel?: string;
};

export function LegatreeBrandLink({
  destination,
  size = "sm",
  variant = "boxed",
  className = "",
  iconClassName = "",
  textClassName = "",
  showText = true,
  ariaLabel,
}: LegatreeBrandLinkProps) {
  const href = destination === "app" ? "/dashboard" : "/";
  const preset = SIZE_PRESETS[size];
  const isPlain = variant === "plain";
  const shouldCollapseTextOnNarrow = size === "header";

  return (
    <Link
      href={href}
      aria-label={ariaLabel || (destination === "app" ? "Go to dashboard" : "Go to homepage")}
      className={cn(
        "inline-flex items-center min-w-0 transition-colors",
        preset.gap,
        className
      )}
    >
      <div
        className={cn(
          "flex items-center justify-center shrink-0",
          isPlain ? "p-0" : cn("rounded-xl", preset.box),
          preset.iconWrapper,
          iconClassName
        )}
      >
        <LegatreeTreeIcon
          size={preset.icon}
          className={preset.iconWrapper ? "w-full h-full" : undefined}
        />
      </div>
      {showText ? (
        <span
          className={cn(
            "font-serif font-semibold tracking-wide truncate",
            shouldCollapseTextOnNarrow && "max-[360px]:hidden min-[361px]:inline",
            preset.text,
            textClassName
          )}
        >
          Legatree
        </span>
      ) : null}
    </Link>
  );
}
