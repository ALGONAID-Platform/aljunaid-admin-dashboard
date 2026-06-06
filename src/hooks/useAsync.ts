import { useState, useCallback } from 'react';
import type { AsyncStatus } from '../types';

interface UseAsyncState<T> {
  data: T | null;
  status: AsyncStatus;
  error: string | null;
}

/**
 * Generic hook for managing async operations with loading/error states.
 */
export function useAsync<T>() {
  const [state, setState] = useState<UseAsyncState<T>>({
    data: null,
    status: 'idle',
    error: null,
  });

  const execute = useCallback(async (asyncFn: () => Promise<T>) => {
    setState({ data: null, status: 'loading', error: null });
    try {
      const result = await asyncFn();
      setState({ data: result, status: 'success', error: null });
      return result;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'حدث خطأ غير متوقع';
      setState({ data: null, status: 'error', error: msg });
      throw err;
    }
  }, []);

  const reset = useCallback(() => {
    setState({ data: null, status: 'idle', error: null });
  }, []);

  return { ...state, execute, reset, isLoading: state.status === 'loading' };
}
