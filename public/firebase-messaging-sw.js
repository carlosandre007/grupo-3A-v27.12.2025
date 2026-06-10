importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-messaging-compat.js');

// Configuração padrão de fallback
const fallbackConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_AUTH_DOMAIN",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_STORAGE_BUCKET",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID"
};

// Carrega a configuração dinamicamente via query params da URL de registro do Service Worker
const urlParams = new URL(location).searchParams;
const firebaseConfig = {
  apiKey: urlParams.get('apiKey') || fallbackConfig.apiKey,
  authDomain: urlParams.get('authDomain') || fallbackConfig.authDomain,
  projectId: urlParams.get('projectId') || fallbackConfig.projectId,
  storageBucket: urlParams.get('storageBucket') || fallbackConfig.storageBucket,
  messagingSenderId: urlParams.get('messagingSenderId') || fallbackConfig.messagingSenderId,
  appId: urlParams.get('appId') || fallbackConfig.appId
};

if (firebaseConfig.messagingSenderId && firebaseConfig.messagingSenderId !== "YOUR_MESSAGING_SENDER_ID") {
  try {
    firebase.initializeApp(firebaseConfig);
    const messaging = firebase.messaging();

    // Evento para manipular notificações recebidas em segundo plano/app fechado
    messaging.onBackgroundMessage((payload) => {
      console.log('[firebase-messaging-sw.js] Push em segundo plano recebido:', payload);
      
      const title = payload.notification?.title || payload.data?.title || 'Grupo 3A - Alerta';
      const options = {
        body: payload.notification?.body || payload.data?.body || payload.data?.mensagem || '',
        icon: '/logo.png',
        badge: '/favicon.png',
        data: payload.data || {},
        tag: 'grupo3a-notification',
        renotify: true
      };

      self.registration.showNotification(title, options);
    });
  } catch (err) {
    console.error('Falha ao inicializar Firebase no Service Worker:', err);
  }
} else {
  console.warn('Firebase Messaging no Service Worker aguardando configuração ativa.');
}
