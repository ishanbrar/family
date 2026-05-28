"use client";

import { useEffect, useState } from "react";

import { isDevSuperAdminClient } from "@/lib/dev-auth";
import { createClient } from "@/lib/supabase/client";

export function useIsSuperAdmin() {
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isDevSuperAdminClient()) {
      setIsSuperAdmin(true);
      setLoading(false);
      return;
    }

    let cancelled = false;

    const load = async () => {
      try {
        const supabase = createClient();
        const { data, error } = await supabase.rpc("is_super_admin");
        if (!cancelled) setIsSuperAdmin(!error && data === true);
      } catch {
        if (!cancelled) setIsSuperAdmin(false);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  return { isSuperAdmin, loading };
}
