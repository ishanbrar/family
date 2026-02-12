// ══════════════════════════════════════════════════════════
// Supabase – Configuration Check
// ══════════════════════════════════════════════════════════

export function isConfigured(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  return (
    !!url &&
    url !== "https://your-project.supabase.co" &&
    !!key &&
    key !== "your-anon-key-here"
  );
}
