export interface Vec3 { x: number; y: number; z: number }
export interface Aabb { min: Vec3; max: Vec3 }
export interface MoveIntent {
  forward: number;
  right: number;
  sprint: boolean;
  jump: boolean;
  dash: boolean;
  slide: boolean;
}
export const NEUTRAL_INTENT: Readonly<MoveIntent> = {
  forward: 0, right: 0, sprint: false, jump: false, dash: false, slide: false,
};
