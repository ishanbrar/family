import { Baby, Building2, Home, MapPin, type LucideIcon } from "lucide-react";
import type { ProfileMapLocationSource } from "./types";

export const LOCATION_SOURCE_META: Record<
  ProfileMapLocationSource,
  { label: string; shortLabel: string; icon: LucideIcon }
> = {
  birthplace: { label: "Born in", shortLabel: "Born", icon: Baby },
  current_home: { label: "Lives in", shortLabel: "Lives", icon: Building2 },
  secondary_home: { label: "Second home", shortLabel: "Second", icon: Home },
  address: { label: "Home address", shortLabel: "Address", icon: MapPin },
};

export const LOCATION_SOURCE_ORDER: ProfileMapLocationSource[] = [
  "current_home",
  "birthplace",
  "secondary_home",
  "address",
];
