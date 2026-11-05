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
  guest?: boolean;
  style?: StartNgUserStyle;
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

export class StartNgBridge {
  private user: StartNgUser = {
    name: 'Adventurer',
    account: 'guest',
    face: '✨',
    guest: true,
    style: {
      primaryColor: '#3b82f6',
      secondaryColor: '#f59e0b',
      skinColor: '#ffd1a4',
      hairColor: '#4b2810',
    },
  };

  private readonly targetOrigin = 'https://start.ng';
  private onUserChangedCallbacks: Array<(user: StartNgUser) => void> = [];
  private pendingRequests = new Map<string, (payload: any) => void>();

  constructor() {
    this.initListeners();
    this.checkUser();
  }

  public getUser(): StartNgUser {
    return this.user;
  }

  public onUserChanged(callback: (user: StartNgUser) => void): () => void {
    this.onUserChangedCallbacks.push(callback);
    callback(this.user);
    return () => {
      this.onUserChangedCallbacks = this.onUserChangedCallbacks.filter((cb) => cb !== callback);
    };
  }

  /**
   * Helper that sends a message to https://start.ng/connect with a unique requestId
   * and awaits the expected correlated response.
   */
  public askStartNg<T = any>(message: Record<string, any>, expectedResponseType?: string): Promise<T> {
    const requestId = `sb_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    const payload = { ...message, requestId };

    return new Promise((resolve) => {
      // Local fallback if running standalone outside an iframe or on localhost
      if (window.parent === window || location.hostname === 'localhost' || location.hostname === '127.0.0.1') {
        if (message.type === 'startng:whoami') {
          resolve(this.user as unknown as T);
        } else if (message.type === 'startng:leaderboard') {
          resolve([] as unknown as T);
        } else {
          resolve({ ok: true } as unknown as T);
        }
        return;
      }

      const timeout = setTimeout(() => {
        this.pendingRequests.delete(requestId);
        resolve({ timeout: true } as unknown as T);
      }, 4000);

      this.pendingRequests.set(requestId, (data: any) => {
        if (expectedResponseType && data.type && data.type !== expectedResponseType) {
          return;
        }
        clearTimeout(timeout);
        this.pendingRequests.delete(requestId);
        resolve(data as T);
      });

      try {
        window.parent.postMessage(payload, this.targetOrigin);
      } catch (err) {
        clearTimeout(timeout);
        this.pendingRequests.delete(requestId);
        console.warn('[start.ng] Failed to postMessage:', err);
        resolve({ error: err } as unknown as T);
      }
    });
  }

  public checkUser(): void {
    if (window.parent === window || location.hostname === 'localhost' || location.hostname === '127.0.0.1') {
      this.notifyUserChanged();
      return;
    }

    this.askStartNg({ type: 'startng:whoami' }, 'startng:user').then((reply) => {
      if (reply && reply.user) {
        this.setUser(reply.user);
      }
    });
  }

  public submitScore(stats: StartNgScoreStats): Promise<any> {
    if (this.user.guest) {
      console.log('[start.ng] Guest score not synced to cloud:', stats);
      return Promise.resolve({ guest: true });
    }

    return this.askStartNg(
      {
        type: 'startng:score',
        stats,
      },
      'startng:scoreSaved'
    );
  }

  public fetchLeaderboard(limit = 10): Promise<LeaderboardEntry[]> {
    return this.askStartNg<LeaderboardEntry[]>(
      {
        type: 'startng:leaderboard',
        limit,
      },
      'startng:leaderboardData'
    );
  }

  public signInRedirect(): void {
    const returnTo = encodeURIComponent(window.location.origin + window.location.pathname);
    window.top?.location.assign(`https://start.ng/?return_to=${returnTo}`);
  }

  private setUser(userData: Partial<StartNgUser>): void {
    this.user = {
      name: userData.name || 'Adventurer',
      account: userData.account || 'guest',
      face: userData.face || '',
      guest: userData.guest !== false && (!userData.account || userData.account === 'guest'),
      style: {
        primaryColor: userData.style?.primaryColor || '#3b82f6',
        secondaryColor: userData.style?.secondaryColor || '#f59e0b',
        skinColor: userData.style?.skinColor || '#ffd1a4',
        hairColor: userData.style?.hairColor || '#4b2810',
        hat: userData.style?.hat,
        accessory: userData.style?.accessory,
      },
    };
    this.notifyUserChanged();
  }

  private notifyUserChanged(): void {
    this.onUserChangedCallbacks.forEach((cb) => cb(this.user));
  }

  private initListeners(): void {
    // 1. postMessage listener from parent start.ng container
    window.addEventListener('message', (event: MessageEvent) => {
      if (event.origin !== this.targetOrigin && !event.origin.includes('start.ng')) {
        return;
      }

      const data = event.data;
      if (!data) return;

      // Correlate by requestId if waiting
      if (data.requestId && this.pendingRequests.has(data.requestId)) {
        const handler = this.pendingRequests.get(data.requestId);
        if (handler) handler(data);
      }

      if (data.type === 'startng:user') {
        this.setUser(data.user || {});
      }
    });

    // 2. Re-check identity on focus and visibilitychange per platform directives
    window.addEventListener('focus', () => this.checkUser());
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) {
        this.checkUser();
      }
    });
  }
}

