import { createRoot } from 'react-dom/client';
import { AppRouter } from './routes/index';
import { useAuthStore } from './store/auth.store';
import './styles/index.css';

// Initialize auth state from localStorage on app start
useAuthStore.getState().initializeFromStorage();

createRoot(document.getElementById('root')!).render(<AppRouter />);