import { createClient } from "@supabase/supabase-js";
import type { BoardEntry, LeaderboardPort } from "./leaderboard";

const PENDING_KEY = "deoghar-dash:pending";

/** Returns a Supabase-backed leaderboard when env keys exist, else null (caller falls back to local). */
export function maybeSupabaseAdapter(): LeaderboardPort | null {
  const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;
  if (!url || !key) return null;
  const sb = createClient(url, key);

  const flushPending = async () => {
    let pending: BoardEntry[] = [];
    try { pending = JSON.parse(localStorage.getItem(PENDING_KEY) ?? "[]"); } catch { /* none */ }
    if (pending.length === 0) return;
    const rows = pending.map(toRow);
    const { error } = await sb.from("leaderboard").insert(rows);
    if (!error) { try { localStorage.removeItem(PENDING_KEY); } catch { /* ignore */ } }
  };
  void flushPending();

  const toRow = (e: BoardEntry) => ({
    handle: e.handle, vehicle: e.vehicle, earnings: e.earnings,
    deliveries: e.deliveries, best_combo: e.bestCombo,
  });

  return {
    async submit(e: BoardEntry) {
      const { error } = await sb.from("leaderboard").insert(toRow(e));
      if (error) {
        try {
          const pending: BoardEntry[] = JSON.parse(localStorage.getItem(PENDING_KEY) ?? "[]");
          pending.push(e);
          localStorage.setItem(PENDING_KEY, JSON.stringify(pending.slice(-10)));
        } catch { /* drop */ }
        throw error;
      }
    },
    async top(n: number) {
      const { data, error } = await sb
        .from("leaderboard")
        .select("handle, vehicle, earnings, deliveries, best_combo, created_at")
        .order("earnings", { ascending: false })
        .limit(n);
      if (error || !data) return [];
      return data.map((r) => ({
        handle: r.handle, vehicle: r.vehicle, earnings: r.earnings,
        deliveries: r.deliveries, bestCombo: Number(r.best_combo), createdAt: r.created_at,
      }));
    },
    async rankOf(earnings: number) {
      const { count, error } = await sb
        .from("leaderboard")
        .select("*", { count: "exact", head: true })
        .gt("earnings", earnings);
      if (error || count === null) return 1;
      return count + 1;
    },
  };
}
