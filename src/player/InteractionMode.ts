export class InteractionMode {
  buildMode = false;

  toggleBuild(): boolean {
    this.buildMode = !this.buildMode;
    return this.buildMode;
  }
}
