// _shared/llm.ts — Cliente LLM compartido: Gemini-first, OpenRouter-fallback.
// Secrets necesarios en Supabase: GEMINI_API_KEY (primario), OPENROUTER_KEY (fallback)

const GEMINI_KEY = Deno.env.get('GEMINI_API_KEY') ?? '';
const OPENROUTER_KEY = Deno.env.get('OPENROUTER_KEY') ?? '';

// Escalera de Gemini: un 503/429 (alta demanda, pasó el 2026-11-03) salta al siguiente modelo al instante.
// gemini-2.0-flash se apagó el 2026-06-01. Misma lista que proxy-ai.
const GEMINI_MODELS = ['gemini-3.6-flash', 'gemini-3.8-flash', 'gemini-3.5-flash-lite'];
const geminiUrl = (model: string) =>
  `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

const OR_URL = 'https://openrouter.ai/api/v1/chat/completions';
// Modelos gratis vivos al 2026-11-03 (los de la lista anterior devolvían 404: ya no son gratis).
const OR_MODELS = [
  'nvidia/nemotron-3.5-lightning:free',
  'nvidia/nemotron-3-ultra-550b-a55b:free',
  'google/gemma-4-31b-it:free',
  'openrouter/free',
];

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

/**
 * Llama a un LLM y devuelve el texto de respuesta.
 * Estrategia: Gemini primero (gratis, rapido), OpenRouter como fallback.
 * @param messages - Array de mensajes (system + user/assistant)
 * @param jsonMode - Si true, pide respuesta en JSON
 * @param maxTokens - Maximo de tokens de salida (default 1024)
 */
export async function callLLM(
  messages: ChatMessage[],
  jsonMode = false,
  maxTokens = 1024,
): Promise<string> {
  // ── Try Gemini first ──────────────────────────────────────────────
  if (GEMINI_KEY) {
    for (const model of GEMINI_MODELS) {
      try {
        const result = await callGemini(model, messages, jsonMode, maxTokens);
        if (result) return result;
      } catch (e) {
        console.warn(`[llm] ${model} falló, sigo con el siguiente:`, String(e).slice(0, 150));
      }
    }
  }

  // ── Fallback: OpenRouter ──────────────────────────────────────────
  if (!OPENROUTER_KEY) {
    throw new Error('Falta GEMINI_API_KEY y OPENROUTER_KEY en los secretos de Supabase.');
  }

  return await callOpenRouter(messages, jsonMode, maxTokens);
}

/** Helper: verificar si al menos una key esta configurada */
export function hasKey(): boolean {
  return !!(GEMINI_KEY || OPENROUTER_KEY);
}

// ── Gemini ────────────────────────────────────────────────────────────

async function callGemini(
  model: string,
  messages: ChatMessage[],
  jsonMode: boolean,
  maxTokens: number,
): Promise<string> {
  // Gemini no tiene rol 'system' — convertir a user con prefijo
  const contents = messages.map((msg) => {
    const role = msg.role === 'assistant' ? 'model' : 'user';
    const text = msg.role === 'system' ? `System: ${msg.content}` : msg.content;
    return { role, parts: [{ text }] };
  });

  const body = {
    contents,
    generationConfig: {
      maxOutputTokens: Math.min(maxTokens, 4096),
      temperature: 0.7,
      responseMimeType: jsonMode ? 'application/json' : 'text/plain',
    },
  };

  // Use AbortController with 25s timeout to avoid hanging requests
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 30000);

  const resp = await fetch(geminiUrl(model), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': GEMINI_KEY,
    },
    body: JSON.stringify(body),
    signal: controller.signal,
  });

  clearTimeout(timer);

  if (!resp.ok) {
    const errText = await resp.text().catch(() => '');
    throw new Error(`${model} ${resp.status}: ${errText.slice(0, 200)}`);
  }

  const data = await resp.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
  if (!text) throw new Error('Gemini returned empty content');
  return text.trim();
}

// ── OpenRouter ────────────────────────────────────────────────────────

async function callOpenRouter(
  messages: ChatMessage[],
  jsonMode: boolean,
  maxTokens: number,
): Promise<string> {
  for (const model of OR_MODELS) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 25000);

      const resp = await fetch(OR_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${OPENROUTER_KEY}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://sistema-omicrom.vercel.app',
          'X-Title': 'Sistema Omicron',
        },
        body: JSON.stringify({
          model,
          messages,
          max_tokens: Math.min(maxTokens, 4096),
          temperature: 0.7,
          ...(jsonMode ? { response_format: { type: 'json_object' } } : {}),
        }),
        signal: controller.signal,
      });

      clearTimeout(timer);

      if (!resp.ok) {
        const err = await resp.text().catch(() => '');
        console.error(`[llm/openrouter] ${model} failed: ${resp.status} ${err.slice(0, 200)}`);
        continue;
      }

      const data = await resp.json();
      const text = data?.choices?.[0]?.message?.content ?? '';
      if (text) return text.trim();
      console.error(`[llm/openrouter] ${model} returned empty content`);
      continue;
    } catch (e) {
      if ((e as Error).name === 'AbortError') {
        console.error(`[llm/openrouter] ${model} timed out`);
      } else {
        console.error(`[llm/openrouter] ${model} error:`, e);
      }
      continue;
    }
  }

  throw new Error('OpenRouter: todos los modelos fallaron. Intenta mas tarde.');
}
