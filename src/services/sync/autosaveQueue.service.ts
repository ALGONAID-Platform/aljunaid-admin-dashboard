import { api } from '../../lib/api';

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error' | 'retrying';

export interface QueuedOperation {
  id: string;
  type: 'CREATE' | 'UPDATE' | 'DELETE';
  entity: 'course' | 'module' | 'lesson' | 'quiz' | 'content';
  url: string;
  method: 'POST' | 'PATCH' | 'DELETE' | 'PUT';
  payload?: any;
  timestamp: number;
  retryCount: number;
}

type SaveStatusListener = (status: SaveStatus, message?: string) => void;

class AutosaveQueueService {
  private queue: QueuedOperation[] = [];
  private listeners: Set<SaveStatusListener> = new Set();
  private status: SaveStatus = 'idle';
  private statusMessage = '';
  private isProcessing = false;
  private STORAGE_KEY = 'aljunaid_pending_sync_queue';

  constructor() {
    this.loadQueueFromStorage();
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => void this.flushQueue());
    }
  }

  public subscribe(listener: SaveStatusListener): () => void {
    this.listeners.add(listener);
    listener(this.status, this.statusMessage);
    return () => this.listeners.delete(listener);
  }

  private setStatus(status: SaveStatus, message = '') {
    this.status = status;
    this.statusMessage = message;
    this.listeners.forEach(fn => fn(status, message));
  }

  public getStatus(): SaveStatus {
    return this.status;
  }

  /**
   * Enqueues and attempts immediate backend persistence.
   */
  public async executeWithAutosave<T>(
    entity: QueuedOperation['entity'],
    type: QueuedOperation['type'],
    url: string,
    method: QueuedOperation['method'],
    payload?: any
  ): Promise<T> {
    this.setStatus('saving', 'جاري حفظ البيانات مباشرة في القاعدة...');

    try {
      let response: { data: T };
      if (method === 'POST') {
        response = await api.post<T>(url, payload);
      } else if (method === 'PATCH') {
        response = await api.patch<T>(url, payload);
      } else if (method === 'PUT') {
        response = await api.put<T>(url, payload);
      } else {
        response = await api.delete<T>(url);
      }

      this.setStatus('saved', 'تم الحفظ بنجاح في قاعدة البيانات (Single Source of Truth)');
      setTimeout(() => {
        if (this.status === 'saved') this.setStatus('idle');
      }, 3000);

      return (response.data as any)?.data ?? response.data;
    } catch (err: any) {
      console.warn('[AutosaveQueue] Backend direct write interrupted, queuing for recovery:', err);
      
      // Queue operation locally for offline recovery
      const op: QueuedOperation = {
        id: `op-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        type,
        entity,
        url,
        method,
        payload,
        timestamp: Date.now(),
        retryCount: 0,
      };

      this.queue.push(op);
      this.saveQueueToStorage();

      this.setStatus('retrying', 'تعذر الاتصال بالشبكة. تم حفظ العملية محلياً وستستأنف المزامنة فور عودة الاتصال.');
      void this.flushQueue();

      throw err;
    }
  }

  /**
   * Flushes offline queue automatically upon network restoration.
   */
  public async flushQueue(): Promise<void> {
    if (this.isProcessing || this.queue.length === 0) return;
    this.isProcessing = true;
    this.setStatus('saving', `جاري معالجة ${this.queue.length} عملية محفوظة مسبقاً...`);

    const remainingQueue: QueuedOperation[] = [];

    for (const op of this.queue) {
      try {
        if (op.method === 'POST') {
          await api.post(op.url, op.payload);
        } else if (op.method === 'PATCH') {
          await api.patch(op.url, op.payload);
        } else if (op.method === 'PUT') {
          await api.put(op.url, op.payload);
        } else if (op.method === 'DELETE') {
          await api.delete(op.url);
        }
      } catch (err) {
        op.retryCount += 1;
        if (op.retryCount < 5) {
          remainingQueue.push(op);
        }
      }
    }

    this.queue = remainingQueue;
    this.saveQueueToStorage();
    this.isProcessing = false;

    if (this.queue.length === 0) {
      this.setStatus('saved', 'تمت مزامنة جميع البيانات المعلقة مع قاعدة البيانات بنجاح!');
      setTimeout(() => this.setStatus('idle'), 3000);
    } else {
      this.setStatus('error', 'فشلت بعض العمليات. جاري إعادة المحاولة لاحقاً...');
    }
  }

  private loadQueueFromStorage() {
    try {
      const raw = localStorage.getItem(this.STORAGE_KEY);
      if (raw) this.queue = JSON.parse(raw);
    } catch {
      this.queue = [];
    }
  }

  private saveQueueToStorage() {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.queue));
    } catch {
      // Ignore
    }
  }
}

export const autosaveQueueService = new AutosaveQueueService();
