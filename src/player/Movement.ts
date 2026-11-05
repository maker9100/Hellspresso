import { TUNABLES } from '../config/tunables';
import { RULES } from '../config/rules';
import type { MoveIntent, Vec3 } from '../core/types';
import { CollisionWorld } from '../physics/CollisionWorld';
import { ResourceSystem } from './Resources';

export class Movement {
  position: Vec3;
  grounded = true;
  height: number = TUNABLES.movement.standingHeight;
  jumps = 0;
  private verticalSpeed = 0;
  private dashLeft = 0;
  private slideLeft = 0;
  private dashCooldown = 0;
  private slideCooldown = 0;
  private specialDirection = { x:0, z:-1 };

  constructor(private readonly world: CollisionWorld, spawn: Vec3) { this.position = { ...spawn }; }
  get mode(): string { return this.dashLeft>0 ? 'DASH' : this.slideLeft>0 ? 'SLIDE' : this.height<TUNABLES.movement.standingHeight ? 'LOW' : this.grounded ? 'GROUND' : 'AIR'; }
  get eyeHeight(): number { return TUNABLES.movement.eyeHeight-(TUNABLES.movement.standingHeight-this.height); }

  update(dt: number, intent: MoveIntent, yaw: number, resources: ResourceSystem): void {
    const c = TUNABLES.movement;
    this.dashCooldown = Math.max(0,this.dashCooldown-dt);
    this.slideCooldown = Math.max(0,this.slideCooldown-dt);
    const length = Math.hypot(intent.forward,intent.right);
    const forward = length>1 ? intent.forward/length : intent.forward;
    const right = length>1 ? intent.right/length : intent.right;
    const direction = { x: -Math.sin(yaw)*forward+Math.cos(yaw)*right, z: -Math.cos(yaw)*forward-Math.sin(yaw)*right };
    const special = length>0 ? { x:direction.x/Math.hypot(direction.x,direction.z), z:direction.z/Math.hypot(direction.x,direction.z) } : { x:-Math.sin(yaw), z:-Math.cos(yaw) };
    if (intent.dash && this.dashLeft<=0 && this.slideLeft<=0 && this.dashCooldown<=0 && (this.grounded || c.dashInAir) && resources.spendStamina(RULES.resources.dashStaminaCost)) {
      this.dashLeft = c.dashSeconds;
      this.dashCooldown = c.dashCooldownSeconds;
      this.specialDirection = special;
    }
    if (intent.slide && this.grounded && this.slideLeft<=0 && this.dashLeft<=0 && this.slideCooldown<=0 && resources.spendStamina(RULES.resources.slideStaminaCost)) {
      this.slideLeft = c.slideSeconds;
      this.slideCooldown = c.slideCooldownSeconds;
      this.specialDirection = special;
      this.height = c.slidingHeight;
    }
    const canStand = this.world.canOccupy(this.position,c.standingHeight);
    if (intent.jump && this.jumps<RULES.maxJumps && canStand && resources.spendStamina(c.jumpStaminaCost)) {
      this.slideLeft = 0;
      this.height = c.standingHeight;
      this.verticalSpeed = this.jumps===0 ? c.jumpSpeed : c.secondJumpSpeed;
      this.jumps += 1;
      this.grounded = false;
    }
    if (this.slideLeft<=0 && canStand) this.height = c.standingHeight;
    let speed: number = c.walkSpeed;
    if (intent.sprint && resources.spendStamina(c.sprintStaminaPerSecond*dt)) speed = c.sprintSpeed;
    const moving = { x:direction.x*speed*dt, z:direction.z*speed*dt };
    const specialTime = Math.min(dt,Math.max(this.dashLeft,this.slideLeft));
    if (specialTime>0) {
      const specialSpeed = this.dashLeft>0 ? c.dashSpeed : c.slideSpeed;
      moving.x = this.specialDirection.x*specialSpeed*specialTime+direction.x*speed*(dt-specialTime);
      moving.z = this.specialDirection.z*specialSpeed*specialTime+direction.z*speed*(dt-specialTime);
    }
    this.dashLeft = Math.max(0,this.dashLeft-dt);
    this.slideLeft = Math.max(0,this.slideLeft-dt);
    this.verticalSpeed -= c.gravity*dt;
    const result = this.world.move(this.position,{...moving,y:this.verticalSpeed*dt},this.height,this.grounded);
    this.position = result.position;
    this.grounded = result.grounded;
    if (result.grounded) { this.verticalSpeed=0; this.jumps=0; }
    if (result.hitCeiling) this.verticalSpeed=0;
    if (!this.grounded && this.jumps===0) this.jumps=1;
    if (!this.grounded) this.slideLeft=0;
  }
}
