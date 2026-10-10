/** Forgives slightly early jump presses and late presses at a ledge. */
export class JumpBuffer {
  private grace = 0;
  private queued = 0;

  update(dt: number, grounded: boolean, pressed: boolean): boolean {
    this.grace = grounded ? 0.1 : Math.max(0, this.grace - dt);
    this.queued = pressed ? 0.12 : Math.max(0, this.queued - dt);
    if (this.grace <= 0 || this.queued <= 0) return false;
    this.grace = 0;
    this.queued = 0;
    return true;
  }
}
