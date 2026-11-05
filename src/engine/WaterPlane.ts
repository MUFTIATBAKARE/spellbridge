import * as THREE from 'three';

export interface WaterPlaneOptions {
  size?: number;
  segments?: number;
  color?: number;
  deepColor?: number;
  waveSpeed?: number;
  waveHeight?: number;
}

export class WaterPlane {
  public readonly mesh: THREE.Mesh;
  public readonly group: THREE.Group;
  private readonly geometry: THREE.PlaneGeometry;
  private readonly material: THREE.MeshStandardMaterial;

  private readonly initialPositions: Float32Array;
  private readonly waveSpeed: number;
  private readonly waveHeight: number;

  constructor(options: WaterPlaneOptions = {}) {
    const {
      size = 80,
      segments = 44,
      color = 0x2eb8e6,
      deepColor = 0x146b96,
      waveSpeed = 1.5,
      waveHeight = 0.28,
    } = options;

    this.group = new THREE.Group();
    this.waveSpeed = waveSpeed;
    this.waveHeight = waveHeight;

    // 1. Procedural Surface Plane Geometry
    this.geometry = new THREE.PlaneGeometry(size, size, segments, segments);
    this.geometry.rotateX(-Math.PI / 2);

    // Cache initial coordinate array for fast vertex displacement
    const posAttribute = this.geometry.attributes.position as THREE.BufferAttribute;
    this.initialPositions = new Float32Array(posAttribute.array);

    // 2. Stylized Low-Poly Cartoon Water Material
    this.material = new THREE.MeshStandardMaterial({
      color,
      roughness: 0.15,
      metalness: 0.05,
      transparent: true,
      opacity: 0.88,
      flatShading: true, // Key for stylized cartoon faceted look
    });

    this.mesh = new THREE.Mesh(this.geometry, this.material);
    this.mesh.receiveShadow = true;
    this.group.add(this.mesh);

    // 3. Deep Water Bed Plane for visual richness underneath
    const bedGeometry = new THREE.PlaneGeometry(size * 1.1, size * 1.1);
    bedGeometry.rotateX(-Math.PI / 2);
    const bedMaterial = new THREE.MeshStandardMaterial({
      color: deepColor,
      roughness: 0.9,
      metalness: 0.0,
      flatShading: true,
    });
    const bedMesh = new THREE.Mesh(bedGeometry, bedMaterial);
    bedMesh.position.y = -3.2;
    this.group.add(bedMesh);
  }

  /**
   * Procedural multi-harmonic wave formula at given world coordinates and timestamp.
   * Can be queried by stepping stones, floating logs, and avatars.
   */
  public getWaveHeight(x: number, z: number, elapsed: number): number {
    const t = elapsed * this.waveSpeed;
    const wave1 = Math.sin(x * 0.35 + t) * this.waveHeight;
    const wave2 = Math.cos(z * 0.30 + t * 0.85) * (this.waveHeight * 0.65);
    const wave3 = Math.sin((x + z) * 0.22 + t * 1.25) * (this.waveHeight * 0.35);
    return wave1 + wave2 + wave3;
  }

  /**
   * Updates water surface vertices dynamically every frame
   */
  public update(_delta: number, elapsed: number): void {
    const posAttribute = this.geometry.attributes.position as THREE.BufferAttribute;
    const array = posAttribute.array as Float32Array;
    const count = posAttribute.count;

    for (let i = 0; i < count; i++) {
      const idx = i * 3;
      const x = this.initialPositions[idx];
      const z = this.initialPositions[idx + 2];

      // Displace Y coordinate with animated procedural wave
      array[idx + 1] = this.getWaveHeight(x, z, elapsed);
    }

    posAttribute.needsUpdate = true;
    this.geometry.computeVertexNormals();
  }

  public dispose(): void {
    this.geometry.dispose();
    this.material.dispose();
  }
}

