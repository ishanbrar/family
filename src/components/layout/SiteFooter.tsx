type SiteFooterProps = {
  variant?: "public" | "app";
};

export function SiteFooter({ variant = "app" }: SiteFooterProps) {
  const wrapperClass =
    variant === "public"
      ? "flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"
      : "flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between";

  return (
    <div className={wrapperClass}>
      <div>
        <p className="text-xs uppercase tracking-[0.24em] text-white/35">Legacy</p>
        <p className="mt-2 max-w-xl text-sm leading-relaxed text-white/55">
          Family history, identity, and health in one private experience.
        </p>
      </div>

      <div className="text-sm text-white/45 lg:text-right">
        <p className="text-white/65">Designed and built by Ishan Brar</p>
        <p className="mt-1">Copyright 2026. All rights reserved.</p>
      </div>
    </div>
  );
}
