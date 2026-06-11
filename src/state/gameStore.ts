import { create } from "zustand";
import type { Offer } from "../game/sim/missions";

export type Screen = "home" | "garage" | "driving" | "results" | "leaderboard";

export interface ShiftHud {
  timeLeft: number;
  earnings: number;
  deliveries: number;
  chain: number;
  combo: number;
  comboLeft: number;        // seconds left to keep the chain (0 = no chain running)
  speed: number;
  missionPhase: "none" | "pickup" | "drop";
  targetName: string;
  targetDist: number;
  bearing: number;          // radians, world bearing to target
  heading: number;          // player heading
  parcel: string;
  offers: Offer[];
  lastDelivery: { amount: number; at: number } | null;
  lastDeliveryLL: { lat: number; lon: number } | null;
  bump: number | null;
  playerX: number;
  playerZ: number;
}

export interface ShiftResults {
  earnings: number; deliveries: number; bestCombo: number; vehicleKey: string;
  speedBonuses: number; isRecord: boolean; rank: number | null;
}

interface Profile { handle: string; careerEarnings: number; bestShift: number }

const PROFILE_KEY = "deoghar-dash:v1";

function loadProfile(): Profile {
  try {
    const raw = localStorage.getItem(PROFILE_KEY);
    if (raw) return { handle: "", careerEarnings: 0, bestShift: 0, ...JSON.parse(raw) };
  } catch { /* fresh */ }
  return { handle: "", careerEarnings: 0, bestShift: 0 };
}

function saveProfile(p: Profile) {
  try { localStorage.setItem(PROFILE_KEY, JSON.stringify(p)); } catch { /* full/blocked */ }
}

export interface GameStore extends Profile {
  screen: Screen;
  selectedIdx: number;
  shift: ShiftHud;
  results: ShiftResults | null;
  // commands (React → game)
  pendingAccept: number | null;
  setScreen: (s: Screen) => void;
  setHandle: (h: string) => void;
  selectVehicle: (i: number) => void;
  acceptOffer: (id: number) => void;
  // game → React
  hudSync: (p: Partial<ShiftHud>) => void;
  finishShift: (r: ShiftResults, careerDelta: number) => void;
}

const emptyShift = (): ShiftHud => ({
  timeLeft: 300, earnings: 0, deliveries: 0, chain: 0, combo: 1, comboLeft: 0, speed: 0,
  missionPhase: "none", targetName: "", targetDist: 0, bearing: 0, heading: 0, parcel: "",
  offers: [], lastDelivery: null, lastDeliveryLL: null, bump: null, playerX: 0, playerZ: 0,
});

export const useGameStore = create<GameStore>()((set, get) => ({
  ...loadProfile(),
  screen: "home",
  selectedIdx: 0,
  shift: emptyShift(),
  results: null,
  pendingAccept: null,

  setScreen: (screen) => {
    if (screen === "driving") set({ shift: emptyShift(), results: null, screen });
    else set({ screen });
  },
  setHandle: (handle) => {
    const h = handle.slice(0, 16);
    set({ handle: h });
    const { careerEarnings, bestShift } = get();
    saveProfile({ handle: h, careerEarnings, bestShift });
  },
  selectVehicle: (selectedIdx) => set({ selectedIdx }),
  acceptOffer: (id) => set({ pendingAccept: id }),

  hudSync: (p) => set((s) => ({ shift: { ...s.shift, ...p } })),
  finishShift: (results, careerDelta) => {
    const career = get().careerEarnings + careerDelta;
    const bestShift = Math.max(get().bestShift, results.earnings);
    set({ results, careerEarnings: career, bestShift, screen: "results" });
    saveProfile({ handle: get().handle, careerEarnings: career, bestShift });
  },
}));

if (import.meta.env.DEV) (window as unknown as { __store: typeof useGameStore }).__store = useGameStore;
