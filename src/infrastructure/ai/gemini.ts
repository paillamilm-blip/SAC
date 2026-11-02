// src/lib/geminiClient.ts
// Llama a un LLM via proxy-ai Edge Function (server-side, key protegida).
// Modelo: elegido server-side (multi-model fallback).

// Usa aiClient centralizado (proxy-ai Edge Function server-side)
import { callAI } from '@/infrastructure/ai/client';

const SYS = [
  'Eres el Motor de ADN Digital de Omicron.',
  'Tu mision: CLONAR fielmente un CV real y MEDIR al profesional.',
  '',
  'SISTEMA OMICRON - 4 EJES (0-100):',
  '- EJECUCION (exec): Capacidad de entregar. Proyectos, anios, resultados.',
  '- CALIDAD (qual): Rigor. Certificaciones, estandares, metodologias.',
  '- TRASCENDENCIA (trans): Impacto. Liderazgo, mentoria, docencia.',
  '- FUNDAMENTO (fund): Base formal. Titulos, diplomados, certificaciones.',
  '',
  'Formula: reputacion = 20% credenciales + 80% promedio(4 ejes).',
  '',
  'INSTRUCCIONES:',
  '1. Extraer TODA la info del CV. NO inventar. NO omitir.',
  '2. seniorLabel = posicionamiento REAL como especialista.',
  '3. Medir los 4 ejes con evidencia concreta del CV.',
  '4. Los pct por habilidad deben diferenciarse: principal 80-96%, secundarias 50-75%, menores 30-50%.',
  '5. Years = suma TOTAL de experiencia laboral.',
  '6. Funciona para CUALQUIER industria.',
  '',
  'Responde SOLO JSON valido con estos campos (sin texto extra):',
  '{"name":"","seniorLabel":"","seniorLevel":0,"years":0,"skills":[],"skillsDetail":[{"name":"","pct":0}],"arch":"","axes":{"exec":0,"qual":0,"trans":0,"fund":0},"summary":""}',
  '',
  'Donde:',
  '- name: nombre completo',
  '- seniorLabel: posicionamiento como especialista (1 frase especifica)',
  '- seniorLevel: 1=estudiante, 2=junior, 3=semi-senior, 4=senior, 5=experto/director',
  '- years: anios TOTALES de experiencia (entero)',
  '- skills: array max 12 strings con habilidades/areas principales en espanol',
  '- skillsDetail: array de {name, pct} con nivel de dominio 0-100',
  '- arch: uno de estudiante, junior, mid, senior, lead, pro',
  '- axes: {exec, qual, trans, fund} cada uno 0-100',
  '- summary: 2 parrafos en espanol. P1: quien es. P2: justificacion de ejes.',
].join('\n');

export interface GeminiAnalysis {
  name?: string;
  seniorLabel?: string;
  seniorLevel?: number;
  years?: number;
  skills?: string[];
  skillsDetail?: { name: string; pct: number }[];
  arch?: string;
  axes?: { exec: number; qual: number; trans: number; fund: number };
  summary?: string;
}

export async function analyzeCVWithGemini(cvText: string): Promise<{ ok: boolean; analysis?: GeminiAnalysis; error?: string; errorCode?: string }> {
  const text = cvText.slice(0, 15000);

  try {
    const raw = await callAI([
      { role: 'system', content: SYS },
      { role: 'user', content: 'CV COMPLETO:\n\n' + text },
    // 75s: proxy-ai (build 6e) se da 70 s — 40 s de carrera entre dos ne-
    // motron con el razonamiento apagado, más el fallback. El cliente SIEMPRE
    // tiene que esperar más que el server para que el error estructurado del
    // 503 (con el debug de qué modelo cayó) llegue a la UI antes del TIMEOUT
    // genérico local.
    ], { maxTokens: 2000, temperature: 0.3, jsonMode: true, timeout: 75000 });

    if (!raw) {
      return { ok: false, error: 'IA no disponible. Intenta de nuevo en unos minutos.', errorCode: 'empty_response' };
    }

    // Extraer JSON del contenido (puede venir con texto antes/después)
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return { ok: false, error: 'La IA respondió pero no pude interpretar el resultado.', errorCode: 'parse_error' };
    }

    const parsed = JSON.parse(jsonMatch[0]);

    // Validar con Zod: si la IA devolvió campos incorrectos, rechazar
    const { validateGeminiResponse } = await import('./schemas/cvAnalysis');
    const validation = validateGeminiResponse(parsed);
    if (!validation.success) {
      console.warn('[geminiClient] Zod validation failed:', validation.error);
      return { ok: false, error: 'La IA devolvió datos incompletos. Intenta de nuevo.', errorCode: 'validation_error' };
    }

    return { ok: true, analysis: validation.data as GeminiAnalysis };
  } catch (e: unknown) {
    // Check if the error is an AIError by duck-typing (avoids dynamic import instanceof issues)
    const aiErr = e as { name?: string; code?: string; message?: string };
    if (aiErr?.name === 'AIError' && aiErr.code) {
      console.warn(`[geminiClient] AIError [${aiErr.code}]:`, aiErr.message);
      switch (aiErr.code) {
        case 'timeout':
          return { ok: false, error: 'La IA tardó demasiado. Los servidores pueden estar ocupados.', errorCode: 'timeout' };
        case 'credits':
          return { ok: false, error: aiErr.message || 'Créditos IA agotados. Espera a mañana o mejora tu plan.', errorCode: 'credits' };
        case 'server':
          return { ok: false, error: aiErr.message || 'Servicio de IA con problemas. Reintenta en unos minutos.', errorCode: 'server' };
        case 'network':
          return { ok: false, error: 'Error al comunicarse con el servidor de IA. Verifica tu conexión.', errorCode: 'network' };
        default:
          return { ok: false, error: aiErr.message || 'Error desconocido de IA.', errorCode: aiErr.code };
      }
    }
    console.warn('[geminiClient] Error:', e);
    return { ok: false, error: 'No se pudo conectar con la IA. Intenta de nuevo.', errorCode: 'unknown' };
  }
}
