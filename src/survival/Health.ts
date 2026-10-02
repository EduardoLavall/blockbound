export class Health {
  private currentValue: number;

  constructor(readonly max: number) {
    this.currentValue = max;
  }

  get current(): number {
    return this.currentValue;
  }

  get ratio(): number {
    return this.max > 0 ? this.currentValue / this.max : 0;
  }

  get destroyed(): boolean {
    return this.currentValue <= 0;
  }

  damage(amount: number): number {
    const before = this.currentValue;
    this.currentValue = Math.max(0, this.currentValue - Math.max(0, amount));
    return before - this.currentValue;
  }

  heal(amount: number): number {
    const before = this.currentValue;
    this.currentValue = Math.min(this.max, this.currentValue + Math.max(0, amount));
    return this.currentValue - before;
  }
}
