import * as THREE from 'three';

export interface SceneManagerOptions {
  canvas: HTMLCanvasElement;
  clearColor?: number;
}

export class SceneManager {
  public readonly scene: THREE.Scene;
  public readonly camera: THREE.PerspectiveCamera;
  public readonly renderer: THREE.WebGLRenderer;

  public readonly sunLight: THREE.DirectionalLight;
  public readonly fillLight: THREE.DirectionalLight;
  public readonly hemisphereLight: THREE.HemisphereLight;

  private readonly cameraOffset: THREE.Vector3 = new THREE.Vector3(22, 24, 22);
  private readonly lookAtTarget: THREE.Vector3 = new THREE.Vector3(0, 0, 0);

  constructor(options: SceneManagerOptions) {
    const { canvas, clearColor = 0xa6ddf7 } = options;

    // 1. Initialize Scene & Pastel Sky Fog
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(clearColor);
    this.scene.fog = new THREE.Fog(clearColor, 40, 110);

    // 2. Setup Stylized Isometric Perspective Camera
    const aspect = window.innerWidth / Math.max(window.innerHeight, 1);
    this.camera = new THREE.PerspectiveCamera(38, aspect, 0.1, 500);
    this.camera.position.copy(this.lookAtTarget).add(this.cameraOffset);
    this.camera.lookAt(this.lookAtTarget);

    // 3. WebGLRenderer with start.ng hardware safety limit
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: false,
      powerPreference: 'high-performance',
    });

    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);

    // Shadows & Color pipeline
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;

    // 4. Soft Cartoon Lighting
    // Pastel hemisphere ambient light
    this.hemisphereLight = new THREE.HemisphereLight(0xe4f5ff, 0x889e7c, 0.85);
    this.scene.add(this.hemisphereLight);

    // Warm directional sunlight
    this.sunLight = new THREE.DirectionalLight(0xfffae8, 1.4);
    this.sunLight.position.set(18, 28, 14);
    this.sunLight.castShadow = true;
    this.sunLight.shadow.mapSize.width = 2048;
    this.sunLight.shadow.mapSize.height = 2048;
    this.sunLight.shadow.camera.near = 0.5;
    this.sunLight.shadow.camera.far = 85;

    const shadowDistance = 24;
    this.sunLight.shadow.camera.left = -shadowDistance;
    this.sunLight.shadow.camera.right = shadowDistance;
    this.sunLight.shadow.camera.top = shadowDistance;
    this.sunLight.shadow.camera.bottom = -shadowDistance;
    this.sunLight.shadow.bias = -0.0004;
    this.sunLight.shadow.radius = 2;
    this.scene.add(this.sunLight);

    // Soft sky-blue fill light to prevent black shadows
    this.fillLight = new THREE.DirectionalLight(0xa5d8f7, 0.45);
    this.fillLight.position.set(-15, 12, -15);
    this.scene.add(this.fillLight);
  }

  /**
   * Smoothly interpolates (lerps) camera position & lookAt so the player/target
   * remains centered and never leaves the viewport.
   */
  public followTarget(targetPos: THREE.Vector3, delta: number): void {
    const lerpFactor = Math.min(delta * 4.0, 1.0);

    // Lerp lookAt focal point
    this.lookAtTarget.lerp(targetPos, lerpFactor);

    // Target camera position maintaining isometric offset
    const desiredCamPos = this.lookAtTarget.clone().add(this.cameraOffset);
    this.camera.position.lerp(desiredCamPos, lerpFactor);
    this.camera.lookAt(this.lookAtTarget);

    // Keep sunlight centered around target for crisp shadow maps
    this.sunLight.position.set(
      this.lookAtTarget.x + 18,
      28,
      this.lookAtTarget.z + 14
    );
    this.sunLight.target.position.copy(this.lookAtTarget);
    this.sunLight.target.updateMatrixWorld();
  }

  public resize(width: number, height: number): void {
    if (height === 0) return;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();

    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(width, height);
  }

  public render(): void {
    this.renderer.render(this.scene, this.camera);
  }

  public add(...objects: THREE.Object3D[]): void {
    for (const obj of objects) {
      this.scene.add(obj);
    }
  }

  public remove(...objects: THREE.Object3D[]): void {
    for (const obj of objects) {
      this.scene.remove(obj);
    }
  }
}

