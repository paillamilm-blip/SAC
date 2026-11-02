// features/omicron/components/OmicronBar.tsx
// La barra del asistente Ómicrom, extraída de OrbShell.tsx a un componente
// reutilizable. Dos modos:
//   • 'ordenes' (default): comportamiento actual, INTACTO — voz/texto navegan y
//     responden. La barra en reposo respira (omi-breathe) con halo del color del
//     usuario, mic 44×44 (icono 'microfono'), input con el placeholder EXACTO,
//     enviar 44×44 (icono 'enviar').
//   • 'lectura': añade ARRIBA una burbuja donde Ómicrom LEE la red (texto que le
//     pasa el shell desde resumenRed()/textoEstado(), sin jerga) + una lucecita
//     chiquita de PRESENCIA (punto en el color del usuario, omi-breathe) que se
//     detiene bajo prefers-reduced-motion. Marca visible 'Ómicrom' (M final).
//
// TODA la lógica (handleTextInput, toggleListening, isListening, inputFocused,
// responseMsg, helpMessage, resetIdle) vive en OrbShell y llega por props: la
// extracción NO cambia el comportamiento del modo órdenes. Los identificadores
// técnicos 'omicron' (con N), eventos y claves NO se tocan; solo el texto
// visible usa la marca 'Ómicrom'.

import { useReducedMotion } from 'framer-motion';
import { BLUR, HALO, LEJANA, C, FONT, tint, ANIM, LETRA} from '@/theme';
import { Icon } from '@/shared/components/icons';

/** Placeholder EXACTO en reposo (home) y en fullscreen. No cambiar los textos. */
export const OMICRON_BAR_PLACEHOLDER_RESTING = '¿Qué quieres hacer hoy? Habla o escríbeme…';
export const OMICRON_BAR_PLACEHOLDER_FULLSCREEN = 'Pregunta a Ómicrom…';

export type OmicronBarMode = 'ordenes' | 'lectura';

export interface OmicronBarProps {
  mode?: OmicronBarMode;
  /** Color del usuario (hex) para el halo y la lucecita de presencia. */
  orbColor: string;
  /** Valor controlado del input. */
  inputText: string;
  onInputChange: (value: string) => void;
  onSubmit: () => void;
  onFocus: () => void;
  onBlur: () => void;
  inputFocused: boolean;
  /** Si hay una respuesta activa (para atenuar el halo de reposo, igual que hoy). */
  hasResponse: boolean;
  /** Mic: escuchando o no + toggle. */
  isListening: boolean;
  onToggleListening: () => void;
  /** true = usar el placeholder de fullscreen. */
  fullscreen?: boolean;
  /**
   * SOLO modo 'lectura': lo que Ómicrom lee de la red. El shell lo compone con
   * resumenRed()/textoEstado() (sin jerga). Si falta, la burbuja no se muestra.
   */
  lectura?: string | null;
}

export function OmicronBar({
  mode = 'ordenes',
  orbColor,
  inputText,
  onInputChange,
  onSubmit,
  onFocus,
  onBlur,
  inputFocused,
  hasResponse,
  isListening,
  onToggleListening,
  fullscreen = false,
  lectura = null,
}: OmicronBarProps) {
  const prefersReducedMotion = useReducedMotion();
  const mostrarLectura = mode === 'lectura' && !!lectura;
  // La lucecita de presencia se detiene bajo prefers-reduced-motion (queda
  // visible, sin loop). La respiración es el único movimiento permanente permitido
  // aquí, tal como el 'latiendo' de la Red Viva.
  const presenceAnimation = prefersReducedMotion ? 'none' : ANIM.breathe;

  return (
    <>
      {mostrarLectura && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 8 }}>
          {/* Marca visible + lucecita de presencia chiquita */}
          <p
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
              margin: 0, fontFamily: FONT.mono, fontSize: 11, letterSpacing: LETRA.etiqueta,
              textTransform: 'uppercase', color: C.mut,
            }}
          >
            <span
              aria-hidden="true"
              style={{
                width: 7, height: 7, borderRadius: '50%', background: orbColor,
                boxShadow: `0 0 ${HALO.ascua}px ${orbColor}`, animation: presenceAnimation,
              }}
            />
            Ómicrom · activo
          </p>

          {/* Burbuja de lectura: Ómicrom lee la red (texto real, sin jerga) */}
          <div
            data-omicrom-reply="true"
            style={{
              display: 'flex', alignItems: 'flex-start', gap: 9, padding: '11px 13px',
              borderRadius: '14px 14px 14px 4px', border: `1px solid ${C.line}`,
              background: C.surface, backdropFilter: `blur(${BLUR.cristal}px)`, WebkitBackdropFilter: `blur(${BLUR.cristal}px)`,
              minWidth: 0,
            }}
          >
            <span
              aria-hidden="true"
              style={{
                flex: '0 0 auto', marginTop: 4, width: 8, height: 8, borderRadius: '50%',
                background: orbColor, boxShadow: `0 0 ${HALO.ascua}px ${orbColor}`, animation: presenceAnimation,
              }}
            />
            <p style={{ margin: 0, fontFamily: FONT.body, fontSize: 13, lineHeight: 1.5, color: C.ink, minWidth: 0 }}>
              {lectura}
            </p>
          </div>
        </div>
      )}

      {/* Input bar — morphs on focus (idéntica a la de OrbShell) */}
      <form
        onSubmit={(e: { preventDefault: () => void }) => {
          e.preventDefault();
          onSubmit();
        }}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          background: C.surface,
          border: `1px solid ${inputFocused ? orbColor + '77' : C.line}`,
          borderRadius: 999,
          padding: inputFocused ? '10px 16px' : '8px 12px',
          backdropFilter: `blur(${BLUR.cristal}px)`,
          WebkitBackdropFilter: `blur(${BLUR.cristal}px)`,
          boxShadow: inputFocused
            ? `0 0 ${HALO.resplandor}px ${orbColor}33, 0 0 ${HALO.ascua}px ${orbColor}22, ${LEJANA.md}`
            // En reposo la barra es el CONTROL PRIMARIO: halo de color de
            // usuario un poco más presente (solo box-shadow, sin nuevos
            // loops; el breathe existente ya lo neutraliza reduced-motion).
            : (!inputText && !hasResponse ? `0 0 ${HALO.marca}px ${orbColor}33, 0 0 ${HALO.ascua}px ${orbColor}1a, ${LEJANA.sm}` : 'none'),
          transform: inputFocused ? 'scale(1.02)' : 'scale(1)',
          transition: 'all 0.25s cubic-bezier(0.34, 1.56, 0.64, 1)',
          animation: !inputText && !hasResponse && !inputFocused ? ANIM.breathe : 'none',
        }}
      >
        {/* Mic button */}
        <button
          type="button"
          onClick={onToggleListening}
          aria-label={isListening ? 'Dejar de escuchar' : 'Hablar al Oráculo'}
          style={{
            width: 44,
            height: 44,
            borderRadius: '50%',
            border: `1px solid ${isListening ? C.red : C.line}`,
            background: isListening ? tint(C.red, 15) : C.glass2,
            color: isListening ? C.red : orbColor,
            cursor: 'pointer',
            display: 'grid',
            placeItems: 'center',
            fontSize: 13,
            flexShrink: 0,
            animation: isListening ? ANIM.pulse : 'none',
          }}
        >
          <Icon role="microfono" size={16} />
        </button>

        {/* Text input */}
        <input
          value={inputText}
          onChange={(e: { target: { value: string } }) => onInputChange(e.target.value)}
          onFocus={onFocus}
          onBlur={onBlur}
          placeholder={fullscreen ? OMICRON_BAR_PLACEHOLDER_FULLSCREEN : OMICRON_BAR_PLACEHOLDER_RESTING}
          aria-label="Escribir comando al Oráculo"
          inputMode="text"
          autoComplete="off"
          style={{
            flex: 1,
            border: 'none',
            outline: 'none',
            background: 'transparent',
            fontFamily: FONT.body,
            fontSize: 15,
            color: C.ink,
          }}
        />

        {/* Send button */}
        <button
          type="submit"
          disabled={!inputText.trim()}
          aria-label="Enviar"
          style={{
            width: 44,
            height: 44,
            borderRadius: '50%',
            border: 'none',
            background: inputText.trim() ? orbColor : C.glass2,
            color: inputText.trim() ? '#000' : C.mut,
            cursor: inputText.trim() ? 'pointer' : 'default',
            display: 'grid',
            placeItems: 'center',
            fontSize: 13,
            flexShrink: 0,
            transition: 'background 0.15s ease, color 0.15s ease',
          }}
        >
          <Icon role="enviar" size={16} />
        </button>
      </form>
    </>
  );
}
