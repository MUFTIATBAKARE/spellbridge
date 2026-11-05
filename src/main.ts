import './style.css';
import * as THREE from 'three';
import { SceneManager } from './engine/SceneManager';
import { GameLoop } from './engine/GameLoop';
import { WaterPlane } from './engine/WaterPlane';
import { BridgeEnvironment } from './world/BridgeEnvironment';
import { StartNgBridge, StartNgUser } from './startng/StartNgBridge';

class SpellBridgeApp {
  private readonly sceneManager: SceneManager;
  private readonly gameLoop: GameLoop;
  private readonly water: WaterPlane;
  private readonly environment: BridgeEnvironment;
  private readonly startNgBridge: StartNgBridge;

  // Tracking target for smooth isometric camera follow
  private readonly cameraTarget: THREE.Vector3 = new THREE.Vector3(0, 0, 0);

  constructor() {
    const canvas = document.getElementById('webgl-canvas') as HTMLCanvasElement;
    if (!canvas) {
      throw new Error('Canvas element #webgl-canvas not found.');
    }

    // 1. Initialize Scene & Renderer with clamped pixel ratio and lighting
    this.sceneManager = new SceneManager({ canvas });

    // 2. Initialize Clamped Delta-timed Game Loop
    this.gameLoop = new GameLoop();

    // 3. Add Stylized Procedural Low-Poly Water
    this.water = new WaterPlane({
      size: 80,
      segments: 44,
      color: 0x2eb8e6,
      waveSpeed: 1.5,
      waveHeight: 0.28,
    });
    this.sceneManager.add(this.water.group);

    // 4. Add Scenic River Environment (Islands, Trees & Letter Bridge)
    this.environment = new BridgeEnvironment(this.water);
    this.sceneManager.add(this.environment.group);

    // 5. Connect start.ng Platform Integration
    this.startNgBridge = new StartNgBridge();
    this.bindStartNgUI();

    // 6. Setup Frame Updates, Resizing & Camera Lerp
    this.setupEvents();

    // 7. Start the Animation Loop
    this.gameLoop.start();
  }

  private bindStartNgUI(): void {
    const nameEl = document.getElementById('player-name');
    const handleEl = document.getElementById('player-handle');
    const avatarEl = document.getElementById('player-avatar');
    const playerHud = document.getElementById('player-hud');

    this.startNgBridge.onUserChanged((user: StartNgUser) => {
      if (nameEl) nameEl.textContent = user.name;
      if (handleEl) handleEl.textContent = `@${user.account}`;

      if (avatarEl) {
        // Safe fallback: use image if valid URL, otherwise colored initial badge
        if (user.face && (user.face.startsWith('http') || user.face.startsWith('data:'))) {
          avatarEl.innerHTML = '';
          const img = document.createElement('img');
          img.src = user.face;
          img.alt = user.name;
          img.style.width = '100%';
          img.style.height = '100%';
          img.style.objectFit = 'cover';
          img.onerror = () => {
            avatarEl.textContent = user.name.slice(0, 1).toUpperCase();
          };
          avatarEl.appendChild(img);
        } else {
          avatarEl.textContent = user.face || (user.guest ? '✨' : user.name.slice(0, 1).toUpperCase());
        }

        if (user.style?.primaryColor) {
          avatarEl.style.backgroundColor = user.style.primaryColor;
        }
      }

      if (user.guest && playerHud) {
        playerHud.style.cursor = 'pointer';
        playerHud.title = 'Click to sign in to start.ng';
        playerHud.onclick = () => this.startNgBridge.signInRedirect();
      } else if (playerHud) {
        playerHud.style.cursor = 'default';
        playerHud.onclick = null;
      }
    });
  }

  private setupEvents(): void {
    // Window Resize Handling
    this.gameLoop.onResize((width, height) => {
      this.sceneManager.resize(width, height);
    });

    // Per-frame game updates (delta timing)
    this.gameLoop.onUpdate((delta, elapsed) => {
      this.water.update(delta, elapsed);
      this.environment.update(delta, elapsed);

      // Smooth camera sway across the bridge to showcase isometric follow
      const sweepX = Math.sin(elapsed * 0.45) * 4.0;
      this.cameraTarget.set(sweepX, 0.4, 0);
      this.sceneManager.followTarget(this.cameraTarget, delta);
    });

    // Per-frame render
    this.gameLoop.onRender(() => {
      this.sceneManager.render();
    });
  }
}

// Bootstrap on DOM ready
window.addEventListener('DOMContentLoaded', () => {
  new SpellBridgeApp();
});

