export interface VehicleSpec {
  key: string; label: string;
  topSpeed: number; accel: number; brake: number; reverseSpeed: number;
  steerRate: number;        // rad/s at full lock, low speed
  steerFalloff: number;     // 0..1 - how much lock tightens away at top speed
  grip: number;             // 0..1 heading-follow; lower = drifty
  offroadFactor: number;
  galiAllowed: boolean;
  radius: number;           // collision circle
  camDist: number; camHeight: number;
  payoutMult: number; unlockAt: number;
  bodyColor: number; accentColor: number;
}

export const VEHICLES: VehicleSpec[] = [
  { key: "scooty", label: "Scooty", topSpeed: 16, accel: 9, brake: 18, reverseSpeed: 4, steerRate: 2.6, steerFalloff: 0.55, grip: 0.92, offroadFactor: 0.35, galiAllowed: true, radius: 0.9, camDist: 7.5, camHeight: 3.6, payoutMult: 1.0, unlockAt: 0, bodyColor: 0x2a9d8f, accentColor: 0xf4f1ea },
  { key: "bike", label: "Bike", topSpeed: 22, accel: 11, brake: 20, reverseSpeed: 4, steerRate: 2.9, steerFalloff: 0.7, grip: 0.88, offroadFactor: 0.35, galiAllowed: true, radius: 0.9, camDist: 8, camHeight: 3.6, payoutMult: 1.1, unlockAt: 2000, bodyColor: 0xc44536, accentColor: 0x1a1a1a },
  { key: "auto", label: "Auto-rickshaw", topSpeed: 14, accel: 7, brake: 14, reverseSpeed: 4, steerRate: 2.2, steerFalloff: 0.45, grip: 0.85, offroadFactor: 0.45, galiAllowed: true, radius: 1.3, camDist: 10, camHeight: 4.4, payoutMult: 1.2, unlockAt: 5000, bodyColor: 0xe9c46a, accentColor: 0x2d6a4f },
  { key: "sedan", label: "Sedan", topSpeed: 19, accel: 8.5, brake: 17, reverseSpeed: 5, steerRate: 2.0, steerFalloff: 0.5, grip: 0.95, offroadFactor: 0.35, galiAllowed: false, radius: 1.6, camDist: 12, camHeight: 5.2, payoutMult: 1.15, unlockAt: 10000, bodyColor: 0x6c8ebf, accentColor: 0x22303f },
  { key: "suv", label: "SUV", topSpeed: 15, accel: 7, brake: 15, reverseSpeed: 5, steerRate: 1.8, steerFalloff: 0.4, grip: 0.96, offroadFactor: 0.75, galiAllowed: false, radius: 1.8, camDist: 13, camHeight: 5.8, payoutMult: 1.3, unlockAt: 20000, bodyColor: 0x3d405b, accentColor: 0xb0b7c3 },
];

