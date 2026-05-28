"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { useSelectedDemoFamily } from "@/lib/demo-family";

export default function DemoProfileIndexPage() {
  const router = useRouter();
  const demoFamily = useSelectedDemoFamily();

  useEffect(() => {
    const viewerId = demoFamily.profiles[0]?.id;
    if (viewerId) router.replace(`/demo/profile/${viewerId}`);
  }, [demoFamily.profiles, router]);

  return null;
}
