import * as THREE from "three";

export class Renderer3D {
  readonly renderer: THREE.WebGLRenderer;
  readonly scene = new THREE.Scene();
  readonly camera: THREE.PerspectiveCamera;

  private readonly hemi: THREE.HemisphereLight;
  private readonly sun: THREE.DirectionalLight;
  private readonly daySky = new THREE.Color(0x89aeb2);
  private readonly nightSky = new THREE.Color(0x101426);
  private readonly skyScratch = new THREE.Color();

  constructor(private readonly canvas: HTMLCanvasElement) {
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      powerPreference: "high-performance",
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    this.scene.background = this.daySky.clone();
    this.scene.fog = new THREE.Fog(this.daySky, 32, 85);

    this.camera = new THREE.PerspectiveCamera(74, 1, 0.05, 140);
    this.camera.position.set(0, 2.2, 7);
    this.scene.add(this.camera);

    this.hemi = new THREE.HemisphereLight(
      0xc9e8f0,
      0x37442d,
      1.8,
    );
    this.scene.add(this.hemi);

    this.sun = new THREE.DirectionalLight(0xffefc7, 2.8);
    this.sun.position.set(18, 30, 12);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(2048, 2048);
    this.sun.shadow.camera.left = -35;
    this.sun.shadow.camera.right = 35;
    this.sun.shadow.camera.top = 35;
    this.sun.shadow.camera.bottom = -35;
    this.scene.add(this.sun);

    window.addEventListener("resize", this.resize);
    this.resize();
  }

  setNightFactor(value: number): void {
    const factor = THREE.MathUtils.clamp(value, 0, 1);
    this.skyScratch.copy(this.daySky).lerp(this.nightSky, factor);

    if (this.scene.background instanceof THREE.Color) {
      this.scene.background.copy(this.skyScratch);
    }

    if (this.scene.fog instanceof THREE.Fog) {
      this.scene.fog.color.copy(this.skyScratch);
      this.scene.fog.near = THREE.MathUtils.lerp(32, 22, factor);
      this.scene.fog.far = THREE.MathUtils.lerp(85, 58, factor);
    }

    this.hemi.intensity = THREE.MathUtils.lerp(1.8, 0.55, factor);
    this.hemi.color.setRGB(
      THREE.MathUtils.lerp(0.79, 0.32, factor),
      THREE.MathUtils.lerp(0.91, 0.39, factor),
      THREE.MathUtils.lerp(0.94, 0.64, factor),
    );
    this.sun.intensity = THREE.MathUtils.lerp(2.8, 0.42, factor);
    this.renderer.toneMappingExposure =
      THREE.MathUtils.lerp(1.05, 0.82, factor);
  }

  render(): void {
    this.renderer.render(this.scene, this.camera);
  }

  private readonly resize = (): void => {
    const width = Math.max(1, this.canvas.clientWidth);
    const height = Math.max(1, this.canvas.clientHeight);
    this.renderer.setSize(width, height, false);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
  };
}
