// components/perfil/RedSocial.tsx
// La credencial pública: compartir la propia (QR + link) y ver la de otra
// persona por deep-link ?perfil=. Acá ya no se conecta ni se chatea con nadie:
// la red de contactos y los mensajes directos salieron del producto porque
// nunca tuvo usuarios suficientes como para existir.

import { useState, useEffect } from 'react';
import {
  X, Share2, Copy, Check, QrCode,
  BadgeCheck, MapPin, Shield, ShieldCheck, Loader2,
} from 'lucide-react';
import { supabase } from '@/infrastructure/supabase/client';
import { useApp } from '@/store/AppContext';
import { ProgressRadar } from '@/features/gemelo/components/ProgressRadar';
import { useUserColor } from '@/shared/hooks/useUserColor';
import { computeOrbFusion, type Skill } from '@/features/gemelo/services/orbFusion';
import { BLUR, HALO, C, FONT, RADIUS, SIZE, ANIM, LETRA} from '@/theme';
import { Icon, type IconRole } from '@/shared/components/icons';
import type { GemeloDigital } from '@/types';

// ─── Helpers ────────────────────────────────────────────────────────────────
// El rango se dibuja con el trazo del sistema: antes cada nivel llevaba un
// emoji, y el emoji se pinta con la paleta del sistema operativo del usuario.
function rango(rep: number): { label: string; icon: IconRole; color: string } {
  if (rep >= 80) return { label: 'SENIOR', icon: 'senior', color: C.green };
  if (rep >= 70) return { label: 'AVANZADO', icon: 'avanzado', color: C.cyan };
  if (rep >= 50) return { label: 'INTERMEDIO', icon: 'intermedio', color: C.gold };
  return { label: 'EN FORMACIÓN', icon: 'novato', color: C.purple };
}

function profileLink(username: string) {
  const base = `${window.location.origin}${window.location.pathname}`;
  return `${base}?perfil=${encodeURIComponent(username)}`;
}

function initialsOf(name?: string) {
  return (name ?? 'U').split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();
}

// ─── Overlay base ─────────────────────────────────────────────────────────────
function Overlay({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: C.wash, backdropFilter: `blur(${BLUR.vaho}px)`,
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 18,
        animation: ANIM.fade,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: 420, maxHeight: '92vh', overflowY: 'auto',
          borderRadius: RADIUS.xl, background: `linear-gradient(165deg, ${C.nocheClara}, ${C.noche})`,
          border: `1px solid ${C.cyanDim}`, boxShadow: `0 20px 60px ${C.scrim}`,
          position: 'relative',
        }}
      >
        {children}
      </div>
    </div>
  );
}

function CloseBtn({ onClose }: { onClose: () => void }) {
  return (
    <button
      onClick={onClose}
      aria-label="Cerrar"
      style={{
        position: 'absolute', top: 12, right: 12, zIndex: 2,
        width: 32, height: 32, borderRadius: 12, cursor: 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: C.glass2, border: `1px solid ${C.cyanDim}`, color: C.cyan,
      }}
    >
      <X size={16} />
    </button>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// 1) COMPARTIR CREDENCIAL — QR + link
// ════════════════════════════════════════════════════════════════════════════
export function ShareCredentialModal({ username, fullName, onClose }: {
  username: string; fullName?: string; onClose: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const uc = useUserColor();
  const link = profileLink(username);
  const qrSrc = `https://api.qrserver.com/v1/create-qr-code/?size=260x260&margin=10&data=${encodeURIComponent(link)}`;

  const [passportUrl, setPassportUrl] = useState<string | null>(null);
  const [issuing, setIssuing] = useState(false);
  const [copiedP, setCopiedP] = useState(false);

  async function generatePassport() {
    setIssuing(true);
    try {
      const { data, error } = await supabase.functions.invoke('credential', { body: { action: 'issue' } });
      const d = data as { token?: string; error?: string };
      if (error || !d?.token) return;
      const base = `${window.location.origin}${window.location.pathname}`;
      setPassportUrl(`${base}?verificar=${d.token}`);
    } finally {
      setIssuing(false);
    }
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  async function nativeShare() {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Credencial de ${fullName ?? username} · Ómicrom`,
          text: 'Mira mi Gemelo Digital en Ómicrom',
          url: link,
        });
      } catch { /* cancelado */ }
    } else {
      copy();
    }
  }

  return (
    <Overlay onClose={onClose}>
      <CloseBtn onClose={onClose} />
      <div style={{ padding: 22 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
          <Share2 size={16} style={{ color: uc }} />
          <span style={{ fontFamily: FONT.display, fontWeight: 700, fontSize: 20, color: C.ink }}>
            Comparte tu credencial
          </span>
        </div>
        <p style={{ margin: '0 0 18px', fontFamily: FONT.body, fontSize: SIZE.sm, color: C.cyanDim, lineHeight: 1.4 }}>
          Muestra este QR en persona o envía el link. Quien lo abra verá tu Gemelo Digital y podrá conectar contigo.
        </p>

        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 18 }}>
          <div style={{ padding: 12, borderRadius: 16, background: '#fff', boxShadow: `0 0 ${HALO.resplandor}px ${uc}33` }}>
            <img
              src={qrSrc}
              alt="Código QR de tu credencial"
              width={220}
              height={220}
              style={{ display: 'block', width: 220, height: 220 }}
            />
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14, justifyContent: 'center' }}>
          <QrCode size={13} style={{ color: C.cyanDim }} />
          <span style={{ fontFamily: FONT.mono, fontSize: 11, color: C.cyanDim, letterSpacing: LETRA.etiqueta }}>
            @{username}
          </span>
        </div>

        <button
          onClick={nativeShare}
          style={{
            width: '100%', padding: '13px', borderRadius: RADIUS.lg, cursor: 'pointer',
            background: uc, border: 'none', color: C.onAccent,
            fontFamily: FONT.display, fontWeight: 700, fontSize: 13,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 10,
          }}
        >
          <Share2 size={16} /> Compartir link
        </button>
        <button
          onClick={copy}
          style={{
            width: '100%', padding: '12px', borderRadius: RADIUS.lg, cursor: 'pointer',
            background: C.glass, border: `1px solid ${uc}66`, color: uc,
            fontFamily: FONT.mono, fontSize: 12, letterSpacing: LETRA.denso,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          }}
        >
          {copied ? <Check size={15} /> : <Copy size={15} />}
          {copied ? 'COPIADO' : 'COPIAR LINK'}
        </button>

        <div style={{ height: 1, background: C.cyanFaint, margin: '18px 0' }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
          <ShieldCheck size={15} style={{ color: C.green }} />
          <span style={{ fontFamily: FONT.display, fontWeight: 700, fontSize: 15, color: C.ink }}>Pasaporte Verificable</span>
        </div>
        <p style={{ margin: '0 0 12px', fontFamily: FONT.body, fontSize: 12, color: C.cyanDim, lineHeight: 1.4 }}>
          Credencial firmada: quien la reciba puede comprobar que es auténtica y no fue alterada, <b>sin necesidad de cuenta</b>.
        </p>
        {!passportUrl ? (
          <button onClick={generatePassport} disabled={issuing}
            style={{ width: '100%', padding: '12px', borderRadius: RADIUS.lg, cursor: 'pointer', background: C.greenFaint, border: `1px solid ${C.greenDim}`, color: C.green, fontFamily: FONT.display, fontWeight: 700, fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            {issuing ? <Loader2 size={16} style={{ animation: ANIM.spin }} /> : <ShieldCheck size={16} />}
            {issuing ? 'Firmando…' : 'Generar Pasaporte Verificable'}
          </button>
        ) : (
          <>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12 }}>
              <div style={{ padding: 10, borderRadius: 14, background: '#fff', boxShadow: `0 0 ${HALO.resplandor}px ${C.green}33` }}>
                <img src={`https://api.qrserver.com/v1/create-qr-code/?size=220x220&margin=8&data=${encodeURIComponent(passportUrl)}`} width={190} height={190} alt="QR Pasaporte Verificable" style={{ display: 'block', width: 190, height: 190 }} />
              </div>
            </div>
            <button onClick={() => { navigator.clipboard?.writeText(passportUrl); setCopiedP(true); setTimeout(() => setCopiedP(false), 2000); }}
              style={{ width: '100%', padding: '12px', borderRadius: RADIUS.lg, cursor: 'pointer', background: C.glass, border: `1px solid ${C.greenDim}`, color: C.green, fontFamily: FONT.mono, fontSize: 12, letterSpacing: LETRA.denso, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
              {copiedP ? <Check size={15} /> : <Copy size={15} />} {copiedP ? 'COPIADO' : 'COPIAR LINK VERIFICABLE'}
            </button>
          </>
        )}
      </div>
    </Overlay>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// 2) CREDENCIAL PÚBLICA — lo que ve quien escanea + botón conectar
// ════════════════════════════════════════════════════════════════════════════
interface PublicCred {
  id: string; username: string; full_name: string; avatar_url: string | null;
  bio: string | null; location: string | null; node_type: string; node_level: number;
  is_verified_professional: boolean; reputation_score: number;
  execution_score: number; quality_score: number; transcendence_score: number;
  foundation_score: number; pe_points: number; total_contracts_completed: number;
  skills_detail?: { name: string; pct: number }[];
}

export function PublicCredentialModal({ username, onClose }: { username: string; onClose: () => void }) {
  const { profile } = useApp();
  const uc = useUserColor();
  const [cred, setCred] = useState<PublicCred | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      const { data, error } = await supabase.rpc('get_public_credential', { p_username: username });
      const row = Array.isArray(data) ? data[0] : null;
      if (!alive) return;
      if (error || !row) { setNotFound(true); setLoading(false); return; }
      // skills_detail llega como jsonb (supabase-js lo parsea a JS). Guardamos
      // solo entradas con nombre válido y pct numérico (fusión de orbes 5b).
      const rawSkills: unknown = row.skills_detail;
      const skillsDetail: { name: string; pct: number }[] = Array.isArray(rawSkills)
        ? rawSkills
            .map((x) => {
              const o = x as { name?: unknown; pct?: unknown };
              return { name: String(o.name ?? ''), pct: Number(o.pct) || 0 };
            })
            .filter((s) => !!s.name)
        : [];
      const c: PublicCred = {
        id: row.id,
        username: row.username,
        full_name: row.full_name ?? row.username,
        avatar_url: row.avatar_url,
        bio: row.bio,
        location: row.location,
        node_type: row.node_type ?? 'Nodo Operativo',
        node_level: Number(row.node_level ?? 1),
        is_verified_professional: !!row.is_verified_professional,
        reputation_score: Number(row.reputation_score ?? 0),
        execution_score: Number(row.execution_score ?? 0),
        quality_score: Number(row.quality_score ?? 0),
        transcendence_score: Number(row.transcendence_score ?? 0),
        foundation_score: Number(row.foundation_score ?? 0),
        pe_points: Number(row.pe_points ?? 0),
        total_contracts_completed: Number(row.total_contracts_completed ?? 0),
        skills_detail: skillsDetail,
      };
      setCred(c);
      setLoading(false);
    })();
    return () => { alive = false; };
  }, [username]);

  const isSelf = !!(profile && cred && profile.id === cred.id);

  const gemelo: GemeloDigital | null = cred ? {
    execution: cred.execution_score,
    quality: cred.quality_score,
    transcendence: cred.transcendence_score,
    foundation: cred.foundation_score,
    overallReputation: cred.reputation_score,
  } : null;

  const r = cred ? rango(cred.reputation_score) : null;

  return (
    <Overlay onClose={onClose}>
      <CloseBtn onClose={onClose} />

      {loading && (
        <div style={{ padding: 60, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
          <Loader2 size={26} style={{ color: C.cyan, animation: ANIM.spin }} />
          <span style={{ fontFamily: FONT.mono, fontSize: 11, color: C.cyanDim, letterSpacing: LETRA.etiqueta }}>CARGANDO CREDENCIAL…</span>
        </div>
      )}

      {!loading && notFound && (
        <div style={{ padding: 50, textAlign: 'center' }}>
          <p style={{ fontFamily: FONT.display, fontWeight: 700, fontSize: 16, color: C.ink, margin: '0 0 6px' }}>
            Credencial no encontrada
          </p>
          <p style={{ fontFamily: FONT.body, fontSize: SIZE.sm, color: C.cyanDim, margin: 0 }}>
            El usuario @{username} no existe o el link es inválido.
          </p>
        </div>
      )}

      {!loading && cred && r && gemelo && (
        <div style={{ padding: 20 }}>
          <div style={{ height: 3, borderRadius: 3, marginBottom: 16, background: `linear-gradient(90deg, transparent, ${r.color}, transparent)` }} />

          <div style={{ display: 'flex', gap: 16, alignItems: 'center', marginBottom: 16 }}>
            <div style={{
              width: 72, height: 72, borderRadius: 18, overflow: 'hidden', flexShrink: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: cred.avatar_url ? C.noche : `linear-gradient(135deg, ${r.color}, ${C.cyan})`,
              color: C.onAccent, fontWeight: 700, fontSize: SIZE.xxl, fontFamily: FONT.display,
              boxShadow: `0 0 ${HALO.marca}px ${r.color}44`,
            }}>
              {cred.avatar_url
                ? <img src={cred.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : initialsOf(cred.full_name)}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontFamily: FONT.display, fontWeight: 700, fontSize: 20, color: C.ink, lineHeight: 1.1 }}>
                {cred.full_name}
              </div>
              <div style={{ fontFamily: FONT.mono, fontSize: 12, color: C.cyanDim, marginTop: 2 }}>@{cred.username}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginTop: 8 }}>
                <span style={{
                  display: 'inline-flex', alignItems: 'center', gap: 4, padding: '4px 10px', borderRadius: 999,
                  background: `${r.color}14`, border: `1px solid ${r.color}44`,
                }}>
                  <Shield size={11} style={{ color: r.color }} />
                  <span style={{ fontFamily: FONT.mono, fontSize: 9, color: r.color, letterSpacing: LETRA.etiqueta }}>
                    {cred.node_type} · N{cred.node_level}
                  </span>
                </span>
                {cred.is_verified_professional && (
                  <span style={{
                    display: 'inline-flex', alignItems: 'center', gap: 4, padding: '4px 9px', borderRadius: 999,
                    background: C.greenFaint, border: `1px solid ${C.greenDim}`,
                  }}>
                    <BadgeCheck size={12} style={{ color: C.green }} />
                    <span style={{ fontFamily: FONT.mono, fontSize: 9, color: C.green, letterSpacing: LETRA.etiqueta }}>VERIFICADO</span>
                  </span>
                )}
              </div>
              {cred.location && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 6, fontFamily: FONT.body, fontSize: 11, color: C.cyanDim }}>
                  <MapPin size={11} /> {cred.location}
                </div>
              )}
            </div>
          </div>

          <div style={{
            padding: '12px 8px 4px', borderRadius: RADIUS.lg, marginBottom: 16,
            background: C.glass, border: `1px solid ${C.line}`,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 9, marginBottom: 2 }}>
              <span style={{ fontFamily: FONT.body, fontSize: 12, color: C.cyanDim }}>Reputación</span>
              <span style={{ fontFamily: FONT.display, fontWeight: 700, fontSize: 30, color: r.color, textShadow: `0 0 ${HALO.marca}px ${r.color}55` }}>
                {cred.reputation_score.toFixed(1)}
              </span>
              <span style={{ fontFamily: FONT.mono, fontSize: 11, color: C.cyanDim }}>/100</span>
              <span style={{
                display: 'flex', alignItems: 'center', gap: 4,
                padding: '3px 9px', borderRadius: RADIUS.pill, background: `${r.color}18`, border: `1px solid ${r.color}44`,
                fontFamily: FONT.mono, fontSize: 9, color: r.color, letterSpacing: LETRA.etiqueta,
              }}>
                <Icon role={r.icon} size={11} color={r.color} />
                {r.label}
              </span>
            </div>
            <ProgressRadar gemelo={gemelo} size="sm" showHeader={false} showScores={false} showAlert={false} showFooter={false} />
          </div>

          {profile && !isSelf && (() => {
            const mine = [Number(profile.execution_score) || 0, Number(profile.quality_score) || 0, Number(profile.transcendence_score) || 0, Number(profile.foundation_score) || 0];
            const theirs = [cred.execution_score, cred.quality_score, cred.transcendence_score, cred.foundation_score];
            const aff = Math.round(mine.reduce((s, m, i) => s + Math.max(m, theirs[i]), 0) / mine.length);
            const ac = aff >= 75 ? C.green : aff >= 50 ? C.gold : C.cyan;
            return (
              <div style={{ marginBottom: 14, padding: '12px 14px', borderRadius: RADIUS.lg, background: `${ac}10`, border: `1px solid ${ac}40` }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontFamily: FONT.mono, fontSize: SIZE.xxs, color: ac, letterSpacing: LETRA.etiqueta }}>AFINIDAD DE COLABORACION</span>
                  <span style={{ fontFamily: FONT.display, fontWeight: 700, fontSize: 20, color: ac }}>{aff}%</span>
                </div>
                <p style={{ margin: '6px 0 0', fontFamily: FONT.body, fontSize: 11, color: C.cyanDim, lineHeight: 1.4 }}>
                  Juntos cubren el {aff}% de las 4 dimensiones del Gemelo. Mientras mas alto, mejor se complementan para contratos exigentes.
                </p>
              </div>
            );
          })()}

          {/* Fusión de orbes: en qué crecemos juntos (compartir, aprender, enseñar). */}
          {profile && !isSelf && (() => {
            // Mis skills siguen el mismo patrón que GemeloTab (skills_detail o fallback).
            const mineDetails = profile.skills_detail ?? [];
            const mine: Skill[] = mineDetails.length > 0
              ? mineDetails
              : (profile.skills ?? []).map((s: string, i: number) => ({ name: s, pct: Math.max(30, 85 - i * 8) }));
            // Skills de la otra persona expuestas por el RPC get_public_credential.
            const theirs: Skill[] = cred.skills_detail ?? [];
            const fusion = computeOrbFusion(mine, theirs);
            const hasData = fusion.shared.length > 0 || fusion.complementary.length > 0 || fusion.onlyTheirs.length > 0;

            return (
              <div style={{ marginBottom: 14, padding: '12px 14px', borderRadius: RADIUS.lg, background: C.glass, border: `1px solid ${C.line}` }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                  <span style={{ fontFamily: FONT.mono, fontSize: SIZE.xxs, color: uc, letterSpacing: LETRA.etiqueta }}>FUSIÓN DE ORBES</span>
                </div>

                {!hasData ? (
                  <p style={{ margin: 0, fontFamily: FONT.body, fontSize: 11, color: C.cyanDim, lineHeight: 1.45 }}>
                    Cuando ambos publiquen sus habilidades con detalle, aquí verás en qué coinciden, qué puedes aprender y qué puedes enseñar para crecer juntos en la red.
                  </p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {fusion.shared.length > 0 && (
                      <div>
                        <span style={{ fontFamily: FONT.mono, fontSize: 9, color: uc, letterSpacing: LETRA.etiqueta }}>EN COMÚN</span>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 5 }}>
                          {fusion.shared.map((s) => (
                            <span key={`shared-${s.name}`} style={{
                              padding: '3px 9px', borderRadius: 999, background: `${uc}18`, border: `1px solid ${uc}44`,
                              fontFamily: FONT.mono, fontSize: SIZE.xxs, color: uc,
                            }}>
                              {s.name}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {fusion.complementary.length > 0 && (
                      <div>
                        <span style={{ fontFamily: FONT.mono, fontSize: 9, color: uc, letterSpacing: LETRA.etiqueta }}>SE COMPLEMENTAN</span>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 5 }}>
                          {fusion.complementary.map((s) => (
                            <div key={`comp-${s.name}`} style={{ fontFamily: FONT.body, fontSize: 11, color: C.cyanDim, lineHeight: 1.4 }}>
                              {s.direction === 'learn'
                                ? <>Puedes aprender <strong style={{ color: uc }}>{s.name}</strong> ({s.theirsPct}/100) de {cred.full_name}.</>
                                : <>Puedes enseñar <strong style={{ color: uc }}>{s.name}</strong> ({s.minePct}/100) a {cred.full_name}.</>}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {fusion.onlyTheirs.length > 0 && (
                      <div>
                        <span style={{ fontFamily: FONT.mono, fontSize: 9, color: uc, letterSpacing: LETRA.etiqueta }}>APRENDER ALGO NUEVO</span>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 5 }}>
                          {fusion.onlyTheirs.map((s) => (
                            <span key={`only-${s.name}`} style={{
                              padding: '3px 9px', borderRadius: 999, background: `${uc}12`, border: `1px solid ${uc}44`,
                              fontFamily: FONT.mono, fontSize: SIZE.xxs, color: uc,
                            }}>
                              {s.name} · {s.theirsPct}/100
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })()}

          {isSelf && (
            <div style={{ textAlign: 'center', fontFamily: FONT.mono, fontSize: 11, color: C.cyanDim, padding: 8 }}>
              Esta es tu propia credencial
            </div>
          )}
        </div>
      )}
    </Overlay>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// 3) GATE deep-link: abre la credencial pública si la URL trae ?perfil=
// ════════════════════════════════════════════════════════════════════════════
export function PublicProfileGate() {
  const { profile } = useApp();
  const [target, setTarget] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const u = params.get('perfil');
    if (u) setTarget(u);
  }, []);

  function close() {
    setTarget(null);
    const url = new URL(window.location.href);
    url.searchParams.delete('perfil');
    window.history.replaceState({}, '', url.pathname + url.hash);
  }

  if (!target) return null;
  if (profile && profile.username && profile.username.toLowerCase() === target.toLowerCase()) {
    return null;
  }
  return <PublicCredentialModal username={target} onClose={close} />;
}

