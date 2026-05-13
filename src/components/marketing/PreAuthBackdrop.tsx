import { VantaCloudBackdrop } from "@/components/marketing/VantaCloudBackdrop";

export function PreAuthBackdrop({
  variant = "auth",
}: {
  variant?: "landing" | "auth";
}) {
  return <VantaCloudBackdrop variant={variant} />;
}
