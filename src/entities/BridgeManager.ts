/**
 * BridgeManager.ts
 * 
 * Manages procedural 3-lane floating stepping stones across the river channel:
 * - Spawns 3 stones per row (1 correct letter + 2 distractors from WordBank)
 * - Dynamic high-contrast canvas textures with disposal cleanup on regeneration
 * - Correct step: locks stone, glows emerald green, emits particle sparkles, advances spelling
 * - Incorrect step: wobbles and sinks into water (y -= 1.5), deducts 1 heart, bounces player back
 * - Raycasts stone clicks/taps directly to support touchscreen and mouse navigation
 */

import * as THREE from 'three';
import { WordEntry, WordProgressTracker, generateDistractorLetters, pickWordForStage } from '../data/WordBank';
import { WaterPlane } from '../engine/WaterPlane';
import { SoundFx } from '../services/SoundFx';
import { StartNgScoreStats } from '../services/StartNgService';

export interface StoneData {
  meshGroup: THREE.Group;
  stoneMesh: THREE.Mesh;
  tileMesh: THREE.Mesh;
  letter: string;
  isCorrect: boolean;
  rowIndex: number;
  laneIndex: number;
  worldPos: THREE.Vector3;
  locked: boolean;
  sinking: boolean;
  initialY: number;
}

interface Particle {
  mesh: THREE.Mesh;
  velocity: THREE.Vector3;
  life: number;
  maxLife: number;
}

export class BridgeManager {
  public readonly group: THREE.Group;
  private readonly water: WaterPlane;
  private readonly soundFx: SoundFx;

  // Word tracking & game state
  private currentStage: number = 2; // Starts at Stage 2 (4 letters, e.g. FROG)
  private wordTracker: WordProgressTracker;
  private hearts: number = 3;
  private wordsCompleted: number = 0;
  private currentStreak: number = 0;
  private bestStreak: number = 0;
  private totalAttempts: number = 0;
  private correctAttempts: number = 0;

  // Stepping stones grid: row -> lane (0: left, 1: center, 2: right)
  private stoneRows: StoneData[][] = [];
  private readonly lanesZ: number[] = [-2.2, 0, 2.2];
  private rowPositionsX: number[] = [];

  // Active particle sparkle bursts
  private particles: Particle[] = [];
  private particleGroup: THREE.Group = new THREE.Group();

  // Raycaster for click / tap selection
  private readonly raycaster: THREE.Raycaster = new THREE.Raycaster();
  private readonly mouseVector: THREE.Vector2 = new THREE.Vector2();

  // Event callbacks
  private onStateUpdateCallback: (() => void) | null = null;
  private onGameOverCallback: ((stats: StartNgScoreStats) => void) | null = null;
  private onWordCompletedCallback: ((word: WordEntry) => void) | null = null;

  constructor(water: WaterPlane) {
    this.group = new THREE.Group();
    this.water = water;
    this.soundFx = SoundFx.getInstance();

    this.group.add(this.particleGroup);

    // Initial word
    const firstWord = pickWordForStage(this.currentStage);
    this.wordTracker = new WordProgressTracker(firstWord);

    this.spawnBridgeForWord(this.wordTracker.wordEntry);
  }

  public get tracker(): WordProgressTracker {
    return this.wordTracker;
  }

  public get currentHearts(): number {
    return this.hearts;
  }

  public get completedWords(): number {
    return this.wordsCompleted;
  }

  public get streak(): number {
    return this.currentStreak;
  }

  public get maxStreak(): number {
    return this.bestStreak;
  }

  public get accuracy(): number {
    if (this.totalAttempts === 0) return 100;
    return Math.round((this.correctAttempts / this.totalAttempts) * 100);
  }

  public getStartIslandPosition(): THREE.Vector3 {
    return new THREE.Vector3(-8.5, 1.5, 0);
  }

  public getDestinationIslandPosition(): THREE.Vector3 {
    return new THREE.Vector3(8.5, 1.5, 0);
  }

  public onStateUpdate(cb: () => void): void {
    this.onStateUpdateCallback = cb;
  }

  public onGameOver(cb: (stats: StartNgScoreStats) => void): void {
    this.onGameOverCallback = cb;
  }

  public onWordCompleted(cb: (word: WordEntry) => void): void {
    this.onWordCompletedCallback = cb;
  }

  /**
   * Spawns rows of 3 floating stepping stones across the river channel
   */
  public spawnBridgeForWord(entry: WordEntry): void {
    this.clearOldBridge();
    this.wordTracker = new WordProgressTracker(entry);

    const word = entry.word.toUpperCase();
    const length = word.length;

    // Distribute rows between X = -5.0 to X = 5.0
    const spacing = Math.min(2.5, 10.0 / Math.max(length, 1));
    const startX = -((length - 1) * spacing) / 2;

    this.rowPositionsX = [];
    this.stoneRows = [];

    for (let r = 0; r < length; r++) {
      const posX = startX + r * spacing;
      this.rowPositionsX.push(posX);

      const correctLetter = word[r];
      const distractors = generateDistractorLetters(correctLetter, 2);

      // Randomize which lane holds the correct letter (0, 1, or 2)
      const correctLaneIndex = Math.floor(Math.random() * 3);
      const rowStones: StoneData[] = [];

      let distractorIdx = 0;
      for (let lane = 0; lane < 3; lane++) {
        const isCorrect = lane === correctLaneIndex;
        const letter = isCorrect ? correctLetter : distractors[distractorIdx++];
        const posZ = this.lanesZ[lane];
        const worldPos = new THREE.Vector3(posX, 0.4, posZ);

        const stoneData = this.createStone(letter, isCorrect, r, lane, worldPos);
        rowStones.push(stoneData);
        this.group.add(stoneData.meshGroup);
      }

      this.stoneRows.push(rowStones);
    }

    this.onStateUpdateCallback?.();
  }

  private createStone(
    letter: string,
    isCorrect: boolean,
    rowIndex: number,
    laneIndex: number,
    worldPos: THREE.Vector3
  ): StoneData {
    const meshGroup = new THREE.Group();
    meshGroup.position.copy(worldPos);

    // Stone base mesh
    const stoneGeo = new THREE.BoxGeometry(1.6, 0.6, 1.6);
    const stoneMat = new THREE.MeshStandardMaterial({
      color: 0xefdfc8,
      roughness: 0.4,
      metalness: 0.05,
      flatShading: true,
    });
    const stoneMesh = new THREE.Mesh(stoneGeo, stoneMat);
    stoneMesh.castShadow = true;
    stoneMesh.receiveShadow = true;
    meshGroup.add(stoneMesh);

    // Canvas letter texture
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d')!;

    // High contrast tile face
    ctx.fillStyle = '#fef3c7';
    ctx.fillRect(0, 0, 128, 128);

    ctx.strokeStyle = '#d97706';
    ctx.lineWidth = 14;
    ctx.strokeRect(7, 7, 114, 114);

    ctx.fillStyle = '#1e3a8a';
    ctx.font = 'bold 78px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(letter, 64, 67);

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;

    const tileGeo = new THREE.PlaneGeometry(1.4, 1.4);
    tileGeo.rotateX(-Math.PI / 2);
    const tileMat = new THREE.MeshStandardMaterial({
      map: texture,
      roughness: 0.3,
    });
    const tileMesh = new THREE.Mesh(tileGeo, tileMat);
    tileMesh.position.y = 0.31;
    meshGroup.add(tileMesh);

    const stoneData: StoneData = {
      meshGroup,
      stoneMesh,
      tileMesh,
      letter,
      isCorrect,
      rowIndex,
      laneIndex,
      worldPos,
      locked: false,
      sinking: false,
      initialY: worldPos.y,
    };

    // Store metadata on mesh for raycasting
    stoneMesh.userData = stoneData;
    tileMesh.userData = stoneData;

    return stoneData;
  }

  /**
   * Evaluates player stepping on a specific stone.
   * Returns true if correct, false if wrong.
   */
  public evaluateStep(stone: StoneData): {
    success: boolean;
    wordComplete: boolean;
    gameOver: boolean;
  } {
    this.totalAttempts++;

    if (stone.isCorrect) {
      this.correctAttempts++;
      this.currentStreak++;
      if (this.currentStreak > this.bestStreak) {
        this.bestStreak = this.currentStreak;
      }

      // Lock & glow green
      stone.locked = true;
      (stone.stoneMesh.material as THREE.MeshStandardMaterial).color.set(0x4ade80);
      (stone.stoneMesh.material as THREE.MeshStandardMaterial).emissive.set(0x16a34a);
      (stone.stoneMesh.material as THREE.MeshStandardMaterial).emissiveIntensity = 0.45;

      this.soundFx.playCorrect(stone.rowIndex);
      this.spawnSparkleBurst(stone.meshGroup.position);

      const check = this.wordTracker.checkLetter(stone.letter);
      const wordFinished = check.isComplete;

      if (wordFinished) {
        this.wordsCompleted++;
        this.soundFx.playVictory();
        this.onWordCompletedCallback?.(this.wordTracker.wordEntry);
      }

      this.onStateUpdateCallback?.();
      return { success: true, wordComplete: wordFinished, gameOver: false };
    } else {
      // Incorrect step: deduct heart and sink stone
      this.currentStreak = 0;
      this.hearts--;
      stone.sinking = true;

      this.soundFx.playWrong();
      this.onStateUpdateCallback?.();

      if (this.hearts <= 0) {
        this.soundFx.playGameOver();
        const stats: StartNgScoreStats = {
          words_spelled: this.wordsCompleted,
          accuracy: this.accuracy,
          best_streak: this.bestStreak,
        };
        this.onGameOverCallback?.(stats);
        return { success: false, wordComplete: false, gameOver: true };
      }

      return { success: false, wordComplete: false, gameOver: false };
    }
  }

  /**
   * Finds the stone at given row and lane
   */
  public getStoneAt(row: number, lane: number): StoneData | null {
    if (row < 0 || row >= this.stoneRows.length) return null;
    return this.stoneRows[row][lane] || null;
  }

  public getRowTargetPosition(row: number, lane: number = 1): THREE.Vector3 {
    const stone = this.getStoneAt(row, lane);
    if (stone) {
      return stone.worldPos.clone().setY(0.65);
    }
    return new THREE.Vector3(this.rowPositionsX[row] || 0, 0.65, this.lanesZ[lane]);
  }

  /**
   * Raycasts a pointer event from the camera to detect direct stone clicks/taps
   */
  public raycastStone(
    event: MouseEvent | Touch,
    camera: THREE.Camera,
    canvas: HTMLCanvasElement
  ): StoneData | null {
    const rect = canvas.getBoundingClientRect();
    this.mouseVector.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouseVector.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.mouseVector, camera);

    const stoneMeshes: THREE.Object3D[] = [];
    this.stoneRows.forEach((row) => {
      row.forEach((stone) => {
        stoneMeshes.push(stone.stoneMesh, stone.tileMesh);
      });
    });

    const intersects = this.raycaster.intersectObjects(stoneMeshes, false);
    if (intersects.length > 0) {
      const hit = intersects[0].object;
      if (hit.userData && hit.userData.letter) {
        return hit.userData as StoneData;
      }
    }

    return null;
  }

  /**
   * Spawns celebratory sparkles when stepping correctly
   */
  private spawnSparkleBurst(center: THREE.Vector3): void {
    const colors = [0xfef08a, 0x86efac, 0x67e8f9, 0xfca5a5];
    const count = 14;

    for (let i = 0; i < count; i++) {
      const geo = new THREE.TetrahedronGeometry(0.12, 0);
      const mat = new THREE.MeshBasicMaterial({
        color: colors[i % colors.length],
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.copy(center).add(new THREE.Vector3(0, 0.5, 0));

      const angle = Math.random() * Math.PI * 2;
      const speed = 2.0 + Math.random() * 2.5;
      const velocity = new THREE.Vector3(
        Math.cos(angle) * speed,
        2.5 + Math.random() * 3.0,
        Math.sin(angle) * speed
      );

      this.particleGroup.add(mesh);
      this.particles.push({
        mesh,
        velocity,
        life: 0,
        maxLife: 0.6 + Math.random() * 0.25,
      });
    }
  }

  /**
   * Advances game to next word
   */
  public nextWord(): void {
    // Increase stage gradually as more words are completed
    if (this.wordsCompleted >= 6) {
      this.currentStage = 4; // 6-letter words
    } else if (this.wordsCompleted >= 3) {
      this.currentStage = 3; // 5-letter words
    } else {
      this.currentStage = 2; // 4-letter words
    }

    const next = pickWordForStage(this.currentStage, [this.wordTracker.word]);
    this.spawnBridgeForWord(next);
  }

  /**
   * Resets game to fresh 3 hearts and initial state
   */
  public resetGame(): void {
    this.hearts = 3;
    this.wordsCompleted = 0;
    this.currentStreak = 0;
    this.totalAttempts = 0;
    this.correctAttempts = 0;
    this.currentStage = 2;

    const firstWord = pickWordForStage(this.currentStage);
    this.spawnBridgeForWord(firstWord);
  }

  /**
   * Disposes geometries and textures of old stones to avoid memory leaks
   */
  private clearOldBridge(): void {
    this.stoneRows.forEach((row) => {
      row.forEach((stone) => {
        this.group.remove(stone.meshGroup);

        stone.stoneMesh.geometry.dispose();
        (stone.stoneMesh.material as THREE.Material).dispose();

        stone.tileMesh.geometry.dispose();
        const tileMat = stone.tileMesh.material as THREE.MeshStandardMaterial;
        if (tileMat.map) tileMat.map.dispose();
        tileMat.dispose();
      });
    });
    this.stoneRows = [];
  }

  /**
   * Per-frame updates driving wave floating, sinking wobble, and particles
   */
  public update(delta: number, elapsed: number): void {
    // 1. Update stepping stone motion
    this.stoneRows.forEach((row) => {
      row.forEach((stone) => {
        if (stone.sinking) {
          // Sink below water plane
          stone.meshGroup.position.y += (-1.8 - stone.meshGroup.position.y) * Math.min(delta * 4, 1.0);
          stone.meshGroup.rotation.z = Math.sin(elapsed * 25) * 0.15;
          stone.meshGroup.rotation.x = Math.cos(elapsed * 20) * 0.15;
        } else {
          // Bob with procedural water waves
          const waveH = this.water.getWaveHeight(stone.worldPos.x, stone.worldPos.z, elapsed);
          stone.meshGroup.position.y = stone.initialY + waveH * 0.45;
          stone.meshGroup.rotation.z = Math.sin(elapsed * 2.0 + stone.rowIndex) * 0.025;
          stone.meshGroup.rotation.x = Math.cos(elapsed * 1.8 + stone.laneIndex) * 0.02;
        }
      });
    });

    // 2. Update celebratory particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life += delta;

      if (p.life >= p.maxLife) {
        this.particleGroup.remove(p.mesh);
        p.mesh.geometry.dispose();
        (p.mesh.material as THREE.Material).dispose();
        this.particles.splice(i, 1);
        continue;
      }

      // Physics integration
      p.velocity.y -= 9.8 * delta; // Gravity
      p.mesh.position.addScaledVector(p.velocity, delta);
      p.mesh.rotation.x += delta * 6;
      p.mesh.rotation.y += delta * 7;

      const progress = p.life / p.maxLife;
      p.mesh.scale.setScalar(1.0 - progress);
    }
  }

  public destroy(): void {
    this.clearOldBridge();
    this.particles.forEach((p) => {
      this.particleGroup.remove(p.mesh);
      p.mesh.geometry.dispose();
      (p.mesh.material as THREE.Material).dispose();
    });
    this.particles = [];
  }
}
