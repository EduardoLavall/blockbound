import * as THREE from "three";

/** A single sky draw call: gradient, horizon haze, sun, moon and stars. */
export class Atmosphere {
  private readonly material = new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: { night: { value: 0 } },
    vertexShader: `varying vec3 vDirection;
      void main() { vDirection = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: `varying vec3 vDirection; uniform float night;
      float hash(vec3 p) { return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453); }
      void main() {
        vec3 d = normalize(vDirection);
        float h = smoothstep(-0.12, 0.85, d.y);
        vec3 day = mix(vec3(0.77, 0.83, 0.69), vec3(0.16, 0.47, 0.67), h);
        vec3 dark = mix(vec3(0.10, 0.16, 0.22), vec3(0.015, 0.025, 0.075), h);
        vec3 color = mix(day, dark, night);
        float sun = dot(d, normalize(vec3(-0.5, 0.55, -0.65)));
        color += vec3(1.0, 0.73, 0.34) * (pow(max(sun, 0.0), 150.0) * 0.45 + smoothstep(0.9985, 0.999, sun)) * (1.0-night);
        float moon = dot(d, normalize(vec3(0.55, 0.65, -0.35)));
        color += vec3(0.59, 0.79, 0.95) * smoothstep(0.997, 0.999, moon) * night;
        vec3 cell = floor(d * 280.0);
        float stars = step(0.997, hash(cell)) * pow(hash(cell + 9.0), 2.0) * smoothstep(0.03, 0.3, d.y);
        color += vec3(stars * night);
        gl_FragColor = vec4(color, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  });
  private readonly dome = new THREE.Mesh(new THREE.SphereGeometry(110, 24, 16), this.material);
  constructor(scene: THREE.Scene) {
    this.dome.name = "atmosphere";
    this.dome.renderOrder = -100;
    scene.add(this.dome);
  }
  update(night: number, camera: THREE.Camera): void {
    this.material.uniforms.night!.value = night;
    this.dome.position.copy(camera.position);
  }
}
