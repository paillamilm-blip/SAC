// features/redviva/components/RedVivaHome.tsx
// Cartografía de evidencia: mapa y lista representan el mismo modelo real.

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { Upload } from 'lucide-react';
import { C, FONT, SIZE, RADIUS, BORDER, LETRA} from '@/theme';
import { useApp } from '@/store/AppContext';
import { useUserColor } from '@/shared/hooks/useUserColor';
import type { TabId } from '@/types/common';
import { useRedViva } from '../hooks/useRedViva';
import { resumenRed, type EstadoNodo, type NodoRed } from '../services/redViva';
import { RedVivaCanvas } from './RedVivaCanvas';
import { NodoFicha } from './NodoFicha';
import { ESTADO_NODO_LABEL, NodoEstadoMarca } from './NodoEstadoMarca';

const INSPECTOR_ID = 'red-viva-inspector';
const ORDEN_ESTADOS: EstadoNodo[] = ['hueco', 'latiendo', 'solido'];

const TITULO_GRUPO: Record<EstadoNodo, string> = {
  hueco: 'Lo declaraste — sin comprobar',
  latiendo: 'Lo estás probando ahora',
  solido: 'Probado',
};

export interface RedVivaHomeProps {
  onAbrirTab?: (tab: TabId) => void;
  onSubirCv?: () => void;
}

export function RedVivaHome({ onAbrirTab, onSubirCv }: RedVivaHomeProps) {
  const { profile, gemelo } = useApp();
  const uc = useUserColor();
  const { model, isLoading, pruebasDisponibles } = useRedViva();
  const [seleccionado, setSeleccionado] = useState<string | null>(null);
  const fichaRef = useRef<HTMLElement>(null);
  const inspectorEnfocadoRef = useRef<string | null>(null);
  const disparadorRef = useRef<HTMLElement | null>(null);
  const filaRefs = useRef(new Map<string, HTMLButtonElement>());

  const reputacion = gemelo?.overallReputation ?? profile?.reputation_score ?? 0;
  const nodoActivo = useMemo(
    () => model.nodos.find((n) => n.id === seleccionado) ?? null,
    [model.nodos, seleccionado],
  );
  const grupos = useMemo(
    () => ORDEN_ESTADOS.map((estado) => ({
      estado,
      nodos: model.nodos.filter((n) => n.estado === estado),
    })).filter((grupo) => grupo.nodos.length > 0),
    [model.nodos],
  );

  const cerrarInspector = useCallback(() => {
    const disparador = disparadorRef.current;
    setSeleccionado(null);
    disparadorRef.current = null;
    window.requestAnimationFrame(() => disparador?.focus({ preventScroll: true }));
  }, []);

  const seleccionar = useCallback((id: string, disparador?: HTMLElement | null) => {
    if (id === seleccionado) {
      cerrarInspector();
      return;
    }
    disparadorRef.current = disparador ?? filaRefs.current.get(id) ?? null;
    setSeleccionado(id);
  }, [cerrarInspector, seleccionado]);

  useEffect(() => {
    if (!seleccionado) return;
    if (!model.nodos.some((n) => n.id === seleccionado)) cerrarInspector();
  }, [cerrarInspector, model.nodos, seleccionado]);

  useLayoutEffect(() => {
    if (!seleccionado || !fichaRef.current) {
      inspectorEnfocadoRef.current = null;
      return;
    }
    if (inspectorEnfocadoRef.current === seleccionado) return;
    fichaRef.current.scrollIntoView({ block: 'nearest', behavior: 'auto' });
    fichaRef.current.focus({ preventScroll: true });
    inspectorEnfocadoRef.current = seleccionado;
  }, [seleccionado]);

  const registrarFila = useCallback((id: string, element: HTMLButtonElement | null) => {
    if (element) filaRefs.current.set(id, element);
    else filaRefs.current.delete(id);
  }, []);

  if (isLoading) {
    return (
      <section aria-busy="true" aria-label="Mapa de habilidades" style={styles.estadoCentro}>
        <p style={styles.textoEstado}>Armando tu red con tus datos…</p>
      </section>
    );
  }

  if (model.vacia) {
    return (
      <section aria-label="Mapa de habilidades vacío" style={{ ...styles.estadoCentro, border: BORDER.default, borderRadius: RADIUS.lg, background: C.surface, padding: 20 }}>
        <h2 style={{ margin: 0, fontFamily: FONT.display, fontSize: SIZE.lg, color: C.ink }}>
          Todavía no vemos tus habilidades
        </h2>
        <p style={{ ...styles.textoEstado, maxWidth: 420 }}>
          Sube tu CV para identificar tus habilidades declaradas y separarlas de las que ya tienen una prueba. Así vas a ver qué puedes demostrar primero.
        </p>
        <button
          type="button"
          onClick={() => {
            if (onSubirCv) onSubirCv();
            else window.dispatchEvent(new CustomEvent('omicron:request-cv'));
          }}
          style={{
            minHeight: 44,
            padding: '10px 16px',
            border: 'none',
            borderRadius: RADIUS.md,
            background: uc,
            color: C.bg,
            fontFamily: FONT.body,
            fontSize: SIZE.sm,
            fontWeight: 700,
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
          }}
        >
          <Upload size={18} aria-hidden="true" />
          Subir mi CV
        </button>
      </section>
    );
  }

  return (
    <section aria-label="Mapa de habilidades" style={styles.raiz}>
      <header style={{ textAlign: 'center', padding: '0 8px' }}>
        <p style={{ margin: '0 0 4px', fontFamily: FONT.mono, fontSize: SIZE.xs, letterSpacing: LETRA.etiqueta, textTransform: 'uppercase', color: C.mut }}>
          {pruebasDisponibles
            ? `${model.totales.probadas}/${model.totales.declaradas} habilidades probadas`
            : `${model.totales.declaradas} ${model.totales.declaradas === 1 ? 'habilidad registrada' : 'habilidades registradas'}`}
        </p>
        <p style={styles.textoEstado}>
          {pruebasDisponibles
            ? resumenRed(model)
            : 'No pudimos consultar tu historial de pruebas. Tus habilidades siguen visibles, pero no vamos a afirmar cuáles están probadas.'}
        </p>
      </header>

      <RedVivaCanvas
        model={model}
        userColor={uc}
        reputacion={reputacion}
        seleccionado={seleccionado}
        onSelect={(nodo) => seleccionar(nodo.id, filaRefs.current.get(nodo.id))}
      />

      <Leyenda
        userColor={uc}
        estados={new Set(model.nodos.map((nodo) => nodo.estado))}
        pruebasDisponibles={pruebasDisponibles}
      />

      {nodoActivo ? (
        <NodoFicha
          ref={fichaRef}
          id={INSPECTOR_ID}
          nodo={nodoActivo}
          userColor={uc}
          pruebasDisponibles={pruebasDisponibles}
          onExamenAbierto={() => onAbrirTab?.('maxskill')}
          onCerrar={cerrarInspector}
        />
      ) : null}

      {grupos.map((grupo) => (
        <section key={grupo.estado} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <h3 style={{ margin: 0, fontFamily: FONT.mono, fontSize: SIZE.xs, letterSpacing: LETRA.medido, textTransform: 'uppercase', color: C.mut, fontWeight: 600 }}>
            {!pruebasDisponibles ? 'Pruebas no consultables' : TITULO_GRUPO[grupo.estado]} · {grupo.nodos.length}
          </h3>
          {grupo.nodos.map((nodo) => (
            <FilaNodo
              key={nodo.id}
              refCallback={(element) => registrarFila(nodo.id, element)}
              nodo={nodo}
              userColor={uc}
              activo={nodo.id === seleccionado}
              inspectorId={INSPECTOR_ID}
              onClick={(element) => seleccionar(nodo.id, element)}
            />
          ))}
        </section>
      ))}
    </section>
  );
}

function Leyenda({
  userColor,
  estados,
  pruebasDisponibles,
}: {
  userColor: string;
  estados: Set<EstadoNodo>;
  pruebasDisponibles: boolean;
}) {
  const visibles = ORDEN_ESTADOS.filter((estado) => estado !== 'latiendo' || estados.has('latiendo'));
  const itemStyle: CSSProperties = { display: 'flex', alignItems: 'center', gap: 6 };
  const labelStyle: CSSProperties = { fontFamily: FONT.body, fontSize: SIZE.xs, color: C.mut };

  return (
    <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', justifyContent: 'center', flexWrap: 'wrap', gap: '8px 14px' }}>
      {visibles.map((estado) => (
        <li key={estado} style={itemStyle}>
          <NodoEstadoMarca estado={estado} color={userColor} size={14} />
          <span style={labelStyle}>
            {!pruebasDisponibles
              ? 'prueba no consultable'
              : ESTADO_NODO_LABEL[estado].toLocaleLowerCase('es-CL')}
          </span>
        </li>
      ))}
    </ul>
  );
}

function FilaNodo({
  nodo,
  userColor,
  activo,
  inspectorId,
  onClick,
  refCallback,
}: {
  nodo: NodoRed;
  userColor: string;
  activo: boolean;
  inspectorId: string;
  onClick: (element: HTMLButtonElement) => void;
  refCallback: (element: HTMLButtonElement | null) => void;
}) {
  const acento = userColor;
  const cifra = cifraNodo(nodo);
  return (
    <button
      ref={refCallback}
      type="button"
      onClick={(event) => onClick(event.currentTarget)}
      aria-expanded={activo}
      aria-controls={activo ? inspectorId : undefined}
      style={{
        display: 'flex', alignItems: 'center', gap: 10, width: '100%', minHeight: 44,
        padding: '8px 12px', borderRadius: RADIUS.md,
        border: activo ? `1px solid ${acento}` : BORDER.faint,
        background: activo ? C.glass2 : C.glass, cursor: 'pointer', textAlign: 'left',
      }}
    >
      <NodoEstadoMarca estado={nodo.estado} color={acento} size={16} />
      <span style={{ flex: 1, minWidth: 0, fontFamily: FONT.body, fontSize: SIZE.sm, color: C.ink, fontWeight: nodo.estado === 'solido' ? 600 : 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {nodo.label}
      </span>
      {cifra ? (
        <span style={{ fontFamily: FONT.mono, fontSize: SIZE.xs, color: C.mut, flexShrink: 0 }}>
          {cifra}
        </span>
      ) : null}
    </button>
  );
}

function cifraNodo(nodo: NodoRed): string | null {
  if (nodo.estado === 'solido') return nodo.provenScore === null ? 'probada' : `${nodo.provenScore}/100`;
  return nodo.declaredPct !== null && nodo.declaredPct > 0 ? `dice ${nodo.declaredPct}/100` : null;
}

const styles: Record<string, CSSProperties> = {
  raiz: { display: 'flex', flexDirection: 'column', gap: 14, padding: '4px 2px 20px' },
  estadoCentro: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, textAlign: 'center', minHeight: 180 },
  textoEstado: { margin: 0, fontFamily: FONT.body, fontSize: SIZE.sm, color: C.ink, lineHeight: 1.5 },
};
