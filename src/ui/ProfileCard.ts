/**
 * ProfileCard.ts
 * 
 * Floating HUD player card showing avatar face, name, @account handle,
 * and a "Sign In" button with return_to parameter when playing in guest mode.
 * 
 * Handles missing/empty avatar URLs cleanly without leaking broken <img> tags
 * or raw template strings.
 */

import { StartNgUser } from '../services/StartNgService';

export interface ProfileCardOptions {
  container?: HTMLElement;
  onSignIn?: () => void;
  returnUrl?: string;
}

export class ProfileCard {
  public readonly element: HTMLElement;
  private readonly avatarContainer: HTMLElement;
  private readonly nameElement: HTMLElement;
  private readonly handleElement: HTMLElement;
  private readonly signInButton: HTMLAnchorElement;
  private onSignInCallback?: () => void;
  private returnUrl: string;

  constructor(options: ProfileCardOptions = {}) {
    this.onSignInCallback = options.onSignIn;
    this.returnUrl = options.returnUrl || (typeof window !== 'undefined' ? window.location.origin + window.location.pathname : '');

    // 1. Resolve profile card container
    const existing = document.getElementById('player-profile-card');
    if (existing) {
      this.element = existing;
    } else if (options.container) {
      this.element = options.container;
      this.element.id = 'player-profile-card';
      this.element.className = 'player-profile-card';
    } else {
      this.element = document.createElement('div');
      this.element.id = 'player-profile-card';
      this.element.className = 'player-profile-card';
      const parent = document.querySelector('.hud-header') || document.body;
      parent.appendChild(this.element);
    }

    // 2. Build inner HTML skeleton
    this.element.innerHTML = `
      <div class="profile-avatar-wrapper" id="profile-avatar-wrapper"></div>
      <div class="profile-text-group">
        <div class="profile-name" id="profile-name">Player</div>
        <div class="profile-handle" id="profile-handle">@guest</div>
      </div>
      <a class="profile-signin-btn" id="profile-signin-btn" href="#" target="_top" style="display: none;">Sign In</a>
    `;

    this.avatarContainer = this.element.querySelector('#profile-avatar-wrapper') as HTMLElement;
    this.nameElement = this.element.querySelector('#profile-name') as HTMLElement;
    this.handleElement = this.element.querySelector('#profile-handle') as HTMLElement;
    this.signInButton = this.element.querySelector('#profile-signin-btn') as HTMLAnchorElement;

    // 3. Attach click event for sign-in
    this.signInButton.addEventListener('click', (e) => {
      if (this.onSignInCallback) {
        e.preventDefault();
        this.onSignInCallback();
      }
    });

    // 4. Inject styles if not present
    this.ensureStyles();
  }

  /**
   * Updates profile card state dynamically from StartNgUser
   */
  public update(user: StartNgUser): void {
    const isGuest = Boolean(user.guest);
    const primaryColor = user.style?.primaryColor || '#3b82f6';
    const name = user.name || (isGuest ? 'Adventurer' : 'Player');
    const account = user.account || 'guest';

    // Update texts safely (prevent XSS)
    this.nameElement.textContent = name;
    this.handleElement.textContent = `@${account}`;

    // Clean avatar rendering without leaking raw template string attributes
    this.renderAvatar(user.face, name, primaryColor, isGuest);

    // Sign In button visibility & URL
    if (isGuest) {
      const targetUrl = `https://start.ng/?return_to=${encodeURIComponent(this.returnUrl)}`;
      this.signInButton.href = targetUrl;
      this.signInButton.style.display = 'inline-flex';
    } else {
      this.signInButton.style.display = 'none';
      this.signInButton.removeAttribute('href');
    }
  }

  /**
   * Safely renders avatar image or falls back to stylized initial badge.
   * Completely avoids raw <img> tag leaks when face URL is null, empty, or undefined.
   */
  private renderAvatar(faceUrl: string | undefined | null, name: string, color: string, isGuest: boolean): void {
    this.avatarContainer.innerHTML = '';

    const initial = name ? name.trim().charAt(0).toUpperCase() : (isGuest ? '✨' : 'P');
    const trimmedUrl = faceUrl ? faceUrl.trim() : '';
    const isValidUrl = trimmedUrl.startsWith('http://') || trimmedUrl.startsWith('https://') || trimmedUrl.startsWith('data:image/');

    if (isValidUrl) {
      const img = document.createElement('img');
      img.className = 'profile-avatar-img';
      img.alt = `${name}'s avatar`;
      img.src = trimmedUrl;

      // Handle broken / blocked image links cleanly
      img.onerror = () => {
        this.renderInitialBadge(initial, color);
      };

      this.avatarContainer.appendChild(img);
    } else {
      // Fallback: render stylized initial / emoji badge directly
      this.renderInitialBadge(trimmedUrl || initial, color);
    }
  }

  private renderInitialBadge(text: string, color: string): void {
    this.avatarContainer.innerHTML = '';
    const badge = document.createElement('div');
    badge.className = 'profile-avatar-badge';
    badge.style.backgroundColor = color;
    badge.textContent = text;
    this.avatarContainer.appendChild(badge);
  }

  private ensureStyles(): void {
    if (document.getElementById('profile-card-styles')) return;

    const style = document.createElement('style');
    style.id = 'profile-card-styles';
    style.textContent = `
      .player-profile-card {
        pointer-events: auto;
        display: inline-flex;
        align-items: center;
        gap: 0.65rem;
        background: rgba(255, 255, 255, 0.94);
        backdrop-filter: blur(12px);
        -webkit-backdrop-filter: blur(12px);
        padding: 0.4rem 0.85rem 0.4rem 0.5rem;
        border-radius: 9999px;
        box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08), 0 1px 3px rgba(0, 0, 0, 0.04);
        border: 1px solid rgba(255, 255, 255, 0.85);
        user-select: none;
        transition: transform 0.15s ease, box-shadow 0.15s ease;
      }

      .player-profile-card:hover {
        transform: translateY(-1px);
        box-shadow: 0 6px 20px rgba(0, 0, 0, 0.12);
      }

      .profile-avatar-wrapper {
        width: 34px;
        height: 34px;
        border-radius: 50%;
        overflow: hidden;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
        background: #e2e8f0;
      }

      .profile-avatar-img {
        width: 100%;
        height: 100%;
        object-fit: cover;
        display: block;
      }

      .profile-avatar-badge {
        width: 100%;
        height: 100%;
        display: flex;
        align-items: center;
        justify-content: center;
        color: #ffffff;
        font-weight: 800;
        font-size: 0.9rem;
        text-transform: uppercase;
        box-shadow: inset 0 1px 2px rgba(255, 255, 255, 0.35);
      }

      .profile-text-group {
        display: flex;
        flex-direction: column;
        line-height: 1.15;
      }

      .profile-name {
        font-size: 0.82rem;
        font-weight: 800;
        color: #0f172a;
        max-width: 120px;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .profile-handle {
        font-size: 0.68rem;
        color: #64748b;
        font-weight: 600;
      }

      .profile-signin-btn {
        margin-left: 0.35rem;
        background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
        color: #ffffff !important;
        font-size: 0.72rem;
        font-weight: 700;
        padding: 0.32rem 0.75rem;
        border-radius: 9999px;
        text-decoration: none;
        box-shadow: 0 2px 6px rgba(37, 99, 235, 0.3);
        transition: transform 0.12s ease, box-shadow 0.12s ease, opacity 0.12s ease;
      }

      .profile-signin-btn:hover {
        transform: translateY(-1px);
        box-shadow: 0 4px 10px rgba(37, 99, 235, 0.4);
        opacity: 0.95;
      }

      .profile-signin-btn:active {
        transform: translateY(0);
      }
    `;
    document.head.appendChild(style);
  }

  public destroy(): void {
    if (this.element.parentElement) {
      this.element.parentElement.removeChild(this.element);
    }
  }
}
