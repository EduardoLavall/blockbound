import * as THREE from "three";

const CAPACITY = 180;
interface Particle { position: THREE.Vector3; velocity: THREE.Vector3; life: number; maxLife: number; size: number }

/** Fixed pools keep mining and combat effects bounded across a long run. */
export class GameFeel {
  private readonly particles: Particle[] = Array.from({ length: CAPACITY }, () => ({
    position: new THREE.Vector3(), velocity: new THREE.Vector3(), life: 0, maxLife: 1, size: 0,
  }));
  private readonly mesh = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1),
    new THREE.MeshBasicMaterial(), CAPACITY);
  private readonly dummy = new THREE.Object3D();
  private cursor = 0;
  private readonly numbers: { element: HTMLDivElement; point: THREE.Vector3; life: number; maxLife: number }[];
  private numberCursor = 0;
  enabled = true;
  private trauma = 0;
  private recoil = 0;
  private readonly cameraPosition = new THREE.Vector3();
  private readonly cameraRotation = new THREE.Quaternion();
  private readonly kickRotation = new THREE.Quaternion();
  private time = 0;

  constructor(scene: THREE.Scene, private readonly camera: THREE.Camera) {
    this.mesh.name = "pooled-impact-particles";
    this.mesh.frustumCulled = false;
    this.numbers = Array.from({ length: 24 }, () => {
      const element = document.createElement("div");
      element.className = "damage-number";
      element.hidden = true;
      document.getElementById("app")!.append(element);
      return { element, point: new THREE.Vector3(), life: 0, maxLife: 0.7 };
    });
    for (let i = 0; i < CAPACITY; i++) {
      this.dummy.scale.setScalar(0); this.dummy.updateMatrix();
      this.mesh.setMatrixAt(i, this.dummy.matrix);
      this.mesh.setColorAt(i, new THREE.Color(0xffffff));
    }
    scene.add(this.mesh);
  }
  burst(position: THREE.Vector3, color: number, count = 12): void {
    if (!this.enabled) return;
    for (let i = 0; i < count; i++) {
      const slot = this.cursor++ % CAPACITY;
      const p = this.particles[slot]!;
      p.position.copy(position);
      p.velocity.set((Math.random() - 0.5) * 4, 1 + Math.random() * 3, (Math.random() - 0.5) * 4);
      p.life = p.maxLife = 0.3 + Math.random() * 0.4;
      p.size = 0.045 + Math.random() * 0.09;
      this.mesh.setColorAt(slot, new THREE.Color(color));
    }
    this.mesh.instanceColor!.needsUpdate = true;
  }
  damage(position: THREE.Vector3, amount: number, killed: boolean, player: boolean): void {
    this.burst(position, killed ? 0xffbc6b : 0x8be3de, killed ? 18 : 5);
    if (!this.enabled || !player) return;
    const n = this.numbers[this.numberCursor++ % this.numbers.length]!;
    n.point.copy(position);
    n.life = n.maxLife;
    n.element.textContent = killed ? `${Math.ceil(amount)} · ELIMINADO` : String(Math.ceil(amount));
    n.element.classList.toggle("kill", killed);
  }
  kick(strength: number): void {
    if (!this.enabled) return;
    this.recoil = Math.min(1.5, this.recoil + strength);
  }
  hurt(): void { if (this.enabled) this.trauma = 1; }
  applyCamera(): void {
    this.cameraPosition.copy(this.camera.position);
    this.cameraRotation.copy(this.camera.quaternion);
    if (!this.enabled) return;
    const shake = this.trauma * this.trauma;
    this.camera.position.x += Math.sin(this.time * 93) * shake * 0.035;
    this.camera.position.y += Math.cos(this.time * 71) * shake * 0.025;
    this.kickRotation.setFromEuler(new THREE.Euler(this.recoil * 0.02,
      Math.sin(this.time * 19) * shake * 0.006, Math.sin(this.time * 77) * shake * 0.008));
    this.camera.quaternion.multiply(this.kickRotation);
  }
  restoreCamera(): void {
    this.camera.position.copy(this.cameraPosition);
    this.camera.quaternion.copy(this.cameraRotation);
  }
  update(dt: number): void {
    this.time += dt;
    this.trauma = Math.max(0, this.trauma - dt * 3.5);
    this.recoil *= Math.exp(-dt * 15);
    this.mesh.visible = this.enabled;
    for (let i = 0; i < CAPACITY; i++) {
      const p = this.particles[i]!;
      p.life = Math.max(0, p.life - dt);
      if (p.life > 0) {
        p.velocity.y -= dt * 10;
        p.position.addScaledVector(p.velocity, dt);
        this.dummy.position.copy(p.position);
        this.dummy.rotation.set(p.life * 3, p.life * 5, 0);
      }
      this.dummy.scale.setScalar(p.life > 0 ? p.size * p.life / p.maxLife : 0);
      this.dummy.updateMatrix();
      this.mesh.setMatrixAt(i, this.dummy.matrix);
    }
    this.mesh.instanceMatrix.needsUpdate = true;
    const projected = new THREE.Vector3();
    for (const n of this.numbers) {
      n.life = Math.max(0, n.life - dt);
      projected.copy(n.point);
      projected.y += (n.maxLife - n.life) * 0.8;
      projected.project(this.camera);
      n.element.hidden = !this.enabled || n.life <= 0 || projected.z > 1 || projected.z < -1;
      if (n.element.hidden) continue;
      n.element.style.left = `${(projected.x * 0.5 + 0.5) * 100}%`;
      n.element.style.top = `${(-projected.y * 0.5 + 0.5) * 100}%`;
      n.element.style.opacity = String(Math.min(1, n.life * 4));
    }
  }
}
