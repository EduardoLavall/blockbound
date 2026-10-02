export class Input {
  private readonly held = new Set<string>();
  private readonly pressed = new Set<string>();
  private enabled = false;

  constructor() {
    window.addEventListener("keydown", (event) => {
      if (!this.enabled) return;
      if (!this.held.has(event.code)) this.pressed.add(event.code);
      this.held.add(event.code);
    });

    window.addEventListener("keyup", (event) => {
      this.held.delete(event.code);
    });

    window.addEventListener("blur", () => this.clear());
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    if (!enabled) this.clear();
  }

  isDown(code: string): boolean {
    return this.enabled && this.held.has(code);
  }

  consumePressed(code: string): boolean {
    if (!this.enabled || !this.pressed.has(code)) return false;
    this.pressed.delete(code);
    return true;
  }

  private clear(): void {
    this.held.clear();
    this.pressed.clear();
  }
}
