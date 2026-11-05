import { TUNABLES } from '../config/tunables';
import type { Aabb, Vec3 } from '../core/types';

type Axis = 'x' | 'y' | 'z';
const EPSILON = 1e-7;

/** 직립 AABB의 축별 연속 sweep. 큰 delta도 벽을 통과하지 않는다. */
export class CollisionWorld {
  constructor(readonly boxes: readonly Aabb[]) {}

  private bounds(p: Vec3, height: number): Aabb {
    const r = TUNABLES.movement.radius;
    return { min: { x: p.x-r, y: p.y, z: p.z-r }, max: { x: p.x+r, y: p.y+height, z: p.z+r } };
  }

  canOccupy(p: Vec3, height: number): boolean {
    const body = this.bounds(p, height);
    return !this.boxes.some(box => (['x','y','z'] as const).every(axis =>
      body.max[axis] > box.min[axis]+EPSILON && body.min[axis] < box.max[axis]-EPSILON));
  }

  private sweep(p: Vec3, height: number, axis: Axis, distance: number): number {
    if (distance === 0) return 0;
    const body = this.bounds(p, height);
    let allowed = distance;
    const others = (['x','y','z'] as const).filter(a => a !== axis);
    for (const box of this.boxes) {
      if (!others.every(a => body.max[a] > box.min[a]+EPSILON && body.min[a] < box.max[a]-EPSILON)) continue;
      if (distance > 0 && body.max[axis] <= box.min[axis]+EPSILON)
        allowed = Math.min(allowed, Math.max(0, box.min[axis]-body.max[axis]));
      if (distance < 0 && body.min[axis] >= box.max[axis]-EPSILON)
        allowed = Math.max(allowed, Math.min(0, box.max[axis]-body.min[axis]));
    }
    return allowed;
  }

  move(start: Vec3, delta: Vec3, height: number, mayStep: boolean): { position: Vec3; grounded: boolean; hitCeiling: boolean } {
    const p = { ...start };
    for (const axis of ['x','z'] as const) {
      let distance = this.sweep(p, height, axis, delta[axis]);
      if (mayStep && Math.abs(distance-delta[axis]) > EPSILON) {
        const raised = { ...p, y: p.y + TUNABLES.movement.stepHeight };
        if (this.canOccupy(raised,height) && Math.abs(this.sweep(raised,height,axis,delta[axis])-delta[axis]) < EPSILON) {
          const destination = { ...raised, [axis]: raised[axis]+delta[axis] };
          if (this.canOccupy(destination,height)) {
            p.y = destination.y;
            distance = delta[axis];
            const lowered = { ...p, [axis]: p[axis]+distance };
            p.y += this.sweep(lowered,height,'y',-TUNABLES.movement.stepHeight);
          }
        }
      }
      p[axis] += distance;
    }
    const vertical = this.sweep(p,height,'y',delta.y);
    p.y += vertical;
    return { position:p, grounded:delta.y<0 && vertical>delta.y+EPSILON, hitCeiling:delta.y>0 && vertical<delta.y-EPSILON };
  }
}
