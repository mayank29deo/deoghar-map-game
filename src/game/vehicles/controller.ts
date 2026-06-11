import type { VehicleSpec } from "./specs";

export interface VehState { x: number; z: number; heading: number; speed: number; steerVis: number; drifting: boolean }
export interface VehInput { throttle: number; steer: number; handbrake: boolean }
export interface Surface { cls: number; galiBlocked: boolean }

export function createVehState(x: number, z: number, heading: number): VehState {
  return { x, z, heading, speed: 0, steerVis: 0, drifting: false };
}

const DRAG = 0.6;          // 1/s proportional drag
const ROLL = 0.8;          // m/s^2 constant rolling resistance
const GALI_SPEED = 0.6;    // allowed 2W speed factor in alleys

export function stepVehicle(s: VehState, input: VehInput, spec: VehicleSpec, surface: Surface, dt: number): VehState {
  let { x, z, heading, speed } = s;

  let surfFactor = 1;
  if (surface.cls === 0 || surface.galiBlocked) surfFactor = spec.offroadFactor;
  else if (surface.cls === 6) surfFactor = GALI_SPEED;
  const top = spec.topSpeed * surfFactor;

  // longitudinal — exponential approach to target speed (arcade feel, guarantees top speed)
  if (input.throttle > 0) {
    const target = top * input.throttle;
    if (speed < target) speed += (target - speed) * Math.min(1, (spec.accel / Math.max(top, 1)) * 2.2 * dt);
  } else if (input.throttle < 0) {
    if (speed > 0.5) speed += spec.brake * input.throttle * dt; // braking
    else speed = Math.max(speed + spec.accel * 0.6 * input.throttle * dt, -spec.reverseSpeed * surfFactor);
  } else {
    // coasting: drag + rolling resistance toward 0
    const csign = Math.sign(speed);
    speed -= csign * Math.min(Math.abs(speed), (DRAG * Math.abs(speed) + ROLL) * dt);
  }
  const sign = Math.sign(speed);
  if (input.handbrake) speed -= sign * Math.min(Math.abs(speed), spec.brake * 0.9 * dt);
  if (speed > top) speed = Math.max(top, speed - spec.brake * 1.2 * dt); // over-cap decay (entering offroad fast)

  // steering — effectiveness scales with speed fraction, falls off near top speed
  const spdFrac = Math.min(Math.abs(speed) / spec.topSpeed, 1);
  const lock = spec.steerRate * (1 - spec.steerFalloff * spdFrac);
  const steerEff = input.handbrake ? lock * 1.6 : lock;
  if (Math.abs(speed) > 0.15) heading += input.steer * steerEff * spdFrac * Math.sign(speed) * dt;

  // hard turns scrub speed a little
  speed -= Math.abs(input.steer) * spdFrac * (input.handbrake ? 3.5 : 1.2) * dt * (Math.sign(speed) || 0);

  x += Math.cos(heading) * speed * dt;
  z += Math.sin(heading) * speed * dt;

  const steerVis = s.steerVis + (input.steer - s.steerVis) * Math.min(1, dt * 10);
  const drifting = input.handbrake && Math.abs(speed) > spec.topSpeed * 0.4;
  return { x, z, heading, speed, steerVis, drifting };
}
