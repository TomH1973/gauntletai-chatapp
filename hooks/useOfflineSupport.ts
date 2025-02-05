import { useState, useEffect } from 'react';

interface UseOfflineSupportReturn {
  isOnline: boolean;
  isServiceWorkerReady: boolean;
  queueMessage: (message: any) => Promise<void>;
}

export function useOfflineSupport(): UseOfflineSupportReturn {
  const [isOnline, setIsOnline] = useState(true);
  const [isServiceWorkerReady, setServiceWorkerReady] = useState(false);
  const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null);

  useEffect(() => {
    // Register service worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js')
        .then((reg) => {
          setRegistration(reg);
          setServiceWorkerReady(true);
        })
        .catch((error) => {
          console.error('Service worker registration failed:', error);
        });
    }

    // Set up online/offline listeners
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    setIsOnline(navigator.onLine);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const queueMessage = async (message: any) => {
    if (!registration?.active) {
      throw new Error('Service worker not ready');
    }

    // Queue message in IndexedDB through service worker
    registration.active.postMessage({
      type: 'QUEUE_MESSAGE',
      message,
    });

    // Request sync when back online
    if ('sync' in registration) {
      try {
        await registration.sync.register('sync-messages');
      } catch (error) {
        console.error('Failed to register sync:', error);
      }
    }
  };

  return {
    isOnline,
    isServiceWorkerReady,
    queueMessage,
  };
} 