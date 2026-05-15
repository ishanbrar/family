import Link from "next/link";
import { TreeDeciduous } from "lucide-react";

type LegatreeBrandLinkProps = {
  destination: "public" | "app";
  className?: string;
  iconClassName?: string;
  textClassName?: string;
  showText?: boolean;
  ariaLabel?: string;
};

export function LegatreeBrandLink({
  destination,
  className = "",
  iconClassName = "",
  textClassName = "",
  showText = true,
  ariaLabel,
}: LegatreeBrandLinkProps) {
  const href = destination === "app" ? "/dashboard" : "/";

  return (
    <Link
      href={href}
      aria-label={ariaLabel || (destination === "app" ? "Go to dashboard" : "Go to homepage")}
      className={`inline-flex items-center gap-3 transition-colors ${className}`.trim()}
    >
      <div className={`flex items-center justify-center w-9 h-9 rounded-xl ${iconClassName}`.trim()}>
        <TreeDeciduous size={18} className="text-current" />
      </div>
      {showText ? (
        <span className={`font-serif font-semibold tracking-wide ${textClassName}`.trim()}>
          Legatree
        </span>
      ) : null}
    </Link>
  );
}
