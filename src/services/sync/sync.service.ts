import { useCoursesStore } from '../../store/courses.store';
import { useModulesStore } from '../../store/modules.store';
import { useLessonsStore } from '../../store/lessons.store';
import { useQuizzesStore } from '../../store/quizzes.store';
import { useContentStore } from '../../store/content.store';
import { authService } from '../auth.service';

/**
 * Enterprise Single Source of Truth Synchronization Engine
 * 
 * Ensures all domain stores (Courses, Modules, Lessons, Quizzes, Content)
 * are continuously synchronized directly from the backend database.
 */
class SyncService {
  private syncIntervalTimer: any = null;
  private isSyncing = false;

  /**
   * Performs full data synchronization from the backend database across all domain stores.
   */
  public async syncAllData(force = false): Promise<void> {
    if (!authService.isAuthenticated()) return;
    if (this.isSyncing && !force) return;

    this.isSyncing = true;
    try {
      // Sync global catalog stores. Lessons are fetched on-demand per course to prevent
      // wiping out active course scoped state and causing screen reload flickers.
      await Promise.allSettled([
        useCoursesStore.getState().fetchCourses(),
        useModulesStore.getState().fetchModules(),
        useQuizzesStore.getState().fetchQuizzes(),
        useContentStore.getState().fetchContent(),
      ]);
    } catch (err) {
      console.error('[SyncEngine] Synchronization error:', err);
    } finally {
      this.isSyncing = false;
    }
  }

  /**
   * Initializes network reconnection listener without intrusive focus-stealing or aggressive polling.
   */
  public initAutoSync(pollIntervalMs = 0): () => void {
    const handleOnline = () => {
      void this.syncAllData(true);
    };

    window.addEventListener('online', handleOnline);

    if (pollIntervalMs > 0 && !this.syncIntervalTimer) {
      this.syncIntervalTimer = setInterval(() => {
        void this.syncAllData();
      }, pollIntervalMs);
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      if (this.syncIntervalTimer) {
        clearInterval(this.syncIntervalTimer);
        this.syncIntervalTimer = null;
      }
    };
  }

  /**
   * Completely purges in-memory domain stores on Logout to prevent stale data cross-contamination.
   */
  public clearAllStores(): void {
    useCoursesStore.setState({ courses: [], isLoading: false, error: null });
    useModulesStore.setState({ modules: [], isLoading: false, error: null });
    useLessonsStore.setState({ lessons: [], isLoading: false, error: null });
    useQuizzesStore.setState({ quizzes: [], isLoading: false, error: null });
    useContentStore.setState({ content: [], isLoading: false, error: null });

    // Clear legacy draft keys from localStorage if present
    const legacyKeys = [
      'draft-courses-storage',
      'draft-modules-storage',
      'draft-lessons-storage',
      'draft-quizzes-storage',
      'draft-content-storage',
    ];
    legacyKeys.forEach(k => localStorage.removeItem(k));
  }
}

export const syncService = new SyncService();
