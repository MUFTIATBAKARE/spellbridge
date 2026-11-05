import './style.css';
import * as THREE from 'three';
import { SceneManager } from './engine/SceneManager';
import { GameLoop } from './engine/GameLoop';
import { WaterPlane } from './engine/WaterPlane';
import { BridgeEnvironment } from './world/BridgeEnvironment';
import { StartNgService, StartNgUser } from './services/StartNgService';
import { ProfileCard } from './ui/ProfileCard';
import { pickWordForStage, WordProgressTracker, WordEntry } from './data/WordBank';

class SpellBridgeApp {
  private readonly sceneManager: SceneManager;
  private readonly gameLoop: GameLoop;
  private readonly water: WaterPlane;
  private readonly environment: BridgeEnvironment;
  private readonly startNgService: StartNgService;
  private readonly profileCard: ProfileCard;
  private readonly wordTracker: WordProgressTracker;

  // Tracking target for smooth isometric camera follow
  private readonly cameraTarget: THREE.Vector3 = new THREE.Vector3(0, 0, 0);

  constructor() {
    const canvas = document.getElementById('webgl-canvas') as HTMLCanvasElement;
    if (!canvas) {
      throw new Error('Canvas element #webgl-canvas not found.');
    }

    // 1. Initialize Scene & Renderer with clamped pixel ratio and soft cartoon lighting
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

    // 4. Initialize Educational Vocabulary Engine (Stage 2: 4-Letter Word e.g. FROG)
    const initialWord: WordEntry = pickWordForStage(2);
    this.wordTracker = new WordProgressTracker(initialWord);

    // 5. Add Scenic River Environment with Stepping Stones for Current Word
    this.environment = new BridgeEnvironment(this.water);
    this.environment.setTargetWord(this.wordTracker.word);
    this.sceneManager.add(this.environment.group);

    // 6. Connect start.ng Platform Integration & Floating ProfileCard
    this.startNgService = StartNgService.getInstance();
    
    const profileContainer = document.getElementById('player-hud');
    this.profileCard = new ProfileCard({
      container: profileContainer || undefined,
      onSignIn: () => this.startNgService.signInRedirect(),
      returnUrl: window.location.origin + window.location.pathname,
    });

    this.startNgService.onUserChanged((user: StartNgUser) => {
      this.profileCard.update(user);
    });

    // 7. Render Word Clue HUD (Emoji, masked slots, streak)
    this.renderWordClueHUD();

    // 8. Setup Frame Updates, Resizing & Camera Lerp
    this.setupEvents();

    // 9. Start the Animation Loop
    this.gameLoop.start();
  }

  private renderWordClueHUD(): void {
    const emojiEl = document.getElementById('clue-emoji');
    const slotsEl = document.getElementById('letter-slots');

    if (emojiEl) {
      emojiEl.textContent = this.wordTracker.emoji;
    }

    if (slotsEl) {
      slotsEl.innerHTML = '';
      const slots = this.wordTracker.getMaskedSlots();
      slots.forEach((char, index) => {
        const slot = document.createElement('span');
        const isFilled = index < this.wordTracker.currentIndex;
        slot.className = `letter-slot ${isFilled ? 'filled' : ''}`;
        slot.textContent = isFilled ? char : '';
        slotsEl.appendChild(slot);
      });
    }
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
      const sweepX = Math.sin(elapsed * 0.45) * 3.5;
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
