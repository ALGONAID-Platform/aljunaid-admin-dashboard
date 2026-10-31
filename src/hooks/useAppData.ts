import { useEffect } from 'react';
import { syncService } from '../services/sync/sync.service';

/**
 * Enterprise Data Synchronization Hook.
 * Connects the app to the Single Source of Truth Synchronization Engine.
 * Automatically handles window focus, network reconnection, and periodic background sync.
 */
export function useAppData() {
  useEffect(() => {
    // Connect network reconnection listener (polling disabled to prevent intrusive screen refresh loops)
    const cleanup = syncService.initAutoSync(0);
    return cleanup;
  }, []);
}
