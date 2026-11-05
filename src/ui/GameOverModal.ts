/**
 * GameOverModal.ts
 * 
 * Round completion / Game Over modal:
 * - Summarizes Words Completed, Accuracy %, and Best Streak
 * - Submits stats to start.ng cloud via StartNgService
 * - Fetches and renders the Top 10 start.ng leaderboard
 * - CRITICAL UI RULE ENFORCED: Leaderboard entries use colored circular initial badges
 *   (entry.color)—NEVER an <img> tag!
 * - Share on X integration: opens https://twitter.com/intent/tweet per start.ng standards
 * - Features "Play Again" action to restart round
 */

import { StartNgService, StartNgScoreStats, LeaderboardEntry } from '../services/StartNgService';

export class GameOverModal {
  private readonly modalEl: HTMLElement;
  private readonly wordsSpelledEl: HTMLElement;
  private readonly accuracyEl: HTMLElement;
  private readonly streakEl: HTMLElement;
  private readonly leaderboardListEl: HTMLElement;
  private readonly playAgainBtn: HTMLButtonElement;
  private onRestartCallback: (() => void) | null = null;

  constructor() {
    this.modalEl = document.createElement('div');
    this.modalEl.id = 'game-over-modal';
    this.modalEl.className = 'modal-backdrop';
    this.modalEl.style.display = 'none';

    this.modalEl.innerHTML = `
      <div class="modal-card game-over-card">
        <div class="modal-header">
          <div class="modal-icon">🌊</div>
          <h2 class="modal-title">Round Over!</h2>
        </div>

        <div class="round-stats-grid">
          <div class="round-stat-card">
            <span class="round-stat-label">Words Spelled</span>
            <span class="round-stat-val" id="go-words">0</span>
          </div>
          <div class="round-stat-card">
            <span class="round-stat-label">Accuracy</span>
            <span class="round-stat-val" id="go-accuracy">100%</span>
          </div>
          <div class="round-stat-card">
            <span class="round-stat-label">Best Streak</span>
            <span class="round-stat-val" id="go-streak">0</span>
          </div>
        </div>

        <div class="leaderboard-section">
          <div class="leaderboard-header">
            <span class="lb-title">🏆 start.ng Leaderboard</span>
            <span class="lb-subtitle">Top River Explorers</span>
          </div>
          <div class="leaderboard-list" id="go-leaderboard-list">
            <div class="lb-loading">Loading top rankings...</div>
          </div>
        </div>

        <div class="modal-footer">
          <button class="modal-secondary-btn share-btn" id="go-share-btn">Share on 𝕏</button>
          <button class="modal-primary-btn play-again-btn" id="go-play-again-btn">Play Again</button>
        </div>
      </div>
    `;

    document.body.appendChild(this.modalEl);

    this.wordsSpelledEl = this.modalEl.querySelector('#go-words') as HTMLElement;
    this.accuracyEl = this.modalEl.querySelector('#go-accuracy') as HTMLElement;
    this.streakEl = this.modalEl.querySelector('#go-streak') as HTMLElement;
    this.leaderboardListEl = this.modalEl.querySelector('#go-leaderboard-list') as HTMLElement;
    this.playAgainBtn = this.modalEl.querySelector('#go-play-again-btn') as HTMLButtonElement;

    // start.ng Game Standard: Let players share their result on X
    const shareBtn = this.modalEl.querySelector('#go-share-btn');
    shareBtn?.addEventListener('click', () => {
      const words = this.wordsSpelledEl.textContent || '0';
      const acc = this.accuracyEl.textContent || '100%';
      const streak = this.streakEl.textContent || '0';
      const text = encodeURIComponent(`I just spelled ${words} words with ${acc} accuracy in SpellBridge 3D! Can you beat my streak of ${streak}? 🌉🌊`);
      const url = encodeURIComponent('https://spellbridge.start.ng');
      const shareUrl = `https://twitter.com/intent/tweet?text=${text}&url=${url}`;
      window.open(shareUrl, '_blank', 'noopener,noreferrer');
    });

    this.playAgainBtn.addEventListener('click', () => {
      this.close();
      this.onRestartCallback?.();
    });
  }

  public onRestart(cb: () => void): void {
    this.onRestartCallback = cb;
  }

  /**
   * Displays modal, uploads scores to start.ng, and populates live leaderboard
   */
  public async show(stats: StartNgScoreStats): Promise<void> {
    this.wordsSpelledEl.textContent = stats.words_spelled.toString();
    this.accuracyEl.textContent = `${stats.accuracy}%`;
    this.streakEl.textContent = stats.best_streak.toString();

    this.modalEl.style.display = 'flex';

    const service = StartNgService.getInstance();

    // 1. Submit stats to start.ng cloud for signed-in player
    service.submitScore(stats);

    // 2. Fetch and render leaderboard entries
    this.leaderboardListEl.innerHTML = '<div class="lb-loading">Loading top rankings...</div>';

    try {
      const entries = await service.fetchLeaderboard(10);
      this.renderLeaderboard(entries);
    } catch (err) {
      this.leaderboardListEl.innerHTML = '<div class="lb-empty">Leaderboard currently unavailable</div>';
    }
  }

  /**
   * Renders leaderboard entries strictly using colored circular initial badges.
   * NEVER renders an <img> tag per start.ng platform directives.
   */
  private renderLeaderboard(entries: LeaderboardEntry[]): void {
    if (!entries || entries.length === 0) {
      this.leaderboardListEl.innerHTML = '<div class="lb-empty">No scores recorded yet. Be the first!</div>';
      return;
    }

    this.leaderboardListEl.innerHTML = '';

    entries.forEach((entry, idx) => {
      const rank = entry.rank || idx + 1;
      const initial = (entry.name && entry.name.length > 0) ? entry.name.charAt(0).toUpperCase() : '⭐';
      const badgeColor = entry.color || '#3b82f6';

      let medal = '';
      if (rank === 1) medal = '🥇';
      else if (rank === 2) medal = '🥈';
      else if (rank === 3) medal = '🥉';

      const row = document.createElement('div');
      row.className = `lb-row ${rank <= 3 ? 'lb-top' : ''}`;

      row.innerHTML = `
        <span class="lb-rank">${medal || `#${rank}`}</span>
        <span class="lb-initial-badge" style="background-color: ${badgeColor};">${initial}</span>
        <div class="lb-player-info">
          <span class="lb-player-name">${this.escapeHtml(entry.name || 'Explorer')}</span>
          <span class="lb-player-sub">${entry.stats?.words_spelled || 0} words • ${entry.stats?.accuracy || 100}% acc</span>
        </div>
        <div class="lb-score-pill">
          🔥 ${entry.stats?.best_streak || 0}
        </div>
      `;

      this.leaderboardListEl.appendChild(row);
    });
  }

  private escapeHtml(str: string): string {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  public close(): void {
    this.modalEl.style.display = 'none';
  }
}
