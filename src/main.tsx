// Polyfill para crypto.randomUUID en contextos no seguros (HTTP / IPs locales) o navegadores sin soporte
if (typeof window !== 'undefined') {
  if (!window.crypto) {
    (window as any).crypto = {};
  }
  if (typeof window.crypto.randomUUID !== 'function') {
    (window.crypto as any).randomUUID = () => {
      if (typeof window.crypto.getRandomValues === 'function') {
        return '10000000-1000-4000-8000-100000000000'.replace(/[018]/g, (c) =>
          (
            Number(c) ^
            (window.crypto.getRandomValues(new Uint8Array(1))[0] & (15 >> (Number(c) / 4)))
          ).toString(16),
        );
      }
      return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0;
        const v = c === 'x' ? r : (r & 0x3) | 0x8;
        return v.toString(16);
      });
    };
  }
}

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { cleanupLegacyServiceWorker } from './service-worker-cleanup'

if ('serviceWorker' in navigator) {
  void cleanupLegacyServiceWorker(navigator.serviceWorker, window.caches, window.location.origin)
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
