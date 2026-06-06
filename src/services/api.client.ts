/**
 * src/services/api.client.ts
 *
 * Re-exports the real Axios instance for backward compatibility.
 * The old simulateDelay function has been fully removed.
 */
export { api as apiClient } from '../lib/api';
