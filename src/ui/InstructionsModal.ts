/**
 * InstructionsModal.ts
 * 
 * Educational instruction modal explaining the rules and controls of SpellBridge 3D:
 * - How to spell words letter-by-letter across the river
 * - Keyboard (WASD/Arrows), Touch Swipe, and Direct Tap controls
 * - Heart penalties, sinking stones, and bridge completion
 */

export class InstructionsModal {
  private readonly modalEl: HTMLElement;

  constructor() {
    this.modalEl = document.createElement('div');
    this.modalEl.id = 'instructions-modal';
    this.modalEl.className = 'modal-backdrop';
    this.modalEl.style.display = 'none';

    this.modalEl.innerHTML = `
      <div class="modal-card">
        <div class="modal-header">
          <div class="modal-icon">🌉</div>
          <h2 class="modal-title">How to Play SpellBridge 3D</h2>
          <button class="modal-close-btn" id="instructions-close-x" aria-label="Close">&times;</button>
        </div>

        <div class="modal-body">
          <div class="instruction-step">
            <span class="step-num">1</span>
            <div class="step-text">
              <strong>Check the Word Clue:</strong> Look at the top-center clue banner for the emoji clue and missing letter slots (e.g. 🐸 <code>F R _ G</code>).
            </div>
          </div>

          <div class="instruction-step">
            <span class="step-num">2</span>
            <div class="step-text">
              <strong>Hop to Spell:</strong> Find the correct next letter on the river stepping stones and hop to it!
            </div>
          </div>

          <div class="instruction-step">
            <span class="step-num">3</span>
            <div class="step-text">
              <strong>Watch Your Step:</strong> Correct letters lock the stone in emerald green. Wrong letters wobble, sink into the water, and cost 1 heart (❤️).
            </div>
          </div>

          <div class="controls-section">
            <h3 class="controls-title">🎮 Controls</h3>
            <div class="controls-grid">
              <div class="control-item">
                <span class="control-key">W / ↑</span>
                <span class="control-desc">Hop forward</span>
              </div>
              <div class="control-item">
                <span class="control-key">A / D / ← / →</span>
                <span class="control-desc">Hop left / right</span>
              </div>
              <div class="control-item">
                <span class="control-key">Tap / Click</span>
                <span class="control-desc">Click any stone directly</span>
              </div>
              <div class="control-item">
                <span class="control-key">Swipe</span>
                <span class="control-desc">Swipe on touchscreen</span>
              </div>
            </div>
          </div>
        </div>

        <div class="modal-footer">
          <button class="modal-primary-btn" id="instructions-play-btn">Let's Play!</button>
        </div>
      </div>
    `;

    document.body.appendChild(this.modalEl);

    // Bind close events
    const closeX = this.modalEl.querySelector('#instructions-close-x');
    const playBtn = this.modalEl.querySelector('#instructions-play-btn');

    closeX?.addEventListener('click', () => this.close());
    playBtn?.addEventListener('click', () => this.close());

    this.modalEl.addEventListener('click', (e) => {
      if (e.target === this.modalEl) {
        this.close();
      }
    });

    // Close on Escape key
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.isOpen()) {
        this.close();
      }
    });
  }

  public open(): void {
    this.modalEl.style.display = 'flex';
  }

  public close(): void {
    this.modalEl.style.display = 'none';
  }

  public isOpen(): boolean {
    return this.modalEl.style.display !== 'none';
  }
}
