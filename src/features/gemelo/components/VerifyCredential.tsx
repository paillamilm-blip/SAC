// Vista PÚBLICA de verificación de una credencial Ómicrom. Cualquiera (sin cuenta) abre ?verificar=<token> y
// comprueba que la credencial es auténtica y NO fue alterada. La verifica la Edge Function `credential`.
//
// Versión 2 (actual): las habilidades que la persona aprobó con examen. Versión 1 (anterior, producto viejo):
// reputación y ejes; se sigue mostrando para no dejar sin verificar los enlaces ya compartidos.

import { useEffect, useState } from 'react';
import { ShieldCheck, ShieldAlert, Loader2, TrendingUp, BadgeCheck } from 'lucide-react';
import { supabase } from '@/infrastructure/supabase/client';
import { C, FONT } from '@/theme';
import { leerCredencial, type Credencial, type CredencialV1, type CredencialV2 } from '@/features/brecha/domain/credencial';

const EJES = ['Ejecución', 'Calidad', 'Trascendencia', 'Fundamento'];

const fechaLarga = (ms: number) =>
  new Intl.DateTimeFormat('es-CL', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(ms));
const fechaDia = (iso: string) =>
  iso ? new Intl.DateTimeFormat('es-CL', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(`${iso}T12:00:00`)) : 'fecha no registrada';

type Estado = 'loading' | 'valid' | 'invalid' | 'expired' | 'error';

export function VerifyCredentialView({ token }: { token: string }) {
  const [state, setState] = useState<Estado>('loading');
  const [cred, setCred] = useState<Credencial | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const { data, error } = await supabase.functions.invoke('credential', { body: { action: 'verify', token } });
        if (!alive) return;
        const d = data as { valid?: boolean; expired?: boolean; cred?: unknown } | null;
        if (error || !d) { setState('error'); return; }
        if (d.expired) { setState('expired'); return; }
        const leida = d.valid ? leerCredencial(d.cred) : null;
        if (leida) { setCred(leida); setState('valid'); }
        else setState('invalid');
      } catch { if (alive) setState('error'); }
    })();
    return () => { alive = false; };
  }, [token]);

  const back = () => { window.location.href = window.location.pathname; };

  return (
    <div style={{ minHeight: '100vh', background: `radial-gradient(circle at 50% 0%, #061024, ${C.bg})`, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '28px 16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
        <div style={{ width: 30, height: 30, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #8bd4ff, #a0aec0)' }}>
          <span style={{ color: '#000206', fontFamily: FONT.display, fontWeight: 700, fontSize: 15 }}>Ω</span>
        </div>
        <span style={{ fontFamily: FONT.display, fontWeight: 700, fontSize: 17, color: '#eaf0fb' }}>Ómicrom · Verificación</span>
      </div>

      <div style={{ width: '100%', maxWidth: 420, borderRadius: 18, padding: 22, background: 'linear-gradient(165deg, rgba(22,34,58,0.98), rgba(10,17,32,0.99))', border: `1px solid ${C.cyanDim}`, boxShadow: '0 20px 60px rgba(0,0,0,0.6)' }}>
        {state === 'loading' && (
          <div role="status" style={{ textAlign: 'center', padding: 40 }}>
            <Loader2 size={28} style={{ color: C.cyan, animation: 'cp-spin 0.9s linear infinite' }} />
            <p style={{ fontFamily: FONT.mono, fontSize: 11, color: C.cyanDim, letterSpacing: 1, marginTop: 12 }}>VERIFICANDO FIRMA...</p>
          </div>
        )}

        {state === 'invalid' && (
          <div role="alert" style={{ textAlign: 'center', padding: 30 }}>
            <ShieldAlert size={40} style={{ color: C.red }} />
            <p style={{ fontFamily: FONT.display, fontWeight: 700, fontSize: 20, color: C.red, margin: '12px 0 4px' }}>Credencial no válida</p>
            <p style={{ fontFamily: FONT.body, fontSize: 13, color: C.cyanDim }}>La firma no coincide: la credencial fue alterada o el enlace está incompleto.</p>
          </div>
        )}

        {state === 'expired' && (
          <div role="alert" style={{ textAlign: 'center', padding: 30 }}>
            <ShieldAlert size={40} style={{ color: C.gold }} />
            <p style={{ fontFamily: FONT.display, fontWeight: 700, fontSize: 20, color: '#eaf4ff', margin: '12px 0 4px' }}>Credencial vencida</p>
            <p style={{ fontFamily: FONT.body, fontSize: 13, color: C.cyanDim }}>La firma es auténtica, pero esta credencial ya venció. Pídele a la persona que cree un enlace nuevo.</p>
          </div>
        )}

        {state === 'error' && (
          <div role="alert" style={{ textAlign: 'center', padding: 30 }}>
            <ShieldAlert size={40} style={{ color: C.gold }} />
            <p style={{ fontFamily: FONT.display, fontWeight: 700, fontSize: 16, color: '#eaf4ff', margin: '12px 0 4px' }}>No se pudo verificar</p>
            <p style={{ fontFamily: FONT.body, fontSize: 12.5, color: C.cyanDim }}>No pudimos comunicarnos con el servidor. Reintenta en un momento.</p>
          </div>
        )}

        {state === 'valid' && cred?.version === 2 && <Habilidades cred={cred} />}
        {state === 'valid' && cred?.version === 1 && <Anterior cred={cred} />}

        <button onClick={back} style={{ width: '100%', marginTop: 18, padding: '12px', borderRadius: 12, cursor: 'pointer', background: 'rgba(160,174,192,0.08)', border: `1px solid ${C.cyanDim}`, color: C.cyan, fontFamily: FONT.display, fontWeight: 700, fontSize: 14 }}>
          Ir a Ómicrom
        </button>
      </div>
    </div>
  );
}

function SelloVerificado() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center', padding: '8px 12px', borderRadius: 12, background: C.greenFaint, border: `1px solid ${C.greenDim}`, marginBottom: 18 }}>
      <ShieldCheck size={18} style={{ color: C.green }} />
      <span style={{ fontFamily: FONT.mono, fontSize: 11, letterSpacing: 1, color: C.green, fontWeight: 700 }}>FIRMA VÁLIDA · EMITIDA POR ÓMICROM</span>
    </div>
  );
}

/** Versión 2: lo que la persona demostró con examen. */
function Habilidades({ cred }: { cred: CredencialV2 }) {
  return (
    <>
      <SelloVerificado />
      <div style={{ textAlign: 'center', marginBottom: 16 }}>
        <div style={{ fontFamily: FONT.display, fontWeight: 700, fontSize: 22, color: '#eaf4ff' }}>{cred.nombre}</div>
        <div style={{ fontFamily: FONT.mono, fontSize: 12, color: C.cyanDim }}>@{cred.usuario}</div>
      </div>

      <h1 style={{ margin: '0 0 10px', fontFamily: FONT.display, fontWeight: 700, fontSize: 14, color: '#dbeafe' }}>
        Habilidades que aprobó con examen ({cred.habilidades.length})
      </h1>
      <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
        {cred.habilidades.map((h, i) => (
          <li key={`${h.habilidad}-${i}`} style={{ padding: '10px 12px', borderRadius: 10, background: 'rgba(160,174,192,0.05)', border: `1px solid ${C.cyanFaint}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'baseline' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontFamily: FONT.display, fontWeight: 700, fontSize: 14, color: '#eaf4ff' }}>
                <BadgeCheck size={15} style={{ color: C.green, flexShrink: 0 }} aria-hidden="true" />
                {h.habilidad}
              </span>
              <span style={{ fontFamily: FONT.mono, fontSize: 12, color: C.cyan, whiteSpace: 'nowrap' }}>
                {h.puntaje === null ? 'sin puntaje registrado' : `${h.puntaje}/100`}
              </span>
            </div>
            <div style={{ fontFamily: FONT.mono, fontSize: 10, color: C.cyanDim, marginTop: 3 }}>Aprobada: {fechaDia(h.fecha)}</div>
          </li>
        ))}
      </ul>

      <p style={{ fontFamily: FONT.mono, fontSize: 10, color: C.cyanDim, textAlign: 'center', lineHeight: 1.6, marginTop: 16 }}>
        El puntaje es su mejor resultado en esa habilidad, de 0 a 100; se aprueba con 70.<br />
        Emitida el {fechaLarga(cred.emitidaEn)} · vence el {fechaLarga(cred.venceEn)}.<br />
        La firma comprueba que nadie cambió estos datos desde que Ómicrom los emitió.
      </p>
    </>
  );
}

/** Versión 1 (anterior): reputación y ejes. Se conserva para los enlaces ya compartidos. */
function Anterior({ cred }: { cred: CredencialV1 }) {
  const repColor = cred.reputacion >= 70 ? C.green : cred.reputacion >= 50 ? C.gold : C.cyan;
  return (
    <>
      <SelloVerificado />
      <div style={{ textAlign: 'center', marginBottom: 16 }}>
        <div style={{ fontFamily: FONT.display, fontWeight: 700, fontSize: 22, color: '#eaf4ff' }}>{cred.nombre}</div>
        <div style={{ fontFamily: FONT.mono, fontSize: 12, color: C.cyanDim }}>@{cred.usuario} · {cred.tipoNodo} · N{String(cred.nivel).replace(/^N/i, '')}</div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 16 }}>
        <span style={{ fontFamily: FONT.body, fontSize: 12, color: C.cyanDim }}>Reputación</span>
        <span style={{ fontFamily: FONT.display, fontWeight: 700, fontSize: 34, color: repColor, textShadow: `0 0 14px ${repColor}55` }}>{cred.reputacion}</span>
        <span style={{ fontFamily: FONT.mono, fontSize: 12, color: C.cyanDim }}>/100</span>
      </div>

      <div style={{ marginBottom: 16 }}>
        {EJES.map((label, i) => (
          <div key={label} style={{ marginBottom: 8 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: FONT.mono, fontSize: 11, color: '#dbeafe', marginBottom: 3 }}>
              <span>{label}</span><span style={{ color: C.cyan }}>{cred.ejes[i] ?? 0}</span>
            </div>
            <div style={{ height: 6, background: 'rgba(255,255,255,0.08)', borderRadius: 4, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${Math.max(0, Math.min(100, cred.ejes[i] ?? 0))}%`, background: `linear-gradient(90deg, ${C.gold}, ${C.cyan})`, borderRadius: 4 }} />
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <div style={{ flex: 1, textAlign: 'center', padding: '10px', borderRadius: 8, background: 'rgba(160,174,192,0.05)', border: `1px solid ${C.cyanFaint}` }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, fontFamily: FONT.display, fontWeight: 700, fontSize: 20, color: C.green }}><BadgeCheck size={15} /> {cred.competencias}</div>
          <div style={{ fontFamily: FONT.mono, fontSize: 8, color: C.cyanDim, letterSpacing: 1 }}>COMPETENCIAS VALIDADAS</div>
        </div>
        <div style={{ flex: 1, textAlign: 'center', padding: '10px', borderRadius: 8, background: 'rgba(160,174,192,0.05)', border: `1px solid ${C.cyanFaint}` }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, fontFamily: FONT.display, fontWeight: 700, fontSize: 20, color: C.cyan }}><TrendingUp size={15} /> {cred.pe}</div>
          <div style={{ fontFamily: FONT.mono, fontSize: 8, color: C.cyanDim, letterSpacing: 1 }}>PUNTOS DE EXPERIENCIA</div>
        </div>
      </div>

      <p style={{ fontFamily: FONT.mono, fontSize: 9, color: C.cyanDim, textAlign: 'center', lineHeight: 1.5 }}>
        Credencial de la versión anterior de Ómicrom.<br />Emitida el {new Date(cred.emitidaEn).toLocaleString('es-CL')}
      </p>
    </>
  );
}
