// ══════════════════════════════════════════════════════════
// Supabase Storage Utilities – Avatar & Photo Upload
// ══════════════════════════════════════════════════════════

import type { SupabaseClient } from "@supabase/supabase-js";

const BUCKET = "avatars";

/**
 * Upload an avatar image to Supabase Storage.
 * Returns the public URL of the uploaded file.
 */
export async function uploadAvatar(
  supabase: SupabaseClient,
  targetUserId: string,
  file: File
): Promise<string | null> {
  if (!file.type.startsWith("image/")) return null;
  if (file.size > 8 * 1024 * 1024) return null; // 8MB hard cap

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
  const path = `${user.id}/${targetUserId}/avatar-${Date.now()}.${ext}`;

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, {
      cacheControl: "3600",
      upsert: true,
      contentType: file.type,
    });

  if (error) {
    console.error("Avatar upload error:", error);
    return null;
  }

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

/**
 * Delete old avatar when replacing.
 */
export async function deleteAvatar(
  supabase: SupabaseClient,
  url: string
): Promise<void> {
  // Extract path from full URL
  const match = url.match(/\/avatars\/(.+)$/);
  if (!match) return;

  await supabase.storage.from(BUCKET).remove([match[1]]);
}
