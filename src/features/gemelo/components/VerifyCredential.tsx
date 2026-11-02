// components/perfil/VerifyCredential.tsx
// Vista PÚBLICA de verificación del Pasaporte Ómicrom. Cualquiera (sin cuenta)
// abre ?verificar=<token> y comprueba criptográficamente que la credencial es
// auténtica y NO fue alterada. La verifica la Edge Function `credential`.

import { useEffect, useState } from 'react';
import { ShieldCheck, ShieldAlert, Loader2, TrendingUp, BadgeCheck } from 'lucide-react';
import { supabase } from '@/infrastructure/supabase/client';
import { HALO, C, FONT, tint, SIZE, ANIM, LETRA} from '@/theme';

interface Cred { v: number; u: string; n: string; nt: string; nl: string; rep: number; ej: number[]; cv: number; pe: number; iat: number; }
const EJES = ['Ejecución', 'Calidad', 'Trascendencia', 'Fundamento'];

export function VerifyCredentialView({ token }: { token: string }) {
  const [state, setState] = useState<'loading' | 'valid' | 'invalid' | 'error'>('loading');
  const [cred, setCred] = useState<Cred | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const { data, error } = await supabase.functions.invoke('credential', { body: { action: 'verify', token } });
        if (!alive) return;
        const d = data as { valid?: boolean; cred?: Cred; error?: string } | null;
        if (error || !d) { setState('error'); return; }
        if (d.valid && d.cred) { setCred(d.cred); setState('valid'); }
        else setState('invalid');
      } catch { if (alive) setState('error'); }
    })();
    return () => { alive = false; };
  }, [token]);

  const back = () => { window.location.href = window.location.pathname; };
  const repColor = cred && cred.rep >= 70 ? C.green : cred && cred.rep >= 50 ? C.gold : C.cyan;

  return (
    <div style={{ minHeight: '100vh', background: `radial-gradient(circle at 50% 0%, ${C.noche}, ${C.bg})`, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '24px 16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
        <div style={{ width: 30, height: 30, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', background: `linear-gradient(135deg, ${C.ice}, ${C.cyan})` }}>
          <span style={{ color: C.bg, fontFamily: FONT.display, fontWeight: 700, fontSize: 15 }}>Ω</span>
        </div>
        <span style={{ fontFamily: FONT.display, fontWeight: 700, fontSize: 17, color: C.ink }}>Ómicrom · Verificación</span>
      </div>

      <div style={{ width: '100%', maxWidth: 420, borderRadius: 18, padding: 22, background: `linear-gradient(165deg, ${C.surfaceLight}, ${C.surface})`, border: `1px solid ${C.cyanDim}`, boxShadow: `0 20px 60px ${C.scrim}` }}>
        {state === 'loading' && (
          <div style={{ textAlign: 'center', padding: 40 }}>
            <Loader2 size={28} style={{ color: C.cyan, animation: ANIM.spin }} />
            <p style={{ fontFamily: FONT.mono, fontSize: 11, color: C.cyanDim, letterSpacing: LETRA.etiqueta, marginTop: 12 }}>VERIFICANDO FIRMA…</p>
          </div>
        )}

        {state === 'invalid' && (
          <div style={{ textAlign: 'center', padding: 30 }}>
            <ShieldAlert size={40} style={{ color: C.red }} />
            <p style={{ fontFamily: FONT.display, fontWeight: 700, fontSize: 20, color: C.red, margin: '12px 0 4px' }}>Credencial no válida</p>
            <p style={{ fontFamily: FONT.body, fontSize: 13, color: C.cyanDim }}>La firma no coincide: el pasaporte fue **alterado** o el link está incompleto.</p>
          </div>
        )}

        {state === 'error' && (
          <div style={{ textAlign: 'center', padding: 30 }}>
            <ShieldAlert size={40} style={{ color: C.gold }} />
            <p style={{ fontFamily: FONT.display, fontWeight: 700, fontSize: SIZE.md, color: C.ink, margin: '12px 0 4px' }}>No se pudo verificar</p>
            <p style={{ fontFamily: FONT.body, fontSize: SIZE.sm, color: C.cyanDim }}>Reintenta más tarde. (¿Está desplegada la función "credential"?)</p>
          </div>
        )}

        {state === 'valid' && cred && (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center', padding: '8px 12px', borderRadius: 12, background: C.greenFaint, border: `1px solid ${C.greenDim}`, marginBottom: 18 }}>
              <ShieldCheck size={18} style={{ color: C.green }} />
              <span style={{ fontFamily: FONT.mono, fontSize: 11, letterSpacing: LETRA.etiqueta, color: C.green, fontWeight: 700 }}>VERIFICADO POR ÓMICROM</span>
            </div>

            <div style={{ textAlign: 'center', marginBottom: 16 }}>
              <div style={{ fontFamily: FONT.display, fontWeight: 700, fontSize: SIZE.xl, color: C.ink }}>{cred.n}</div>
              <div style={{ fontFamily: FONT.mono, fontSize: SIZE.xs, color: C.cyanDim }}>@{cred.u} · {cred.nt} · N{String(cred.nl).replace(/^N/i, '')}</div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 16 }}>
              <span style={{ fontFamily: FONT.body, fontSize: SIZE.xs, color: C.cyanDim }}>Reputación</span>
              <span style={{ fontFamily: FONT.display, fontWeight: 700, fontSize: SIZE.hero, color: repColor, textShadow: `0 0 ${HALO.marca}px ${repColor}55` }}>{cred.rep}</span>
              <span style={{ fontFamily: FONT.mono, fontSize: SIZE.xs, color: C.cyanDim }}>/100</span>
            </div>

            <div style={{ marginBottom: 16 }}>
              {EJES.map((label, i) => (
                <div key={label} style={{ marginBottom: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: FONT.mono, fontSize: 11, color: C.ink, marginBottom: 3 }}>
                    <span>{label}</span><span style={{ color: C.cyan }}>{cred.ej[i] ?? 0}</span>
                  </div>
                  <div style={{ height: 6, background: C.glass2, borderRadius: 4, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${cred.ej[i] ?? 0}%`, background: `linear-gradient(90deg, ${C.gold}, ${C.cyan})`, borderRadius: 4 }} />
                  </div>
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
              <div style={{ flex: 1, textAlign: 'center', padding: '10px', borderRadius: 8, background: tint(C.cyan, 5), border: `1px solid ${C.cyanFaint}` }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, fontFamily: FONT.display, fontWeight: 700, fontSize: 20, color: C.green }}><BadgeCheck size={15} /> {cred.cv}</div>
                <div style={{ fontFamily: FONT.mono, fontSize: SIZE.xxs, color: C.cyanDim, letterSpacing: LETRA.etiqueta }}>HABILIDADES VALIDADAS</div>
              </div>
              <div style={{ flex: 1, textAlign: 'center', padding: '10px', borderRadius: 8, background: tint(C.cyan, 5), border: `1px solid ${C.cyanFaint}` }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, fontFamily: FONT.display, fontWeight: 700, fontSize: 20, color: C.cyan }}><TrendingUp size={15} /> {cred.pe}</div>
                <div style={{ fontFamily: FONT.mono, fontSize: SIZE.xxs, color: C.cyanDim, letterSpacing: LETRA.etiqueta }}>PUNTOS DE EXPERIENCIA</div>
              </div>
            </div>

            <p style={{ fontFamily: FONT.mono, fontSize: 9, color: C.cyanDim, textAlign: 'center', lineHeight: 1.5 }}>
              Firma criptográfica válida · imposible de falsear.<br />Emitido el {new Date(cred.iat).toLocaleString('es-CL')}
            </p>
          </>
        )}

        <button onClick={back} style={{ width: '100%', marginTop: 18, padding: '12px', borderRadius: 12, cursor: 'pointer', background: C.cyanGhost, border: `1px solid ${C.cyanDim}`, color: C.cyan, fontFamily: FONT.display, fontWeight: 700, fontSize: SIZE.sm }}>
          Ir a Ómicrom
        </button>
      </div>
    </div>
  );
}
