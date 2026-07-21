import { useEffect } from 'react';
import { syncService } from '../services/sync/sync.service';

/**
 * Enterprise Data Synchronization Hook.
 * Connects the app to the Single Source of Truth Synchronization Engine.
 * Automatically handles window focus, network reconnection, and periodic background sync.
 */
export function useAppData() {
  useEffect(() => {
    // Start automatic multi-device synchronization engine
    const cleanup = syncService.initAutoSync(30000); // 30-second background polling
    return cleanup;
  }, []);
}
