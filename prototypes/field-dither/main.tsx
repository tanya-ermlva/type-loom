import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './style.css';
import App from './App';
import { useStore } from './store';

if (import.meta.env.DEV) {
  (window as unknown as { __ditherStore: typeof useStore }).__ditherStore = useStore;
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
