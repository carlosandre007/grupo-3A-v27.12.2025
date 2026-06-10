
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// Unregister Service Workers and clear caches to avoid caching issues on deployments
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then((registrations) => {
    for (const registration of registrations) {
      registration.unregister().then((unregistered) => {
        if (unregistered) {
          console.log('Service Worker unregistered successfully.');
        }
      });
    }
  }).catch((err) => {
    console.error('Error unregistering service workers:', err);
  });

  // Clear Cache Storage
  if ('caches' in window) {
    caches.keys().then((names) => {
      for (const name of names) {
        caches.delete(name).then(() => {
          console.log(`Cache storage '${name}' cleared.`);
        });
      }
    }).catch((err) => {
      console.error('Error clearing cache storage:', err);
    });
  }
}
