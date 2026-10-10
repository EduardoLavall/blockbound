import * as THREE from "three";
import { Atmosphere } from "./Atmosphere";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";

export class Renderer3D {
  readonly renderer: THREE.WebGLRenderer;
  readonly scene = new THREE.Scene();
  readonly camera: THREE.PerspectiveCamera;
  readonly viewCamera = new THREE.PerspectiveCamera(74, 1, 0.05, 8);
  readonly viewScene = new THREE.Scene();

  private readonly hemi: THREE.HemisphereLight;
  private readonly sun: THREE.DirectionalLight;
  private readonly daySky = new THREE.Color(0x89aeb2);
  private readonly nightSky = new THREE.Color(0x101426);
  private readonly skyScratch = new THREE.Color();
  private readonly atmosphere: Atmosphere;
  private factor = 0;
  private readonly composer: EffectComposer;
  effects = true;

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
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    this.renderer.info.autoReset = false;

    this.scene.background = this.daySky.clone();
    this.scene.fog = new THREE.Fog(this.daySky, 32, 85);

    this.camera = new THREE.PerspectiveCamera(74, 1, 0.05, 140);
    this.camera.position.set(0, 2.2, 7);
    this.scene.add(this.camera);
    this.viewScene.add(this.viewCamera);
    this.viewScene.add(new THREE.HemisphereLight(0xe2f2ff, 0x516e7c, 2.0));
    const viewLight = new THREE.DirectionalLight(0xfff2df, 2.0);
    viewLight.position.set(-2, 3, 2);
    this.viewScene.add(viewLight);
    this.atmosphere = new Atmosphere(this.scene);

    this.hemi = new THREE.HemisphereLight(
      0xc9e8f0,
      0x37442d,
      1.8,
    );
    this.scene.add(this.hemi);
    this.scene.add(new THREE.AmbientLight(0x8cb2c0, 0.45));

    this.sun = new THREE.DirectionalLight(0xffefc7, 2.8);
    this.sun.position.set(18, 30, 12);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(2048, 2048);
    this.sun.shadow.camera.left = -48;
    this.sun.shadow.camera.right = 48;
    this.sun.shadow.camera.top = 48;
    this.sun.shadow.camera.bottom = -48;
    this.sun.shadow.camera.far = 110;
    this.sun.shadow.normalBias = 0.04;
    this.sun.position.set(-20, 48, -26);
    this.sun.target.position.set(8, 6, 8);
    this.scene.add(this.sun.target);
    this.scene.add(this.sun);
    this.composer = new EffectComposer(this.renderer);
    this.composer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    this.composer.addPass(new RenderPass(this.scene, this.camera));
    this.composer.addPass(new UnrealBloomPass(new THREE.Vector2(1, 1), 0.42, 0.35, 1.15));
    this.composer.addPass(new OutputPass());

    window.addEventListener("resize", this.resize);
    this.resize();
  }

  setNightFactor(value: number): void {
    const factor = THREE.MathUtils.clamp(value, 0, 1);
    this.factor = factor;
    this.skyScratch.copy(this.daySky).lerp(this.nightSky, factor);

    if (this.scene.background instanceof THREE.Color) {
      this.scene.background.copy(this.skyScratch);
    }

    if (this.scene.fog instanceof THREE.Fog) {
      this.scene.fog.color.copy(this.skyScratch);
      this.scene.fog.near = THREE.MathUtils.lerp(32, 22, factor);
      this.scene.fog.far = THREE.MathUtils.lerp(85, 58, factor);
    }

    this.hemi.intensity = THREE.MathUtils.lerp(1.8, 0.95, factor);
    this.hemi.color.setRGB(
      THREE.MathUtils.lerp(0.79, 0.32, factor),
      THREE.MathUtils.lerp(0.91, 0.39, factor),
      THREE.MathUtils.lerp(0.94, 0.64, factor),
    );
    this.sun.intensity = THREE.MathUtils.lerp(2.8, 0.65, factor);
    this.renderer.toneMappingExposure =
      THREE.MathUtils.lerp(1.05, 1.05, factor);
  }

  render(): void {
    this.renderer.info.reset();
    this.atmosphere.update(this.factor, this.camera);
    if (this.effects) this.composer.render();
    else this.renderer.render(this.scene, this.camera);
    this.renderer.autoClear = false;
    this.renderer.clearDepth();
    this.renderer.render(this.viewScene, this.viewCamera);
    this.renderer.autoClear = true;
  }

  private readonly resize = (): void => {
    const width = Math.max(1, this.canvas.clientWidth);
    const height = Math.max(1, this.canvas.clientHeight);
    this.renderer.setSize(width, height, false);
    this.composer.setSize(width, height);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.viewCamera.aspect = width / height;
    this.viewCamera.updateProjectionMatrix();
  };
}
