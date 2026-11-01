export const cardPhysicsDefaults = {
  skeleton: false,
  columns: 6,
  rows: 6,
  angle: 0.04 * 180 / Math.PI,
  restitution: 0.34,
  gravity: 1.05,
  frictionAir: 0.006,
  lockFrames: 18,
};

export type CardPhysicsParams = typeof cardPhysicsDefaults & {
  soft: boolean;
  dropDistance: number;
  dropInterval: number;
};
