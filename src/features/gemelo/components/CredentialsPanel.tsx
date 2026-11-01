// components/perfil/CredentialsPanel.tsx
// Credenciales del Gemelo Digital — estudios, certificados y experiencia
// que alimentan el traditional_score (20% de la reputación).

import { useState, useEffect, useCallback } from 'react';
import {
  GraduationCap, Award, Briefcase, FileCheck, QrCode,
  Plus, Clock, CheckCircle2, XCircle, Trash2, FileText, ExternalLink,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { supabase } from '@/infrastructure/supabase/client';
import { useApp } from '@/store/AppContext';
import { C, FONT, RADIUS, SIZE, tint } from '@/theme';
import { Icon } from '@/shared/components/icons';

// ─── Tipos ──────────────────────────────────────────────────────────────────
type CredType = 'DEGREE' | 'DIPLOMA' | 'CERTIFICATE_QR' | 'CERTIFICATE_DOC' | 'EXPERIENCE';
type CredStatus = 'PENDING' | 'VERIFIED' | 'REJECTED';

interface Credential {
  id: string;
  cred_type: CredType;
  title: string;
  issuer: string | null;
  issue_date: string | null;
  has_qr: boolean;
  verification_url: string | null;
  document_path: string | null;
  experience_years: number | null;
  points: number;
  status: CredStatus;
  created_at: string;
}

const CRED_TYPES: { value: CredType; label: string; pts: string; icon: LucideIcon; needsDoc?: boolean; needsUrl?: boolean; needsYears?: boolean; }[] = [
  { value: 'DEGREE',          label: 'Título universitario',      pts: '+30', icon: GraduationCap, needsDoc: true },
  { value: 'DIPLOMA',         label: 'Diplomado / Posgrado',      pts: '+15', icon: Award,         needsDoc: true },
  { value: 'CERTIFICATE_QR',  label: 'Certificado con QR / link', pts: '+10', icon: QrCode,        needsUrl: true },
  { value: 'CERTIFICATE_DOC', label: 'Certificado (foto/escáner)',pts: '+8',  icon: FileCheck,     needsDoc: true },
  { value: 'EXPERIENCE',      label: 'Experiencia laboral',       pts: '+5/año', icon: Briefcase,  needsYears: true },
];

const STATUS_META: Record<CredStatus, { label: string; color: string; icon: LucideIcon }> = {
  PENDING:  { label: 'PENDIENTE',  color: C.gold,  icon: Clock },
  VERIFIED: { label: 'VERIFICADO', color: C.green, icon: CheckCircle2 },
  REJECTED: { label: 'RECHAZADO',  color: C.red,   icon: XCircle },
};

function typeMeta(t: CredType) {
  return CRED_TYPES.find(c => c.value === t)!;
}

// ─── Componente ───────────────────────────────────────────────────────────────
export function CredentialsPanel() {
  const { profile, refreshProfile } = useApp();
  const [items, setItems]   = useState<Credential[]>([]);
  const [adding, setAdding] = useState(false);
  const [saving, setSaving] = useState(false);
  const [err, setErr]       = useState<string | null>(null);
  const [file, setFile]     = useState<File | null>(null);

  const [form, setForm] = useState({
    cred_type: 'CERTIFICATE_QR' as CredType,
    title: '',
    issuer: '',
    issue_date: '',
    verification_url: '',
    experience_years: '',
  });

  const load = useCallback(async () => {
    if (!profile) return;
    const { data } = await supabase
      .from('credentials').select('*')
      .eq('user_id', profile.id)
      .order('created_at', { ascending: false });
    setItems((data as Credential[]) ?? []);
  }, [profile]);

  useEffect(() => { load(); }, [load]);

  const meta = typeMeta(form.cred_type);
  const verifiedPts = Math.min(
    items.filter(i => i.status === 'VERIFIED').reduce((a, i) => a + (i.points || 0), 0),
    100
  );

  function resetForm() {
    setForm({ cred_type: 'CERTIFICATE_QR', title: '', issuer: '', issue_date: '', verification_url: '', experience_years: '' });
    setFile(null);
    setErr(null);
    setAdding(false);
  }

  async function submit() {
    if (!profile) return;
    setErr(null);

    if (!form.title.trim()) { setErr('Escribe un título.'); return; }
    if (meta.needsUrl && !form.verification_url.trim()) { setErr('Pega el link de verificación del QR.'); return; }
    if (meta.needsYears && !(Number(form.experience_years) > 0)) { setErr('Indica los años de experiencia.'); return; }
    if (meta.needsDoc && !file) { setErr('Sube la foto o PDF del documento como respaldo.'); return; }

    setSaving(true);
    try {
      let documentPath: string | null = null;
      if (meta.needsDoc && file) {
        if (file.size > 8 * 1024 * 1024) throw new Error('El documento supera 8 MB.');
        const safe = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
        const path = `${profile.id}/${Date.now()}_${safe}`;
        const { error: upErr } = await supabase.storage
          .from('credentials').upload(path, file, { contentType: file.type });
        if (upErr) throw upErr;
        documentPath = path;
      }

      const { error: insErr } = await supabase.from('credentials').insert({
        user_id: profile.id,
        cred_type: form.cred_type,
        title: form.title.trim(),
        issuer: form.issuer.trim() || null,
        issue_date: form.issue_date || null,
        verification_url: meta.needsUrl ? (form.verification_url.trim() || null) : null,
        experience_years: meta.needsYears ? Number(form.experience_years) : 0,
        document_path: documentPath,
      });
      if (insErr) throw insErr;

      await load();
      await refreshProfile(); // por si el QR se auto-verificó y subió la reputación
      resetForm();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Error al guardar la credencial.');
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: string) {
    await supabase.from('credentials').delete().eq('id', id);
    await load();
    await refreshProfile();
  }

  async function viewDoc(path: string) {
    const { data } = await supabase.storage.from('credentials').createSignedUrl(path, 120);
    if (data?.signedUrl) window.open(data.signedUrl, '_blank');
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', boxSizing: 'border-box',
    background: tint(C.cyan, 4),
    border: `1px solid ${C.cyanFaint}`,
    borderRadius: RADIUS.md, padding: '9px 11px',
    color: C.ink, fontFamily: FONT.mono, fontSize: SIZE.xs,
    outline: 'none',
  };
  const labelStyle: React.CSSProperties = {
    fontFamily: FONT.mono, fontSize: 9, color: C.cyanDim,
    letterSpacing: 1, textTransform: 'uppercase', marginBottom: 4, display: 'block',
  };

  return (
    <div style={{
      position: 'relative', borderRadius: RADIUS.xl,
      padding: '16px', marginBottom: 14,
      background: C.surface,
      border: `1px solid ${tint(C.cyan, 12)}`,
      overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
        <span style={{ fontFamily: FONT.mono, fontSize: 11, color: C.cyan, letterSpacing: 2, textTransform: 'uppercase' }}>
          CREDENCIALES DEL GEMELO
        </span>
        {!adding && (
          <button onClick={() => setAdding(true)} style={{
            display: 'flex', alignItems: 'center', gap: 4,
            background: C.cyanGhost, border: `1px solid ${C.cyanDim}`,
            borderRadius: 8, padding: '5px 10px', color: C.cyan,
            cursor: 'pointer', fontFamily: FONT.mono, fontSize: 11, letterSpacing: 1,
          }}>
            <Plus size={13} /> AGREGAR
          </button>
        )}
      </div>

      {/* Aporte a la reputación */}
      <div style={{ fontFamily: FONT.mono, fontSize: 9, color: C.cyanDim, marginBottom: 12, letterSpacing: 0.3 }}>
        Aporte verificado al 20% tradicional: <span style={{ color: C.green }}>{verifiedPts}</span> / 100 pts
      </div>

      {/* Formulario */}
      {adding && (
        <div style={{
          borderRadius: RADIUS.lg, padding: 12, marginBottom: 14,
          background: tint(C.cyan, 3), border: `1px solid ${C.cyanFaint}`,
        }}>
          {/* Tipo */}
          <label style={labelStyle}>Tipo de credencial</label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
            {CRED_TYPES.map(ct => {
              const Icon = ct.icon;
              const active = form.cred_type === ct.value;
              return (
                <button key={ct.value} onClick={() => setForm({ ...form, cred_type: ct.value })} style={{
                  display: 'flex', alignItems: 'center', gap: 7, textAlign: 'left',
                  padding: '8px 9px', borderRadius: RADIUS.md, cursor: 'pointer',
                  background: active ? `${C.cyan}14` : 'transparent',
                  border: `1px solid ${active ? C.cyan : C.cyanFaint}`,
                }}>
                  <Icon size={14} style={{ color: active ? C.cyan : C.cyanDim, flexShrink: 0 }} />
                  <span style={{ flex: 1, fontFamily: FONT.mono, fontSize: SIZE.xxs, color: active ? C.ink : C.cyanDim, lineHeight: 1.2 }}>
                    {ct.label}
                  </span>
                  <span style={{ fontFamily: FONT.mono, fontSize: SIZE.xxs, color: C.gold }}>{ct.pts}</span>
                </button>
              );
            })}
          </div>

          {/* Título */}
          <label style={labelStyle}>Título / Nombre</label>
          <input style={{ ...inputStyle, marginBottom: 10 }} value={form.title}
            onChange={e => setForm({ ...form, title: e.target.value })}
            placeholder="Ej: Ingeniería Industrial" />

          {/* Institución */}
          <label style={labelStyle}>Institución / Emisor</label>
          <input style={{ ...inputStyle, marginBottom: 10 }} value={form.issuer}
            onChange={e => setForm({ ...form, issuer: e.target.value })}
            placeholder="Ej: Universidad / Coursera / Empresa" />

          {/* Campos condicionales */}
          {meta.needsUrl && (
            <>
              <label style={{ ...labelStyle, display: 'inline-flex', alignItems: 'center', gap: 5 }}>Link de verificación (del QR) <Icon role="exito" size={12} color={C.green} /> auto-verifica</label>
              <input style={{ ...inputStyle, marginBottom: 10 }} value={form.verification_url}
                onChange={e => setForm({ ...form, verification_url: e.target.value })}
                placeholder="https://verificar.emisor.com/abc123" />
            </>
          )}

          {meta.needsYears && (
            <>
              <label style={labelStyle}>Años de experiencia</label>
              <input style={{ ...inputStyle, marginBottom: 10 }} type="number" min={0} max={40}
                value={form.experience_years}
                onChange={e => setForm({ ...form, experience_years: e.target.value })}
                placeholder="Ej: 3" />
            </>
          )}

          {meta.needsDoc && (
            <>
              <label style={labelStyle}>Documento de respaldo (foto / PDF)</label>
              <label style={{
                display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer',
                padding: '9px 11px', borderRadius: RADIUS.md, marginBottom: 10,
                border: `1px dashed ${file ? C.green : C.cyanDim}`,
                background: tint(C.cyan, 3),
              }}>
                <input type="file" accept="image/*,application/pdf" style={{ display: 'none' }}
                  onChange={e => setFile(e.target.files?.[0] ?? null)} />
                <FileText size={14} style={{ color: file ? C.green : C.cyanDim }} />
                <span style={{ fontFamily: FONT.mono, fontSize: 11, color: file ? C.ink : C.cyanDim, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {file ? file.name : 'Toca para subir foto o PDF'}
                </span>
              </label>
            </>
          )}

          {/* Fecha */}
          <label style={labelStyle}>Fecha de emisión (opcional)</label>
          <input style={{ ...inputStyle, marginBottom: 10 }} type="date" value={form.issue_date}
            onChange={e => setForm({ ...form, issue_date: e.target.value })} />

          {err && (
            <div style={{ fontFamily: FONT.mono, fontSize: 11, color: C.red, marginBottom: 10 }}>{err}</div>
          )}

          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={resetForm} style={{
              flex: 1, padding: '9px', borderRadius: RADIUS.md, cursor: 'pointer',
              background: 'transparent', border: `1px solid ${C.cyanFaint}`,
              color: C.cyanDim, fontFamily: FONT.mono, fontSize: 11, letterSpacing: 1,
            }}>CANCELAR</button>
            <button onClick={submit} disabled={saving} style={{
              flex: 1, padding: '9px', borderRadius: RADIUS.md, cursor: 'pointer',
              background: `${C.cyan}18`, border: `1px solid ${C.cyan}`,
              color: C.cyan, fontFamily: FONT.mono, fontSize: 11, letterSpacing: 1,
              opacity: saving ? 0.6 : 1,
            }}>{saving ? 'GUARDANDO…' : 'GUARDAR'}</button>
          </div>

          {meta.needsUrl && (
            <p style={{ display: 'flex', alignItems: 'flex-start', gap: 6, fontFamily: FONT.mono, fontSize: SIZE.xxs, color: C.cyanDim, marginTop: 8, letterSpacing: 0.2 }}>
              <Icon role="exito" size={12} color={C.green} style={{ marginTop: 2, flexShrink: 0 }} />
              Las credenciales con QR/link se aprueban al instante. Las demás quedan pendientes de revisión.
            </p>
          )}
        </div>
      )}

      {/* Lista */}
      {items.length === 0 && !adding && (
        <div style={{ textAlign: 'center', padding: '18px 0', fontFamily: FONT.mono, fontSize: 11, color: C.cyanDim }}>
          Aún no has cargado credenciales.<br />Agrega tus estudios y certificados para fortalecer tu Gemelo.
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {items.map(c => {
          const tm = typeMeta(c.cred_type);
          const sm = STATUS_META[c.status];
          const Icon = tm.icon;
          const SIcon = sm.icon;
          return (
            <div key={c.id} style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '10px 12px', borderRadius: RADIUS.md,
              background: tint(C.cyan, 3), border: `1px solid ${C.cyanFaint}`,
            }}>
              <div style={{
                width: 32, height: 32, borderRadius: 8, flexShrink: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: `${C.cyan}10`, border: `1px solid ${C.cyanFaint}`,
              }}>
                <Icon size={15} style={{ color: C.cyan }} />
              </div>

              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: FONT.body, fontSize: 13, color: C.ink, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {c.title}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 3 }}>
                  <span style={{
                    display: 'inline-flex', alignItems: 'center', gap: 3,
                    fontFamily: FONT.mono, fontSize: SIZE.xxs, color: sm.color, letterSpacing: 0.5,
                    padding: '1px 6px', borderRadius: 12,
                    background: `${sm.color}14`, border: `1px solid ${sm.color}44`,
                  }}>
                    <SIcon size={9} /> {sm.label}
                  </span>
                  {c.status === 'VERIFIED' && (
                    <span style={{ fontFamily: FONT.mono, fontSize: SIZE.xxs, color: C.green }}>+{c.points} pts</span>
                  )}
                  {c.issuer && (
                    <span style={{ fontFamily: FONT.mono, fontSize: SIZE.xxs, color: C.cyanDim, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      · {c.issuer}
                    </span>
                  )}
                </div>
              </div>

              {c.verification_url && (
                <a href={c.verification_url} target="_blank" rel="noreferrer" title="Ver verificación"
                  style={{ color: C.cyanDim, display: 'flex', flexShrink: 0 }}>
                  <ExternalLink size={14} />
                </a>
              )}
              {c.document_path && (
                <button onClick={() => viewDoc(c.document_path!)} title="Ver documento"
                  style={{ background: 'none', border: 'none', color: C.cyanDim, cursor: 'pointer', display: 'flex', flexShrink: 0 }}>
                  <FileText size={14} />
                </button>
              )}
              <button onClick={() => remove(c.id)} title="Eliminar"
                style={{ background: 'none', border: 'none', color: C.cyanDim, cursor: 'pointer', display: 'flex', flexShrink: 0 }}>
                <Trash2 size={14} />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
