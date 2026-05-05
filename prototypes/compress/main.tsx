import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './style.css';
import App from './App';
import { useStore } from './store';

// Dev-only: expose store on window for ad-hoc testing in the browser console.
if (import.meta.env.DEV) {
  (window as unknown as { __compressStore: typeof useStore }).__compressStore = useStore;
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
