import { createRoot } from 'react-dom/client';
import { AppRouter } from './routes/index';
import { useAuthStore } from './store/auth.store';
import { Toaster } from 'react-hot-toast';
import './styles/index.css';

// Initialize auth state from localStorage on app start
useAuthStore.getState().initializeFromStorage();

createRoot(document.getElementById('root')!).render(<>
  <AppRouter />
  <Toaster position="top-center" toastOptions={{ duration: 3500, style: { fontFamily: "'Cairo', sans-serif", direction: 'rtl', borderRadius: '14px', fontWeight: 700 } }} />
</>);
