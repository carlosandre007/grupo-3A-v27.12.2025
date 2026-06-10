import { initializeApp, getApps, getApp } from "firebase/app";
import { getMessaging, getToken } from "firebase/messaging";
import { supabase } from "../lib/supabase";

export const getFirebaseConfig = () => {
  // 1. Tenta obter das variáveis de ambiente do Vite
  const envConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID,
    vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY
  };

  if (envConfig.messagingSenderId) {
    return envConfig;
  }

  // 2. Fallback para as configurações salvas no localStorage
  try {
    const saved = localStorage.getItem('grupo3a_firebase_config');
    return saved ? JSON.parse(saved) : null;
  } catch {
    return null;
  }
};

export const initializeFcm = async () => {
  const config = getFirebaseConfig();
  if (!config || !config.messagingSenderId) {
    console.warn("FCM não inicializado: Credenciais do Firebase não configuradas.");
    return null;
  }

  try {
    const app = getApps().length === 0 ? initializeApp(config) : getApp();
    const messaging = getMessaging(app);

    if ('serviceWorker' in navigator) {
      const queryParams = new URLSearchParams({
        apiKey: config.apiKey || '',
        authDomain: config.authDomain || '',
        projectId: config.projectId || '',
        storageBucket: config.storageBucket || '',
        messagingSenderId: config.messagingSenderId || '',
        appId: config.appId || ''
      }).toString();

      // Registra o Service Worker do Firebase passando as credenciais dinamicamente
      const registration = await navigator.serviceWorker.register(`/firebase-messaging-sw.js?${queryParams}`);
      console.log('Firebase SW registrado:', registration.scope);
      return { messaging, registration, config };
    }
  } catch (error) {
    console.error("Erro ao inicializar FCM:", error);
  }
  return null;
};

export const requestFcmToken = async (email?: string, userId?: string) => {
  try {
    const fcmInit = await initializeFcm();
    if (!fcmInit) {
      return null;
    }

    const { messaging, registration, config } = fcmInit;
    if (!config.vapidKey) {
      console.warn("VAPID Key ausente nas configurações do Firebase.");
      return null;
    }

    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      console.warn('Permissão de notificações não concedida.');
      return null;
    }

    const token = await getToken(messaging, {
      serviceWorkerRegistration: registration,
      vapidKey: config.vapidKey
    });

    if (token) {
      console.log('Token FCM gerado:', token);
      
      // Upsert do token na tabela do Supabase
      const { error } = await supabase
        .from('user_fcm_tokens')
        .upsert([
          { 
            token,
            email: email || null,
            user_id: userId || null
          }
        ], { onConflict: 'token' });

      if (error) {
        console.error('Erro ao salvar token FCM no Supabase:', error.message);
      } else {
        console.log('Token FCM salvo no Supabase com sucesso.');
      }
      return token;
    } else {
      console.warn('Nenhum token FCM retornado pelo Firebase.');
    }
  } catch (error) {
    console.error('Erro ao requisitar token FCM:', error);
  }
  return null;
};
