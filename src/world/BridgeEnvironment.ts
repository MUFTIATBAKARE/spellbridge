import * as THREE from 'three';
import { WaterPlane } from '../engine/WaterPlane';

export class BridgeEnvironment {
  public readonly group: THREE.Group;
  private readonly steppingStones: THREE.Group[] = [];
  private readonly water: WaterPlane;

  constructor(water: WaterPlane) {
    this.group = new THREE.Group();
    this.water = water;
    this.buildIslands();
    this.setTargetWord('FROG');
  }

  private buildIslands(): void {
    // 1. Starting Island (low-poly stylized green plateau on the left)
    const startIsland = this.createIsland(-12, 0, 7.5, 0x58b368);
    this.group.add(startIsland);

    // 2. Destination Island across the water channel (on the right)
    const destIsland = this.createIsland(12, 0, 7.5, 0x48a858);
    this.group.add(destIsland);

    // 3. Decorative cartoon trees on starting island
    this.group.add(this.createCartoonTree(-12, 1.8, -2.5));
    this.group.add(this.createCartoonTree(-14, 1.8, 1.8));

    // 4. Decorative cartoon trees on destination island
    this.group.add(this.createCartoonTree(13, 1.8, -2.0));
    this.group.add(this.createCartoonTree(11.5, 1.8, 2.2));
  }

  private createIsland(x: number, z: number, radius: number, topColor: number): THREE.Group {
    const island = new THREE.Group();
    island.position.set(x, 0, z);

    // Low-poly cliff base
    const baseGeo = new THREE.CylinderGeometry(radius * 0.9, radius * 1.1, 4.5, 10);
    const baseMat = new THREE.MeshStandardMaterial({
      color: 0x93785b,
      roughness: 0.9,
      flatShading: true,
    });
    const baseMesh = new THREE.Mesh(baseGeo, baseMat);
    baseMesh.position.y = -0.7;
    baseMesh.castShadow = true;
    baseMesh.receiveShadow = true;
    island.add(baseMesh);

    // Vibrant cartoon grassy top
    const topGeo = new THREE.CylinderGeometry(radius, radius * 0.94, 1.1, 10);
    const topMat = new THREE.MeshStandardMaterial({
      color: topColor,
      roughness: 0.6,
      flatShading: true,
    });
    const topMesh = new THREE.Mesh(topGeo, topMat);
    topMesh.position.y = 1.5;
    topMesh.castShadow = true;
    topMesh.receiveShadow = true;
    island.add(topMesh);

    return island;
  }

  private createCartoonTree(x: number, y: number, z: number): THREE.Group {
    const tree = new THREE.Group();
    tree.position.set(x, y, z);

    // Low-poly trunk
    const trunkGeo = new THREE.CylinderGeometry(0.2, 0.32, 1.3, 6);
    const trunkMat = new THREE.MeshStandardMaterial({
      color: 0x734822,
      roughness: 0.9,
      flatShading: true,
    });
    const trunk = new THREE.Mesh(trunkGeo, trunkMat);
    trunk.position.y = 0.65;
    trunk.castShadow = true;
    tree.add(trunk);

    // Layered foliage cones
    const foliageColors = [0x3ca65c, 0x48b868, 0x56c476];
    for (let i = 0; i < 3; i++) {
      const coneGeo = new THREE.ConeGeometry(1.3 - i * 0.28, 1.15, 7);
      const coneMat = new THREE.MeshStandardMaterial({
        color: foliageColors[i],
        roughness: 0.55,
        flatShading: true,
      });
      const cone = new THREE.Mesh(coneGeo, coneMat);
      cone.position.y = 1.35 + i * 0.65;
      cone.castShadow = true;
      cone.receiveShadow = true;
      tree.add(cone);
    }

    return tree;
  }

  public setTargetWord(word: string): void {
    // Clean up existing stones
    this.steppingStones.forEach((stone) => {
      this.group.remove(stone);
    });
    this.steppingStones.length = 0;

    const letters = word.toUpperCase().split('');
    const count = letters.length;
    const spacing = Math.min(2.5, 9.5 / Math.max(count - 1, 1));
    const startX = -((count - 1) * spacing) / 2;

    letters.forEach((letter, index) => {
      const stoneGroup = this.createLetterStone(letter);
      const posX = startX + index * spacing;
      const posZ = 0;
      stoneGroup.position.set(posX, 0.4, posZ);
      this.steppingStones.push(stoneGroup);
      this.group.add(stoneGroup);
    });
  }

  private createLetterStone(letter: string): THREE.Group {
    const group = new THREE.Group();

    // Stone base block
    const stoneGeo = new THREE.BoxGeometry(1.6, 0.6, 1.6);
    const stoneMat = new THREE.MeshStandardMaterial({
      color: 0xefdfc8,
      roughness: 0.4,
      metalness: 0.05,
      flatShading: true,
    });
    const stone = new THREE.Mesh(stoneGeo, stoneMat);
    stone.castShadow = true;
    stone.receiveShadow = true;
    group.add(stone);

    // Letter canvas texture on top
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      // Golden yellow tile face
      ctx.fillStyle = '#fce7a1';
      ctx.fillRect(0, 0, 128, 128);

      // Letter border
      ctx.strokeStyle = '#d97706';
      ctx.lineWidth = 12;
      ctx.strokeRect(6, 6, 116, 116);

      // Cartoon typography
      ctx.fillStyle = '#1e3a8a';
      ctx.font = 'bold 74px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(letter, 64, 66);
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;

    const tileGeo = new THREE.PlaneGeometry(1.4, 1.4);
    tileGeo.rotateX(-Math.PI / 2);
    const tileMat = new THREE.MeshBasicMaterial({
      map: texture,
      transparent: false,
    });
    const tileMesh = new THREE.Mesh(tileGeo, tileMat);
    tileMesh.position.y = 0.31;
    group.add(tileMesh);

    return group;
  }

  public getSteppingStones(): THREE.Group[] {
    return this.steppingStones;
  }

  public update(_delta: number, elapsed: number): void {
    // Stepping stones bob gracefully with the water waves
    this.steppingStones.forEach((stone, idx) => {
      const waveH = this.water.getWaveHeight(stone.position.x, stone.position.z, elapsed);
      stone.position.y = 0.4 + waveH * 0.45;
      stone.rotation.z = Math.sin(elapsed * 2.0 + idx) * 0.025;
      stone.rotation.x = Math.cos(elapsed * 1.8 + idx) * 0.02;
    });
  }
}

