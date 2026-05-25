import Image from "next/image";
import { cn } from "@/lib/cn";

type LegatreeTreeIconProps = {
  /** Render width/height in pixels */
  size?: number;
  className?: string;
  alt?: string;
};

function assetForSize(size: number): string {
  if (size <= 28) return "/brand/legatree-tree-sm.png";
  if (size <= 56) return "/brand/legatree-tree-md.png";
  if (size <= 112) return "/brand/legatree-tree-lg.png";
  return "/brand/legatree-tree.png";
}

/**
 * Legatree family-tree mark (transparent PNG). Use instead of generic Lucide tree icons.
 */
export function LegatreeTreeIcon({
  size = 20,
  className = "",
  alt = "",
}: LegatreeTreeIconProps) {
  const src = assetForSize(size);

  return (
    <Image
      src={src}
      alt={alt}
      width={size}
      height={size}
      className={cn("object-contain shrink-0", className)}
      aria-hidden={alt ? undefined : true}
      priority={size >= 32}
    />
  );
}
