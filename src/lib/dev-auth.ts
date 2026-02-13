export const DEV_SUPER_ADMIN_COOKIE = "dev_super_admin";
export const DEV_SUPER_ADMIN_ENABLED =
  process.env.NEXT_PUBLIC_ENABLE_DEV_SUPER_ADMIN === "1" ||
  process.env.NODE_ENV !== "production";

export function isDevSuperAdminClient(): boolean {
  if (!DEV_SUPER_ADMIN_ENABLED) return false;
  if (typeof document === "undefined") return false;
  return document.cookie.split(";").some((part) => {
    const [k, v] = part.trim().split("=");
    return k === DEV_SUPER_ADMIN_COOKIE && v === "1";
  });
}

export function enableDevSuperAdmin(): void {
  if (!DEV_SUPER_ADMIN_ENABLED) return;
  if (typeof document === "undefined") return;
  document.cookie = `${DEV_SUPER_ADMIN_COOKIE}=1; Path=/; Max-Age=604800; SameSite=Lax`;
}

export function disableDevSuperAdmin(): void {
  if (typeof document === "undefined") return;
  document.cookie = `${DEV_SUPER_ADMIN_COOKIE}=; Path=/; Max-Age=0; SameSite=Lax`;
}
