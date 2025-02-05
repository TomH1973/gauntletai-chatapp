import { useClerk } from '@clerk/nextjs';
import { metrics } from '../metrics';

interface SessionConfig {
  tokenRefreshThreshold: number;  // Time in seconds before token expiry to trigger refresh
  maxInactiveDuration: number;    // Maximum time in seconds a session can be inactive
  persistenceMode: 'local' | 'session' | 'none';
}

const DEFAULT_CONFIG: SessionConfig = {
  tokenRefreshThreshold: 300,     // Refresh token 5 minutes before expiry
  maxInactiveDuration: 3600 * 24, // 24 hours
  persistenceMode: 'local'
};

export class SessionManager {
  private static instance: SessionManager;
  protected config: SessionConfig;
  private lastActivity: number;

  private constructor(config: Partial<SessionConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.lastActivity = Date.now();
  }

  static getInstance(config?: Partial<SessionConfig>): SessionManager {
    if (!SessionManager.instance) {
      SessionManager.instance = new SessionManager(config);
    }
    return SessionManager.instance;
  }

  updateLastActivity(): void {
    this.lastActivity = Date.now();
  }

  isSessionExpired(): boolean {
    const inactiveDuration = (Date.now() - this.lastActivity) / 1000;
    return inactiveDuration > this.config.maxInactiveDuration;
  }

  getConfig(): SessionConfig {
    return this.config;
  }
}

export function useSessionManager() {
  const clerk = useClerk();
  const sessionManager = SessionManager.getInstance();

  const refreshToken = async (): Promise<void> => {
    try {
      const startTime = performance.now();
      await clerk.session?.reload();
      const duration = performance.now() - startTime;
      
      metrics.tokenRefreshDuration.observe(duration / 1000);
      metrics.tokenRefreshSuccess.inc();
    } catch (error) {
      metrics.tokenRefreshErrors.inc();
      console.error('Token refresh failed:', error);
      throw error;
    }
  };

  const setupTokenRefresh = () => {
    if (!clerk.session) return;

    const tokenExpiryTime = new Date(clerk.session.lastActiveAt).getTime() + 
      (clerk.session.expireAt?.getTime() || 0) - Date.now();
    const refreshTime = tokenExpiryTime - (sessionManager.getConfig().tokenRefreshThreshold * 1000);

    if (refreshTime > 0) {
      setTimeout(refreshToken, refreshTime);
    } else {
      refreshToken();
    }
  };

  return {
    refreshToken,
    setupTokenRefresh,
    updateActivity: () => sessionManager.updateLastActivity(),
    isExpired: () => sessionManager.isSessionExpired()
  };
} 