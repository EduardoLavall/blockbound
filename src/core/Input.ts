export interface PointerDelta {
  x: number;
  y: number;
}

export class Input {
  private readonly held = new Set<string>();
  private readonly pressed = new Set<string>();
  private pointerDeltaX = 0;
  private pointerDeltaY = 0;
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

    window.addEventListener("pointerdown", (event) => {
      if (!this.enabled) return;
      const code = `Mouse${event.button}`;
      if (!this.held.has(code)) this.pressed.add(code);
      this.held.add(code);
    });

    window.addEventListener("pointerup", (event) => {
      this.held.delete(`Mouse${event.button}`);
    });

    window.addEventListener("pointermove", (event) => {
      if (!this.enabled) return;
      this.pointerDeltaX += event.movementX;
      this.pointerDeltaY += event.movementY;
    });

    window.addEventListener("contextmenu", (event) => {
      if (this.enabled) event.preventDefault();
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

  consumePointerDelta(): PointerDelta {
    const delta = {
      x: this.pointerDeltaX,
      y: this.pointerDeltaY,
    };
    this.pointerDeltaX = 0;
    this.pointerDeltaY = 0;
    return delta;
  }

  private clear(): void {
    this.held.clear();
    this.pressed.clear();
    this.pointerDeltaX = 0;
    this.pointerDeltaY = 0;
  }
}
