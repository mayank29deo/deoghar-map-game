/** Shared mutable touch state — written by TouchControls (React), read by GameApp each tick. */
export const touch = {
  active: false,       // true once any touch control is used this session
  steer: 0,            // -1..1
  brake: false,
  hornQueued: false,
};
