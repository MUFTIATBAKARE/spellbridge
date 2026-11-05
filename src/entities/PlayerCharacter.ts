/**
 * PlayerCharacter.ts
 * 
 * Procedural low-poly cartoon humanoid avatar constructed entirely with
 * Three.js primitives (zero external 3D model files) mapped to player.style:
 * - primaryColor -> Hoodie/torso & shoe accents
 * - secondaryColor -> Pants/shorts
 * - skinColor & hairColor -> Head, hands, hair mesh
 * - hat -> Procedural crown, beanie, or cap
 * - accessory -> Procedural backpack or glasses
 * 
 * Features sine-interpolated hop arcs:
 *   y = Math.sin(t * Math.PI) * hopHeight
 * with cartoon squash & stretch and responsive controls (WASD, swipe, click).
 */

import * as THREE from 'three';
import { StartNgUserStyle } from '../services/StartNgService';
import { SoundFx } from '../services/SoundFx';

export type HopDirection = 'forward' | 'left' | 'right' | 'forward-left' | 'forward-right';

export class PlayerCharacter {
  public readonly group: THREE.Group;
  private readonly bodyGroup: THREE.Group;

  // Visual Meshes for Dynamic Styling
  private hoodieMesh!: THREE.Mesh;
  private pantsMesh!: THREE.Mesh;
  private headMesh!: THREE.Mesh;
  private hairMesh!: THREE.Mesh;
  private hatGroup: THREE.Group = new THREE.Group();
  private accessoryGroup: THREE.Group = new THREE.Group();
  private leftShoeMesh!: THREE.Mesh;
  private rightShoeMesh!: THREE.Mesh;

  // Hop Physics & Arc Animation
  private isHopping: boolean = false;
  private hopProgress: number = 0;
  private hopDuration: number = 0.28; // seconds
  private hopHeight: number = 1.35;
  private startPosition: THREE.Vector3 = new THREE.Vector3();
  private targetPosition: THREE.Vector3 = new THREE.Vector3();
  private onHopCompleteCallback: (() => void) | null = null;

  // Landing squash/stretch recovery
  private squashFactor: number = 1.0;
  private targetAngleY: number = Math.PI / 2; // Facing +X (towards destination island)

  // Input bindings
  private inputEnabled: boolean = true;
  private onMoveRequestCallback: ((dir: HopDirection) => void) | null = null;
  private touchStartX: number = 0;
  private touchStartY: number = 0;

  constructor(initialPosition: THREE.Vector3, style?: StartNgUserStyle) {
    this.group = new THREE.Group();
    this.group.position.copy(initialPosition);

    this.bodyGroup = new THREE.Group();
    this.group.add(this.bodyGroup);

    this.buildCharacterMesh(style);
    this.setupInputs();
  }

  public get position(): THREE.Vector3 {
    return this.group.position;
  }

  public get hopping(): boolean {
    return this.isHopping;
  }

  public setInputEnabled(enabled: boolean): void {
    this.inputEnabled = enabled;
  }

  public onMoveRequest(callback: (dir: HopDirection) => void): void {
    this.onMoveRequestCallback = callback;
  }

  /**
   * Builds procedural cartoon humanoid using Three.js primitives
   */
  private buildCharacterMesh(style?: StartNgUserStyle): void {
    const primary = new THREE.Color(style?.primaryColor || '#3b82f6');
    const secondary = new THREE.Color(style?.secondaryColor || '#f59e0b');
    const skin = new THREE.Color(style?.skinColor || '#ffd1a4');
    const hair = new THREE.Color(style?.hairColor || '#4b2810');

    // 1. Torso / Hoodie
    const hoodieGeo = new THREE.CapsuleGeometry(0.32, 0.42, 6, 8);
    const hoodieMat = new THREE.MeshStandardMaterial({
      color: primary,
      roughness: 0.5,
      flatShading: true,
    });
    this.hoodieMesh = new THREE.Mesh(hoodieGeo, hoodieMat);
    this.hoodieMesh.position.y = 0.85;
    this.hoodieMesh.castShadow = true;
    this.bodyGroup.add(this.hoodieMesh);

    // 2. Head & Face
    const headGeo = new THREE.SphereGeometry(0.3, 10, 8);
    const headMat = new THREE.MeshStandardMaterial({
      color: skin,
      roughness: 0.6,
      flatShading: true,
    });
    this.headMesh = new THREE.Mesh(headGeo, headMat);
    this.headMesh.position.y = 1.35;
    this.headMesh.castShadow = true;
    this.bodyGroup.add(this.headMesh);

    // Cartoon dot eyes
    const eyeMat = new THREE.MeshBasicMaterial({ color: 0x1e293b });
    const eyeGeo = new THREE.SphereGeometry(0.04, 6, 6);

    const leftEye = new THREE.Mesh(eyeGeo, eyeMat);
    leftEye.position.set(0.18, 1.38, 0.22);
    this.bodyGroup.add(leftEye);

    const rightEye = new THREE.Mesh(eyeGeo, eyeMat);
    rightEye.position.set(0.18, 1.38, -0.22);
    this.bodyGroup.add(rightEye);

    // 3. Hair Mesh (Stylized tuft)
    const hairGeo = new THREE.BoxGeometry(0.48, 0.25, 0.52);
    const hairMat = new THREE.MeshStandardMaterial({
      color: hair,
      roughness: 0.7,
      flatShading: true,
    });
    this.hairMesh = new THREE.Mesh(hairGeo, hairMat);
    this.hairMesh.position.set(-0.06, 1.52, 0);
    this.hairMesh.castShadow = true;
    this.bodyGroup.add(this.hairMesh);

    // 4. Pants / Legs
    const pantsGeo = new THREE.BoxGeometry(0.55, 0.38, 0.45);
    const pantsMat = new THREE.MeshStandardMaterial({
      color: secondary,
      roughness: 0.6,
      flatShading: true,
    });
    this.pantsMesh = new THREE.Mesh(pantsGeo, pantsMat);
    this.pantsMesh.position.y = 0.44;
    this.pantsMesh.castShadow = true;
    this.bodyGroup.add(this.pantsMesh);

    // 5. Shoes (with primary color accents)
    const shoeGeo = new THREE.BoxGeometry(0.24, 0.18, 0.22);
    const shoeMat = new THREE.MeshStandardMaterial({
      color: primary,
      roughness: 0.4,
      flatShading: true,
    });

    this.leftShoeMesh = new THREE.Mesh(shoeGeo, shoeMat);
    this.leftShoeMesh.position.set(0.05, 0.1, 0.15);
    this.leftShoeMesh.castShadow = true;
    this.bodyGroup.add(this.leftShoeMesh);

    this.rightShoeMesh = new THREE.Mesh(shoeGeo, shoeMat);
    this.rightShoeMesh.position.set(0.05, 0.1, -0.15);
    this.rightShoeMesh.castShadow = true;
    this.bodyGroup.add(this.rightShoeMesh);

    // 6. Arms & Hands
    const armGeo = new THREE.CapsuleGeometry(0.09, 0.32, 4, 6);
    const armMat = hoodieMat;

    const leftArm = new THREE.Mesh(armGeo, armMat);
    leftArm.position.set(0, 0.8, 0.42);
    leftArm.rotation.x = 0.2;
    this.bodyGroup.add(leftArm);

    const rightArm = new THREE.Mesh(armGeo, armMat);
    rightArm.position.set(0, 0.8, -0.42);
    rightArm.rotation.x = -0.2;
    this.bodyGroup.add(rightArm);

    // 7. Attachments: Hat & Accessory
    this.bodyGroup.add(this.hatGroup);
    this.bodyGroup.add(this.accessoryGroup);
    this.applyHat(style?.hat);
    this.applyAccessory(style?.accessory, secondary);

    // Rotate character to face forward along +X by default
    this.bodyGroup.rotation.y = this.targetAngleY;
  }

  public updateStyle(style?: StartNgUserStyle): void {
    if (!style) return;

    if (style.primaryColor) {
      const col = new THREE.Color(style.primaryColor);
      (this.hoodieMesh.material as THREE.MeshStandardMaterial).color.copy(col);
      (this.leftShoeMesh.material as THREE.MeshStandardMaterial).color.copy(col);
      (this.rightShoeMesh.material as THREE.MeshStandardMaterial).color.copy(col);
    }

    if (style.secondaryColor) {
      const secCol = new THREE.Color(style.secondaryColor);
      (this.pantsMesh.material as THREE.MeshStandardMaterial).color.copy(secCol);
      this.applyAccessory(style.accessory, secCol);
    }

    if (style.skinColor) {
      (this.headMesh.material as THREE.MeshStandardMaterial).color.set(style.skinColor);
    }

    if (style.hairColor) {
      (this.hairMesh.material as THREE.MeshStandardMaterial).color.set(style.hairColor);
    }

    this.applyHat(style.hat);
  }

  private applyHat(hat?: string): void {
    this.hatGroup.clear();

    if (hat === 'crown') {
      const crownGeo = new THREE.CylinderGeometry(0.3, 0.26, 0.16, 6);
      const crownMat = new THREE.MeshStandardMaterial({
        color: 0xf59e0b,
        metalness: 0.6,
        roughness: 0.3,
        flatShading: true,
      });
      const crown = new THREE.Mesh(crownGeo, crownMat);
      crown.position.set(-0.02, 1.68, 0);
      this.hatGroup.add(crown);
    } else if (hat === 'beanie') {
      const beanieGeo = new THREE.SphereGeometry(0.34, 8, 8);
      const beanieMat = new THREE.MeshStandardMaterial({
        color: 0xef4444,
        roughness: 0.8,
        flatShading: true,
      });
      const beanie = new THREE.Mesh(beanieGeo, beanieMat);
      beanie.position.set(-0.02, 1.58, 0);
      beanie.scale.set(1.05, 0.75, 1.05);
      this.hatGroup.add(beanie);
    } else {
      // Default: Baseball Cap
      const capGeo = new THREE.SphereGeometry(0.32, 8, 8);
      const capMat = new THREE.MeshStandardMaterial({
        color: 0x10b981,
        roughness: 0.6,
        flatShading: true,
      });
      const cap = new THREE.Mesh(capGeo, capMat);
      cap.position.set(-0.02, 1.56, 0);
      cap.scale.set(1.05, 0.6, 1.05);
      this.hatGroup.add(cap);

      // Visor
      const visorGeo = new THREE.BoxGeometry(0.24, 0.04, 0.32);
      const visor = new THREE.Mesh(visorGeo, capMat);
      visor.position.set(0.32, 1.52, 0);
      this.hatGroup.add(visor);
    }
  }

  private applyAccessory(accessory?: string, secondaryColor?: THREE.Color): void {
    this.accessoryGroup.clear();

    if (accessory === 'glasses') {
      const glassesGeo = new THREE.BoxGeometry(0.04, 0.1, 0.44);
      const glassesMat = new THREE.MeshStandardMaterial({
        color: 0x0f172a,
        roughness: 0.2,
      });
      const glasses = new THREE.Mesh(glassesGeo, glassesMat);
      glasses.position.set(0.28, 1.38, 0);
      this.accessoryGroup.add(glasses);
    } else {
      // Default / Backpack
      const packGeo = new THREE.BoxGeometry(0.22, 0.42, 0.36);
      const packMat = new THREE.MeshStandardMaterial({
        color: secondaryColor || new THREE.Color(0xf59e0b),
        roughness: 0.7,
        flatShading: true,
      });
      const pack = new THREE.Mesh(packGeo, packMat);
      pack.position.set(-0.35, 0.85, 0);
      pack.castShadow = true;
      this.accessoryGroup.add(pack);
    }
  }

  /**
   * Initiates a hop to a target world coordinate
   */
  public hopTo(target: THREE.Vector3, onComplete?: () => void): boolean {
    if (this.isHopping) return false;

    this.isHopping = true;
    this.hopProgress = 0;
    this.startPosition.copy(this.group.position);
    this.targetPosition.copy(target);
    this.onHopCompleteCallback = onComplete || null;

    // Face movement direction
    const dx = target.x - this.startPosition.x;
    const dz = target.z - this.startPosition.z;
    if (Math.abs(dx) > 0.01 || Math.abs(dz) > 0.01) {
      this.targetAngleY = Math.atan2(-dz, dx);
    }

    SoundFx.getInstance().playHop();
    return true;
  }

  /**
   * Teleports or snaps immediately to position (e.g., after wrong step recovery)
   */
  public setPosition(pos: THREE.Vector3): void {
    this.group.position.copy(pos);
    this.isHopping = false;
    this.hopProgress = 0;
    this.bodyGroup.scale.set(1, 1, 1);
  }

  /**
   * Per-frame update driving the hop arc and cartoon squash & stretch
   */
  public update(delta: number): void {
    // Smooth rotation towards target facing angle
    let angleDiff = this.targetAngleY - this.bodyGroup.rotation.y;
    while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
    while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
    this.bodyGroup.rotation.y += angleDiff * Math.min(delta * 16, 1.0);

    if (this.isHopping) {
      this.hopProgress += delta / this.hopDuration;
      const t = Math.min(this.hopProgress, 1.0);

      // 1. Horizontal lerp
      this.group.position.x = THREE.MathUtils.lerp(this.startPosition.x, this.targetPosition.x, t);
      this.group.position.z = THREE.MathUtils.lerp(this.startPosition.z, this.targetPosition.z, t);

      // 2. Parabolic vertical hop arc (sine curve)
      const baseHeight = THREE.MathUtils.lerp(this.startPosition.y, this.targetPosition.y, t);
      const arc = Math.sin(t * Math.PI) * this.hopHeight;
      this.group.position.y = baseHeight + arc;

      // 3. Cartoon squash & stretch along hop arc
      if (t < 0.5) {
        // Ascending stretch
        const stretch = 1.0 + Math.sin(t * Math.PI) * 0.22;
        this.bodyGroup.scale.set(1.0 / Math.sqrt(stretch), stretch, 1.0 / Math.sqrt(stretch));
      } else {
        // Descending preparation
        const stretch = 1.0 + Math.sin(t * Math.PI) * 0.18;
        this.bodyGroup.scale.set(1.0 / Math.sqrt(stretch), stretch, 1.0 / Math.sqrt(stretch));
      }

      // 4. On landing
      if (this.hopProgress >= 1.0) {
        this.isHopping = false;
        this.group.position.copy(this.targetPosition);
        this.squashFactor = 0.78; // Impact squash

        if (this.onHopCompleteCallback) {
          const cb = this.onHopCompleteCallback;
          this.onHopCompleteCallback = null;
          cb();
        }
      }
    } else {
      // Spring back to normal scale after landing squash
      this.squashFactor += (1.0 - this.squashFactor) * Math.min(delta * 14, 1.0);
      this.bodyGroup.scale.set(
        1.0 / Math.sqrt(this.squashFactor),
        this.squashFactor,
        1.0 / Math.sqrt(this.squashFactor)
      );
    }
  }

  private setupInputs(): void {
    // Keyboard inputs: WASD and Arrows
    window.addEventListener('keydown', (e: KeyboardEvent) => {
      if (!this.inputEnabled || this.isHopping) return;

      switch (e.code) {
        case 'ArrowUp':
        case 'KeyW':
          e.preventDefault();
          this.onMoveRequestCallback?.('forward');
          break;
        case 'ArrowLeft':
        case 'KeyA':
          e.preventDefault();
          this.onMoveRequestCallback?.('left');
          break;
        case 'ArrowRight':
        case 'KeyD':
          e.preventDefault();
          this.onMoveRequestCallback?.('right');
          break;
      }
    });

    // Touch swipe inputs
    window.addEventListener(
      'touchstart',
      (e: TouchEvent) => {
        if (!this.inputEnabled || e.touches.length === 0) return;
        this.touchStartX = e.touches[0].clientX;
        this.touchStartY = e.touches[0].clientY;
      },
      { passive: true }
    );

    window.addEventListener(
      'touchend',
      (e: TouchEvent) => {
        if (!this.inputEnabled || this.isHopping || e.changedTouches.length === 0) return;
        const dx = e.changedTouches[0].clientX - this.touchStartX;
        const dy = e.changedTouches[0].clientY - this.touchStartY;

        const absX = Math.abs(dx);
        const absY = Math.abs(dy);
        const minSwipe = 35; // px

        if (Math.max(absX, absY) > minSwipe) {
          if (absY > absX && dy < 0) {
            // Swipe Up -> Forward
            this.onMoveRequestCallback?.('forward');
          } else if (absX > absY && dx < 0) {
            // Swipe Left
            this.onMoveRequestCallback?.('left');
          } else if (absX > absY && dx > 0) {
            // Swipe Right
            this.onMoveRequestCallback?.('right');
          }
        }
      },
      { passive: true }
    );
  }
}
