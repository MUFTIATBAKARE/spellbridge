import './style.css';
import * as THREE from 'three';
import { SceneManager } from './engine/SceneManager';
import { GameLoop } from './engine/GameLoop';
import { WaterPlane } from './engine/WaterPlane';
import { BridgeEnvironment } from './world/BridgeEnvironment';
import { StartNgService, StartNgUser } from './services/StartNgService';
import { ProfileCard } from './ui/ProfileCard';
import { BridgeManager, StoneData } from './entities/BridgeManager';
import { PlayerCharacter, HopDirection } from './entities/PlayerCharacter';
import { InstructionsModal } from './ui/InstructionsModal';
import { GameOverModal } from './ui/GameOverModal';

class SpellBridgeGame {
  private readonly sceneManager: SceneManager;
  private readonly gameLoop: GameLoop;
  private readonly water: WaterPlane;
  private readonly environment: BridgeEnvironment;
  private readonly bridgeManager: BridgeManager;
  private readonly player: PlayerCharacter;
  private readonly startNgService: StartNgService;
  private readonly profileCard: ProfileCard;
  private readonly instructionsModal: InstructionsModal;
  private readonly gameOverModal: GameOverModal;

  // Player grid position state
  // currentRow: -1 = starting island, 0..N-1 = stepping stone rows, N = destination island
  private currentRow: number = -1;
  private currentLane: number = 1; // 0: left, 1: center, 2: right
  private lastSafePosition: THREE.Vector3 = new THREE.Vector3();

  constructor() {
    const canvas = document.getElementById('webgl-canvas') as HTMLCanvasElement;
    if (!canvas) {
      throw new Error('Canvas element #webgl-canvas not found.');
    }

    // 1. Core 3D Engine & Lighting
    this.sceneManager = new SceneManager({ canvas });
    this.gameLoop = new GameLoop();

    // 2. Procedural Low-Poly Animated Water
    this.water = new WaterPlane({
      size: 80,
      segments: 44,
      color: 0x2eb8e6,
      waveSpeed: 1.5,
      waveHeight: 0.28,
    });
    this.sceneManager.add(this.water.group);

    // 3. Scenic River Environment (Islands & Pine Trees)
    this.environment = new BridgeEnvironment(this.water);
    this.sceneManager.add(this.environment.group);

    // 4. Interactive Stepping Stones & Educational Vocabulary Bridge
    this.bridgeManager = new BridgeManager(this.water);
    this.sceneManager.add(this.bridgeManager.group);

    // 5. Procedural Humanoid Player Character
    this.lastSafePosition.copy(this.bridgeManager.getStartIslandPosition());
    this.player = new PlayerCharacter(this.lastSafePosition);
    this.sceneManager.add(this.player.group);

    // 6. start.ng Platform Integration & ProfileCard HUD
    this.startNgService = StartNgService.getInstance();
    const profileContainer = document.getElementById('player-hud');
    this.profileCard = new ProfileCard({
      container: profileContainer || undefined,
      onSignIn: () => this.startNgService.signInRedirect(),
      returnUrl: window.location.origin + window.location.pathname,
    });

    this.startNgService.onUserChanged((user: StartNgUser) => {
      this.profileCard.update(user);
      this.player.updateStyle(user.style);
    });

    // 7. Modals
    this.instructionsModal = new InstructionsModal();
    this.gameOverModal = new GameOverModal();

    this.bindHUD();
    this.setupPlayerControls(canvas);
    this.setupEvents();

    // 8. Start Game Loop
    this.updateHUD();
    this.gameLoop.start();
  }

  private bindHUD(): void {
    // Instructions "?" button
    const helpBtn = document.getElementById('hud-help-btn');
    helpBtn?.addEventListener('click', () => {
      this.instructionsModal.open();
    });

    // Game state updates (hearts, streaks, word progression)
    this.bridgeManager.onStateUpdate(() => {
      this.updateHUD();
    });

    // Word completion flow
    this.bridgeManager.onWordCompleted(() => {
      this.player.setInputEnabled(false);

      // Hop to destination island
      const destPos = this.bridgeManager.getDestinationIslandPosition();
      setTimeout(() => {
        this.player.hopTo(destPos, () => {
          // Transition to next word after brief victory pause
          setTimeout(() => {
            this.bridgeManager.nextWord();
            this.resetPlayerToStartIsland();
            this.player.setInputEnabled(true);
            this.updateHUD();
          }, 1100);
        });
      }, 350);
    });

    // Game Over flow
    this.bridgeManager.onGameOver((stats) => {
      this.player.setInputEnabled(false);
      setTimeout(() => {
        this.gameOverModal.show(stats);
      }, 500);
    });

    // Play again restart handler
    this.gameOverModal.onRestart(() => {
      this.bridgeManager.resetGame();
      this.resetPlayerToStartIsland();
      this.player.setInputEnabled(true);
      this.updateHUD();
    });
  }

  private resetPlayerToStartIsland(): void {
    this.currentRow = -1;
    this.currentLane = 1;
    this.lastSafePosition.copy(this.bridgeManager.getStartIslandPosition());
    this.player.setPosition(this.lastSafePosition);
  }

  private updateHUD(): void {
    const tracker = this.bridgeManager.tracker;

    // Emoji Clue
    const emojiEl = document.getElementById('clue-emoji');
    if (emojiEl) emojiEl.textContent = tracker.emoji;

    // Lives (Hearts)
    const livesEl = document.getElementById('clue-lives');
    if (livesEl) {
      const heartsCount = Math.max(0, this.bridgeManager.currentHearts);
      livesEl.textContent = '❤️'.repeat(heartsCount) + '🖤'.repeat(3 - heartsCount);
    }

    // Streak
    const streakEl = document.getElementById('clue-streak');
    if (streakEl) streakEl.textContent = this.bridgeManager.streak.toString();

    // Word letter slots
    const slotsEl = document.getElementById('letter-slots');
    if (slotsEl) {
      slotsEl.innerHTML = '';
      const slots = tracker.getMaskedSlots();
      slots.forEach((char, idx) => {
        const slot = document.createElement('span');
        const isFilled = idx < tracker.currentIndex;
        slot.className = `letter-slot ${isFilled ? 'filled' : ''}`;
        slot.textContent = isFilled ? char : '';
        slotsEl.appendChild(slot);
      });
    }

    // Bottom Stats Panel
    const wordsEl = document.getElementById('stat-words');
    const accEl = document.getElementById('stat-accuracy');
    const bestStreakEl = document.getElementById('stat-streak');

    if (wordsEl) wordsEl.textContent = this.bridgeManager.completedWords.toString();
    if (accEl) accEl.textContent = `${this.bridgeManager.accuracy}%`;
    if (bestStreakEl) bestStreakEl.textContent = this.bridgeManager.maxStreak.toString();
  }

  private setupPlayerControls(canvas: HTMLCanvasElement): void {
    // 1. Directional Key/Swipe Hop handling
    this.player.onMoveRequest((dir: HopDirection) => {
      if (this.instructionsModal.isOpen()) return;

      const nextRow = this.currentRow + 1;
      let targetLane = this.currentLane;

      if (dir === 'left') {
        targetLane = Math.max(0, this.currentLane - 1);
      } else if (dir === 'right') {
        targetLane = Math.min(2, this.currentLane + 1);
      }

      this.attemptHopToRowAndLane(nextRow, targetLane);
    });

    // 2. Direct Tap / Click on Stepping Stone Raycasting
    const handlePointerHit = (e: MouseEvent | Touch) => {
      if (this.player.hopping || this.instructionsModal.isOpen()) return;

      const hitStone = this.bridgeManager.raycastStone(e, this.sceneManager.camera, canvas);
      if (!hitStone) return;

      // Allow stepping to next row
      if (hitStone.rowIndex === this.currentRow + 1) {
        this.attemptHopToStone(hitStone);
      }
    };

    canvas.addEventListener('click', (e: MouseEvent) => {
      handlePointerHit(e);
    });

    canvas.addEventListener(
      'touchend',
      (e: TouchEvent) => {
        if (e.changedTouches.length > 0) {
          handlePointerHit(e.changedTouches[0]);
        }
      },
      { passive: true }
    );
  }

  private attemptHopToRowAndLane(targetRow: number, targetLane: number): void {
    const stone = this.bridgeManager.getStoneAt(targetRow, targetLane);
    if (!stone) return;
    this.attemptHopToStone(stone);
  }

  private attemptHopToStone(stone: StoneData): void {
    if (this.player.hopping) return;

    // Cache safe position before hop
    const previousSafe = this.lastSafePosition.clone();
    const target = stone.worldPos.clone().setY(0.7);

    this.player.hopTo(target, () => {
      // Upon landing, evaluate spelling rule
      const result = this.bridgeManager.evaluateStep(stone);

      if (result.success) {
        // Correct step: advance progress
        this.currentRow = stone.rowIndex;
        this.currentLane = stone.laneIndex;
        this.lastSafePosition.copy(target);
      } else {
        // Wrong step: stone wobbles & sinks; bounce player back to previous safe spot
        setTimeout(() => {
          this.player.hopTo(previousSafe, () => {
            // Settled safely back on previous row or island
          });
        }, 220);
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
      this.bridgeManager.update(delta, elapsed);
      this.player.update(delta);

      // Smooth camera follow lerp: tracks player position across the bridge
      this.sceneManager.followTarget(this.player.position, delta);
    });

    // Per-frame render
    this.gameLoop.onRender(() => {
      this.sceneManager.render();
    });
  }
}

// Bootstrap once DOM is ready
window.addEventListener('DOMContentLoaded', () => {
  new SpellBridgeGame();
});
