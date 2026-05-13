"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { GALLERY_BUCKET, isDirectPhotoUrl } from "@/lib/supabase/storage";

const SIGNED_URL_TTL_SECONDS = 60 * 60 * 24;

export function useResolvedGalleryPhotos(photos: string[]): string[] {
  const [resolvedPhotos, setResolvedPhotos] = useState<Record<string, string>>({});
  const normalizedPhotos = photos.filter(Boolean);
  const photoKey = normalizedPhotos.join("\u0000");

  useEffect(() => {
    let active = true;
    const nextResolved: Record<string, string> = {};
    const directPhotos = photos.filter((photo) => !!photo && isDirectPhotoUrl(photo));
    const privatePaths = [...new Set(photos.filter((photo) => !!photo && !isDirectPhotoUrl(photo)))];

    directPhotos.forEach((photo) => {
      nextResolved[photo] = photo;
    });

    if (privatePaths.length === 0) {
      Promise.resolve().then(() => {
        if (active) setResolvedPhotos(nextResolved);
      });
      return () => {
        active = false;
      };
    }

    const supabase = createClient();
    void supabase.storage
      .from(GALLERY_BUCKET)
      .createSignedUrls(privatePaths, SIGNED_URL_TTL_SECONDS)
      .then(({ data, error }) => {
        if (!active) return;
        if (!error && Array.isArray(data)) {
          privatePaths.forEach((path, index) => {
            const signedUrl = data[index]?.signedUrl;
            if (signedUrl) nextResolved[path] = signedUrl;
          });
        }
        setResolvedPhotos(nextResolved);
      })
      .catch(() => {
        if (active) setResolvedPhotos(nextResolved);
      });

    return () => {
      active = false;
    };
  }, [photoKey, photos]);

  return useMemo(
    () => normalizedPhotos.map((photo) => resolvedPhotos[photo] || photo),
    [normalizedPhotos, resolvedPhotos]
  );
}
