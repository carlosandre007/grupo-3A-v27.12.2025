import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.8.0";

// Interface para payload do Webhook
interface WebhookPayload {
  type: "INSERT" | "UPDATE" | "DELETE";
  table: string;
  schema: string;
  record: {
    id: string;
    titulo: string;
    mensagem: string;
    tipo: string;
    lida: boolean;
    created_at: string;
  };
}

// Helper para assinar JWT usando Web Crypto (RSA SHA-256)
async function generateAccessToken(serviceAccount: any): Promise<string> {
  const { client_email, private_key, project_id } = serviceAccount;
  
  // Limpar chave privada
  const pemHeader = "-----BEGIN PRIVATE KEY-----";
  const pemFooter = "-----END PRIVATE KEY-----";
  const pemContents = private_key
    .replace(pemHeader, "")
    .replace(pemFooter, "")
    .replace(/\s+/g, "");
  
  const binaryDerString = atob(pemContents);
  const binaryDer = new Uint8Array(binaryDerString.length);
  for (let i = 0; i < binaryDerString.length; i++) {
    binaryDer[i] = binaryDerString.charCodeAt(i);
  }

  const cryptoKey = await crypto.subtle.importKey(
    "pkcs8",
    binaryDer,
    {
      name: "RSASSA-PKCS1-v1_5",
      hash: "SHA-256",
    },
    false,
    ["sign"]
  );

  const header = { alg: "RS256", typ: "JWT" };
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    iss: client_email,
    scope: "https://www.googleapis.com/auth/firebase.messaging",
    aud: "https://oauth2.googleapis.com/token",
    exp: now + 3600,
    iat: now,
  };

  const textEncoder = new TextEncoder();
  const encodedHeader = btoa(JSON.stringify(header)).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
  const encodedPayload = btoa(JSON.stringify(payload)).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
  
  const tokenString = `${encodedHeader}.${encodedPayload}`;
  const signedBuffer = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    cryptoKey,
    textEncoder.encode(tokenString)
  );

  const signature = btoa(String.fromCharCode(...new Uint8Array(signedBuffer)))
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");

  const jwt = `${tokenString}.${signature}`;

  // Requisitar access token do Google OAuth
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }),
  });

  const data = await response.json();
  if (data.error) {
    throw new Error(`Google OAuth erro: ${data.error_description || data.error}`);
  }
  return data.access_token;
}

serve(async (req) => {
  // CORS Headers
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST",
        "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
      },
    });
  }

  try {
    const payload: WebhookPayload = await req.json();
    
    // Processar apenas inserções na tabela de notificações
    if (payload.type !== "INSERT" || payload.table !== "notificacoes") {
      return new Response(JSON.stringify({ message: "Ignorado. Não é uma nova notificação." }), {
        headers: { "Content-Type": "application/json" },
        status: 200,
      });
    }

    const { record } = payload;
    const { titulo, mensagem } = record;

    // Conectar ao Supabase interno
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const supabaseClient = createClient(supabaseUrl, supabaseServiceKey);

    // Buscar tokens FCM ativos
    const { data: tokensData, error: tokensError } = await supabaseClient
      .from("user_fcm_tokens")
      .select("token");

    if (tokensError) throw tokensError;
    if (!tokensData || tokensData.length === 0) {
      return new Response(JSON.stringify({ message: "Nenhum token FCM registrado." }), {
        headers: { "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Carregar credenciais do Firebase
    const serviceAccountJson = Deno.env.get("FIREBASE_SERVICE_ACCOUNT");
    if (!serviceAccountJson) {
      throw new Error("Variável de ambiente FIREBASE_SERVICE_ACCOUNT não configurada.");
    }
    const serviceAccount = JSON.parse(serviceAccountJson);
    const projectId = serviceAccount.project_id;

    // Obter Access Token do Google
    const accessToken = await generateAccessToken(serviceAccount);

    // Enviar para cada token
    const results = [];
    for (const { token } of tokensData) {
      try {
        const response = await fetch(
          `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`,
          {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${accessToken}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              message: {
                token: token,
                notification: {
                  title: titulo,
                  body: mensagem,
                },
                data: {
                  click_action: "/",
                },
              },
            }),
          }
        );

        const resData = await response.json();
        results.push({ token, status: response.status, data: resData });

        // Se o token for inválido, remover do banco
        if (response.status === 404 || response.status === 400 || (resData.error && resData.error.status === "UNREGISTERED")) {
          console.log(`Removendo token expirado/inválido: ${token}`);
          await supabaseClient.from("user_fcm_tokens").delete().eq("token", token);
        }
      } catch (err) {
        console.error(`Erro ao disparar para token ${token}:`, err);
        results.push({ token, error: err.message });
      }
    }

    return new Response(JSON.stringify({ message: "Envio concluído", results }), {
      headers: { "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("Erro na Edge Function:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { "Content-Type": "application/json" },
      status: 500,
    });
  }
});
