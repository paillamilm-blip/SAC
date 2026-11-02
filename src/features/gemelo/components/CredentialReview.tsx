// components/perfil/CredentialReview.tsx
// Panel para DOCENTES/validadores: aprobar o rechazar credenciales pendientes.
// Se auto-oculta si el usuario no es validador (is_verified_professional).

import { useState, useEffect, useCallback } from 'react';
import { ShieldCheck, Check, X, FileText, ExternalLink, GraduationCap, Award, Briefcase, FileCheck, QrCode } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { supabase } from '@/infrastructure/supabase/client';
import { useApp } from '@/store/AppContext';
import { useToast } from '@/shared/components/Toast';
import { C, FONT, RADIUS, tint, LETRA} from '@/theme';
import { Icon as OmicronIcon } from '@/shared/components/icons';

interface Pending {
  id: string; user_id: string; username: string; cred_type: string; title: string;
  issuer: string | null; document_path: string | null; verification_url: string | null;
  experience_years: number | null; created_at: string;
}

const TYPE_ICON: Record<string, LucideIcon> = {
  DEGREE: GraduationCap, DIPLOMA: Award, CERTIFICATE_QR: QrCode, CERTIFICATE_DOC: FileCheck, EXPERIENCE: Briefcase,
};

export function CredentialReview() {
  const { profile } = useApp();
  const { toast } = useToast();
  const isValidator =
    (profile as { is_verified_professional?: boolean } | null | undefined)?.is_verified_professional === true;

  const [items, setItems] = useState<Pending[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  const load = useCallback(async () => {
    if (!isValidator) return;
    const { data, error } = await supabase.rpc('get_pending_credentials');
    if (!error) setItems((data as Pending[]) ?? []);
    setLoaded(true);
  }, [isValidator]);

  useEffect(() => { load(); }, [load]);

  if (!isValidator) return null;

  async function review(id: string, approve: boolean) {
    setBusy(id);
    try {
      let reason: string | null = null;
      if (!approve) {
        reason = window.prompt('Motivo del rechazo:', 'No cumple los requisitos');
        if (reason === null) { setBusy(null); return; }
      }
      const { error } = await supabase.rpc('review_credential', { p_credential_id: id, p_approve: approve, p_reason: reason });
      if (error) throw error;
      setItems(prev => prev.filter(i => i.id !== id));
      toast(approve ? 'Credencial aprobada' : 'Credencial rechazada', 'success');
    } catch (e) {
      toast('Error: ' + ((e as Error).message ?? e), 'error');
    } finally {
      setBusy(null);
    }
  }

  async function viewDoc(path: string) {
    const { data } = await supabase.storage.from('credentials').createSignedUrl(path, 120);
    if (data?.signedUrl) window.open(data.signedUrl, '_blank');
  }

  return (
    <div style={{
      position: 'relative', borderRadius: RADIUS.xl, padding: '16px', marginBottom: 14,
      background: C.surface, border: `1px solid ${C.gold}44`, overflow: 'hidden',
    }}>
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg, transparent, ${C.gold}, transparent)` }} />
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
        <ShieldCheck size={15} style={{ color: C.gold }} />
        <span style={{ fontFamily: FONT.mono, fontSize: 11, color: C.gold, letterSpacing: LETRA.anunciada, textTransform: 'uppercase' }}>
          PANEL DE VALIDADOR · DOCENTE
        </span>
      </div>
      {items.length > 0 && (
        <div style={{ fontFamily: FONT.mono, fontSize: 9, color: C.cyanDim, marginBottom: 12 }}>
          {items.length === 1 ? '1 credencial por validar' : `${items.length} credenciales por validar`}
        </div>
      )}

      {loaded && items.length === 0 && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, textAlign: 'center', padding: '14px 0', fontFamily: FONT.mono, fontSize: 11, color: C.green }}>
          <OmicronIcon role="exito" size={13} /> No hay credenciales pendientes.
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {items.map(c => {
          const Icon = TYPE_ICON[c.cred_type] ?? FileCheck;
          return (
            <div key={c.id} style={{
              padding: '10px 12px', borderRadius: RADIUS.md,
              background: tint(C.cyan, 4), border: `1px solid ${C.cyanFaint}`,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <div style={{ width: 30, height: 30, borderRadius: 8, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: `${C.cyan}10`, border: `1px solid ${C.cyanFaint}` }}>
                  <Icon size={14} style={{ color: C.cyan }} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontFamily: FONT.body, fontSize: 13, color: C.ink }}>{c.title}</div>
                  <div style={{ fontFamily: FONT.mono, fontSize: 9, color: C.cyanDim }}>
                    @{c.username}{c.issuer ? ` · ${c.issuer}` : ''}{c.experience_years ? ` · ${c.experience_years} años` : ''}
                  </div>
                </div>
                {c.verification_url && (
                  <a href={c.verification_url} target="_blank" rel="noreferrer" title="Ver verificación" style={{ color: C.cyanDim, display: 'flex' }}>
                    <ExternalLink size={14} />
                  </a>
                )}
                {c.document_path && (
                  <button onClick={() => viewDoc(c.document_path!)} title="Ver documento" style={{ background: 'none', border: 'none', color: C.cyan, cursor: 'pointer', display: 'flex' }}>
                    <FileText size={15} />
                  </button>
                )}
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => review(c.id, true)} disabled={busy === c.id} style={{
                  flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
                  padding: '8px', borderRadius: 8, cursor: 'pointer',
                  background: `${C.green}18`, border: `1px solid ${C.green}`, color: C.green,
                  fontFamily: FONT.mono, fontSize: 11, letterSpacing: LETRA.etiqueta, fontWeight: 700, opacity: busy === c.id ? 0.5 : 1,
                }}><Check size={13} /> APROBAR</button>
                <button onClick={() => review(c.id, false)} disabled={busy === c.id} style={{
                  flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
                  padding: '8px', borderRadius: 8, cursor: 'pointer',
                  background: `${C.red}14`, border: `1px solid ${C.red}`, color: C.red,
                  fontFamily: FONT.mono, fontSize: 11, letterSpacing: LETRA.etiqueta, fontWeight: 700, opacity: busy === c.id ? 0.5 : 1,
                }}><X size={13} /> RECHAZAR</button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
