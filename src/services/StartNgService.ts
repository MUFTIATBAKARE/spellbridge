/**
 * StartNgService.ts
 * 
 * Manages communication with the start.ng platform:
 * - Hidden iframe handshake targeting https://start.ng/connect
 * - requestId correlation for asynchronous request/response postMessage matching
 * - User identity and styling extraction (whoAmI) with localhost mock fallback
 * - Window focus and visibility change listeners for seamless auth sync
 * - Cloud score reporting (startng:score) and leaderboard fetching (startng:leaderboard)
 */

export interface StartNgUserStyle {
  primaryColor?: string;
  secondaryColor?: string;
  skinColor?: string;
  hairColor?: string;
  hat?: string;
  accessory?: string;
}

export interface StartNgUser {
  name: string;
  account: string;
  face?: string;
  guest: boolean;
  style: StartNgUserStyle;
}

export interface StartNgScoreStats {
  words_spelled: number;
  accuracy: number;
  best_streak: number;
}

export interface LeaderboardEntry {
  rank: number;
  name: string;
  color?: string;
  stats: StartNgScoreStats;
}

export class StartNgService {
  private static instance: StartNgService | null = null;

  private user: StartNgUser;
  private readonly targetOrigin = 'https://start.ng';
  private connectIframe: HTMLIFrameElement | null = null;
  private readonly pendingRequests = new Map<string, {
    resolve: (val: any) => void;
    timeoutId: ReturnType<typeof setTimeout>;
    expectedType?: string;
  }>();

  private readonly userChangedListeners = new Set<(user: StartNgUser) => void>();

  constructor() {
    // Default guest profile
    this.user = this.getDefaultProfile();

    this.ensureConnectIframe();
    this.initMessageListener();
    this.initLifecycleListeners();
    this.whoAmI();
  }

  public static getInstance(): StartNgService {
    if (!StartNgService.instance) {
      StartNgService.instance = new StartNgService();
    }
    return StartNgService.instance;
  }

  private isLocalhost(): boolean {
    return (
      typeof window !== 'undefined' &&
      (window.location.hostname === 'localhost' ||
        window.location.hostname === '127.0.0.1' ||
        window.location.hostname === '::1' ||
        window.location.protocol === 'file:')
    );
  }

  private isEmbeddedInStartNg(): boolean {
    return typeof window !== 'undefined' && window.parent !== window;
  }

  private getDefaultProfile(): StartNgUser {
    if (this.isLocalhost()) {
      // Realistic mock user for localhost testing
      return {
        name: 'Island Explorer',
        account: 'adventurer',
        face: '',
        guest: false,
        style: {
          primaryColor: '#3b82f6',
          secondaryColor: '#f59e0b',
          skinColor: '#ffd1a4',
          hairColor: '#4b2810',
          hat: 'cap',
          accessory: 'backpack',
        },
      };
    }

    return {
      name: 'Adventurer',
      account: 'guest',
      face: '',
      guest: true,
      style: {
        primaryColor: '#3b82f6',
        secondaryColor: '#f59e0b',
        skinColor: '#ffd1a4',
        hairColor: '#4b2810',
      },
    };
  }

  /**
   * Spawns a hidden iframe to https://start.ng/connect if standalone and not already inside one.
   */
  private ensureConnectIframe(): void {
    if (typeof document === 'undefined') return;
    if (this.isEmbeddedInStartNg()) return; // Already embedded in parent frame
    if (this.isLocalhost()) return; // Local testing uses mock responses

    const existing = document.getElementById('startng-connect-frame') as HTMLIFrameElement;
    if (existing) {
      this.connectIframe = existing;
      return;
    }

    try {
      const iframe = document.createElement('iframe');
      iframe.id = 'startng-connect-frame';
      iframe.src = 'https://start.ng/connect';
      iframe.style.display = 'none';
      iframe.style.position = 'absolute';
      iframe.style.width = '0';
      iframe.style.height = '0';
      iframe.style.border = '0';
      iframe.tabIndex = -1;
      iframe.setAttribute('aria-hidden', 'true');
      document.body.appendChild(iframe);
      this.connectIframe = iframe;
    } catch (err) {
      console.warn('[StartNgService] Failed to create connect iframe:', err);
    }
  }

  /**
   * Helper that sends a message to https://start.ng with a unique requestId
   * and awaits the expected correlated response.
   */
  public askStartNg<T = any>(message: Record<string, any>, expectedResponseType?: string): Promise<T> {
    const requestId = `sb_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    const payload = { ...message, requestId };

    return new Promise((resolve) => {
      // Localhost mock responses
      if (this.isLocalhost()) {
        if (message.type === 'startng:whoami') {
          resolve({ type: 'startng:user', user: this.user } as unknown as T);
        } else if (message.type === 'startng:leaderboard') {
          resolve(this.getMockLeaderboard() as unknown as T);
        } else if (message.type === 'startng:score') {
          console.log('[StartNgService] Mock score saved:', message.stats);
          resolve({ type: 'startng:scoreSaved', ok: true } as unknown as T);
        } else {
          resolve({ ok: true } as unknown as T);
        }
        return;
      }

      // Timeout safety (3.5s)
      const timeoutId = setTimeout(() => {
        this.pendingRequests.delete(requestId);
        resolve({ timeout: true } as unknown as T);
      }, 3500);

      this.pendingRequests.set(requestId, {
        resolve,
        timeoutId,
        expectedType: expectedResponseType,
      });

      // Target selection: window.parent if embedded, otherwise connect iframe
      let targetWindow: Window | null = null;
      if (this.isEmbeddedInStartNg()) {
        targetWindow = window.parent;
      } else if (this.connectIframe?.contentWindow) {
        targetWindow = this.connectIframe.contentWindow;
      }

      if (targetWindow) {
        try {
          targetWindow.postMessage(payload, this.targetOrigin);
        } catch (err) {
          clearTimeout(timeoutId);
          this.pendingRequests.delete(requestId);
          console.warn('[StartNgService] postMessage failed:', err);
          resolve({ error: err } as unknown as T);
        }
      } else {
        clearTimeout(timeoutId);
        this.pendingRequests.delete(requestId);
        resolve({ fallback: true } as unknown as T);
      }
    });
  }

  /**
   * Queries start.ng for authenticated user information.
   * Updates state and notifies registered subscribers.
   */
  public async whoAmI(): Promise<StartNgUser> {
    if (this.isLocalhost()) {
      this.notifyUserChanged();
      return this.user;
    }

    try {
      const response = await this.askStartNg({ type: 'startng:whoami' }, 'startng:user');
      if (response && response.user) {
        this.applyUserData(response.user);
      }
    } catch (err) {
      console.warn('[StartNgService] whoAmI query failed:', err);
    }

    return this.user;
  }

  /**
   * Returns currently cached user profile immediately.
   */
  public getUser(): StartNgUser {
    return this.user;
  }

  /**
   * Subscribes a listener to user profile changes.
   * Immediately calls with the current profile and returns an unsubscribe function.
   */
  public onUserChanged(callback: (user: StartNgUser) => void): () => void {
    this.userChangedListeners.add(callback);
    callback(this.user);
    return () => this.userChangedListeners.delete(callback);
  }

  /**
   * Submits player round / game statistics to start.ng leaderboard.
   */
  public async submitScore(stats: StartNgScoreStats): Promise<boolean> {
    if (this.user.guest) {
      console.log('[StartNgService] Player is guest; stats not persisted to cloud:', stats);
      return false;
    }

    try {
      const reply = await this.askStartNg(
        {
          type: 'startng:score',
          stats,
        },
        'startng:scoreSaved'
      );
      return Boolean(reply && !reply.timeout && !reply.error);
    } catch (err) {
      console.warn('[StartNgService] Failed to submit score:', err);
      return false;
    }
  }

  /**
   * Fetches top leaderboard rankings from start.ng.
   */
  public async fetchLeaderboard(limit = 10): Promise<LeaderboardEntry[]> {
    try {
      const data = await this.askStartNg<any>(
        {
          type: 'startng:leaderboard',
          limit,
        },
        'startng:leaderboardData'
      );

      if (Array.isArray(data)) {
        return data;
      }
      if (data && Array.isArray(data.entries)) {
        return data.entries;
      }
      if (data && Array.isArray(data.leaderboard)) {
        return data.leaderboard;
      }
    } catch (err) {
      console.warn('[StartNgService] Failed to fetch leaderboard:', err);
    }

    return this.isLocalhost() ? this.getMockLeaderboard() : [];
  }

  /**
   * Constructs the sign-in URL with proper return_to parameter and redirects top window.
   */
  public getSignInUrl(): string {
    const returnTo = encodeURIComponent(window.location.origin + window.location.pathname);
    return `https://start.ng/?return_to=${returnTo}`;
  }

  public signInRedirect(): void {
    const targetUrl = this.getSignInUrl();
    if (window.top) {
      window.top.location.assign(targetUrl);
    } else {
      window.location.assign(targetUrl);
    }
  }

  private applyUserData(data: Partial<StartNgUser>): void {
    const isGuest = data.guest === true || !data.account || data.account === 'guest';
    this.user = {
      name: data.name?.trim() || (isGuest ? 'Adventurer' : 'Player'),
      account: data.account?.trim() || 'guest',
      face: data.face || '',
      guest: isGuest,
      style: {
        primaryColor: data.style?.primaryColor || '#3b82f6',
        secondaryColor: data.style?.secondaryColor || '#f59e0b',
        skinColor: data.style?.skinColor || '#ffd1a4',
        hairColor: data.style?.hairColor || '#4b2810',
        hat: data.style?.hat,
        accessory: data.style?.accessory,
      },
    };
    this.notifyUserChanged();
  }

  private notifyUserChanged(): void {
    this.userChangedListeners.forEach((listener) => {
      try {
        listener(this.user);
      } catch (err) {
        console.error('[StartNgService] Error in userChanged listener:', err);
      }
    });
  }

  private initMessageListener(): void {
    window.addEventListener('message', (event: MessageEvent) => {
      if (event.origin !== this.targetOrigin && !event.origin.includes('start.ng')) {
        return;
      }

      const data = event.data;
      if (!data || typeof data !== 'object') return;

      // Handle correlated pending requests
      if (data.requestId && this.pendingRequests.has(data.requestId)) {
        const item = this.pendingRequests.get(data.requestId)!;
        if (!item.expectedType || data.type === item.expectedType) {
          clearTimeout(item.timeoutId);
          this.pendingRequests.delete(data.requestId);
          item.resolve(data);
        }
      }

      // Handle spontaneous user identity broadcasts
      if (data.type === 'startng:user' && data.user) {
        this.applyUserData(data.user);
      }
    });
  }

  private initLifecycleListeners(): void {
    // Re-check identity when window regains focus or visibility
    window.addEventListener('focus', () => {
      this.whoAmI();
    });

    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) {
        this.whoAmI();
      }
    });
  }

  private getMockLeaderboard(): LeaderboardEntry[] {
    return [
      {
        rank: 1,
        name: 'WordWizard',
        color: '#8b5cf6',
        stats: { words_spelled: 48, accuracy: 98, best_streak: 16 },
      },
      {
        rank: 2,
        name: 'LetterLynx',
        color: '#ec4899',
        stats: { words_spelled: 37, accuracy: 94, best_streak: 12 },
      },
      {
        rank: 3,
        name: 'SpellCraft',
        color: '#10b981',
        stats: { words_spelled: 29, accuracy: 92, best_streak: 9 },
      },
      {
        rank: 4,
        name: 'RiverOtter',
        color: '#f59e0b',
        stats: { words_spelled: 21, accuracy: 89, best_streak: 7 },
      },
    ];
  }
}

