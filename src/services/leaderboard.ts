export interface BoardEntry {
  handle: string; vehicle: string; earnings: number; deliveries: number;
  bestCombo: number; createdAt: string;
}

export interface LeaderboardPort {
  submit(e: BoardEntry): Promise<void>;
  top(n: number): Promise<BoardEntry[]>;
  rankOf(earnings: number): Promise<number>;
}

const KEY = "deoghar-dash:board";

class LocalAdapter implements LeaderboardPort {
  private read(): BoardEntry[] {
    try { return JSON.parse(localStorage.getItem(KEY) ?? "[]"); } catch { return []; }
  }
  private write(list: BoardEntry[]) {
    try { localStorage.setItem(KEY, JSON.stringify(list.slice(0, 50))); } catch { /* ignore */ }
  }
  async submit(e: BoardEntry) {
    const list = this.read();
    list.push(e);
    list.sort((a, b) => b.earnings - a.earnings);
    this.write(list);
  }
  async top(n: number) { return this.read().slice(0, n); }
  async rankOf(earnings: number) {
    const list = this.read();
    return list.filter((e) => e.earnings > earnings).length + 1;
  }
}

import { maybeSupabaseAdapter } from "./supabase";

/** Global Supabase board when env keys are set; otherwise this-device local board. */
export const leaderboard: LeaderboardPort = maybeSupabaseAdapter() ?? new LocalAdapter();
