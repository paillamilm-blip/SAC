// features/aprendizaje/AprendizajeTab.tsx
// B4 · LA PESTAÑA. Es el "andamio" del mapa: arma los datos (puente del invitado o
// la muestra etiquetada), sostiene el estado de la máquina del huésped, cablea la
// escritura optimista al RPC y monta el workspace de dos columnas (mapa al centro,
// cola a la derecha) con header sticky. NO toca geometría ni CSS del mapa: consume
// <MapaCapacidades> por props.
//
// Honestidad sin motor (brief §2, §4 y spec §8):
//  - Fuente con sesión: las filas propias de `brechas_aprendizaje` (RLS dueña).
//    Sin sesión: Fuente 1 puente, Fuente 2 muestra (solo si el puente está vacío)
//    y siempre con el aviso "Análisis de muestra · sin IA conectada". Nunca se
//    pasa la muestra por análisis propio, ni a un usuario que sí tiene sesión.
//  - Confirmar/dominar/rechazar aplican en memoria y llaman marcarBrecha(). Si el
//    RPC falla (motor sin desplegar), se ve el motivo y el estado VUELVE al
//    anterior: cero optimismo huérfano. Si el RPC responde, se avisa a la lectura
//    para que la fila real vuelva a pintar el mapa.
//  - Vocabulario: Pendiente / Reconocida / Dominada / Descartada. Nunca
//    "Verificada", nunca "ADN", nunca jerga de scores.
import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import MapaCapacidades, { type ModoMapa } from '@/features/mapa/MapaCapacidades';
import { Icon } from '@/shared/components/icons';
import { OmicronEmpty, OmicronError, OmicronLoading } from '@/shared/components/OmicronChrome';
import { transicionValida, type EstadoBrecha } from '@/features/gemelo/services/brechas';
import { useUserColor } from '@/shared/hooks/useUserColor';
import { MAPA_CAT } from '@/theme/tokens';
import { aBrechaDeMapa, AVISO_MUESTRA, AVISO_VACIO, ETIQUETA_ESTADO, type BrechaDeTrabajo } from './abrirBrechas';
import { marcarBrecha } from './marcarBrecha';
import { useVistaBrechas } from './useVistaBrechas';
import './aprendizaje.css';

// El botón "Reproducir el nacimiento" y la leyenda viven dentro de
// MapaCapacidades (no se tocan). La cola define el orden de las filas como el
// donante: categoría (ORDEN) y dentro, severidad alta→media→baja.
const ORDEN_CATS = ['dura', 'blanda', 'conocimiento', 'credencial'] as const;
const PESO_SEVERIDAD = { alta: 0, media: 1, baja: 2 } as const;

const fechaCorta = (iso: string) =>
  new Intl.DateTimeFormat('es-CL', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date(iso));

export default function AprendizajeTab() {
  // La verdad de las brechas la lee UN solo lector (useVistaBrechas): el home es
  // el mapa y esta pestaña es su cola; dos lectores de la misma fuente volverían
  // a separar la app en dos.
  const vista = useVistaBrechas();
  const { trabajo, recargar } = vista;
  const leida = vista.brechas;

  // El BORRADOR es la escritura optimista: vive hasta que llega una lectura nueva.
  // Si el RPC guardó, la base reenvía la fila y el mapa repinta con datos reales.
  const [borrador, setBorrador] = useState<BrechaDeTrabajo[] | null>(null);
  useEffect(() => setBorrador(null), [leida]);
  const brechas = borrador ?? leida;

  const [modo, setModo] = useState<ModoMapa>('naciendo');
  const [recienId, setRecienId] = useState<string | null>(null);
  const [guardando, setGuardando] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  // dominada es terminal, así que pedir confirmación antes de marcarla.
  const [confirmando, setConfirmando] = useState<string | null>(null);
  // Todo colapsado al montar (decisión de B4): abre una fila por defecto con su
  // detalle empujaba el mapa más de un viewport y violaba el invariante §3.
  const [abiertaId, setAbiertaId] = useState<string | null>(null);

  const reconocidas = brechas.filter((b) => b.estado === 'confirmada' || b.estado === 'dominada').length;
  // El acento del andamio es el color del usuario (foco, riel, estado activo).
  // El mapa NO lo usa: su paleta es fija por regla D5 del dueño.
  const uc = useUserColor();
  const p = brechas.length ? (reconocidas / brechas.length) * 100 : 0;

  const pulsar = (id: string) => {
    setRecienId(id);
    window.setTimeout(() => setRecienId((c) => (c === id ? null : c)), 1100);
  };

  async function marcar(id: string, siguiente: EstadoBrecha) {
    const b = brechas.find((x) => x.id === id);
    if (!b) return;
    // El guard del huésped manda: una transición inválida jamás se intenta.
    if (!transicionValida(b.estado, siguiente)) return;

    const anterior = brechas;
    const now = new Date().toISOString();
    const aplicado: BrechaDeTrabajo = {
      ...b,
      estado: siguiente,
      veredictoEn: siguiente === 'confirmada' ? now : b.veredictoEn,
      dominadaEn: siguiente === 'dominada' ? now : b.dominadaEn,
    };

    setError(null);
    setBorrador((prev) => (prev ?? leida).map((x) => (x.id === id ? aplicado : x)));
    setModo('vivo'); // el mapa no se reinventa: los cambios van en modo vivo
    setGuardando(id);
    setConfirmando(null);

    try {
      await marcarBrecha(id, siguiente);
      recargar(); // la base es la autoridad: después de escribir, se vuelve a leer
      pulsar(id);
    } catch (e) {
      setBorrador(anterior); // revertir: nada de optimismo huérfano
      setError(e instanceof Error ? e.message : 'No se pudo guardar tu respuesta.');
    } finally {
      setGuardando(null);
    }
  }

  const filas = useMemo(
    () =>
      ORDEN_CATS.flatMap((cat) =>
        brechas.filter((b) => b.categoria === cat).sort((a, b) => PESO_SEVERIDAD[a.severidad] - PESO_SEVERIDAD[b.severidad]),
      ),
    [brechas],
  );

  // El puntero de la cola: la primera pendiente EN EL ORDEN QUE VE EL USUARIO (el
  // de `filas`), no la primera que llegó de la base.
  const pendientes = useMemo(() => filas.filter((b) => b.estado === 'detectada'), [filas]);
  const siguiente = pendientes[0] ?? null;

  // Abrir y llevar la vista a la fila son dos pasos: el scroll tiene que correr
  // DESPUÉS del render que expande el cuerpo, si no mide sobre el cierre.
  const [llevaAId, setLlevaAId] = useState<string | null>(null);
  useEffect(() => {
    if (!llevaAId) return;
    document.getElementById(`brecha-${llevaAId}`)?.scrollIntoView?.({
      block: 'nearest',
      behavior: window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
    });
    setLlevaAId(null);
  }, [llevaAId]);

  // Los tres estados antes del mapa (hook ya resuelto, así que es seguro salir
  // temprano): adelantar la muestra mientras la sesión se resuelve, o pintar el
  // análisis del donante a un usuario real, es exactamente la mentira del spec §8.
  if (trabajo.tipo === 'cargando') {
    return (
      <div className="aprendizaje-workspace" style={{ '--omi-accent': uc, '--omi-accent-soft': `${uc}33` } as CSSProperties}>
        <OmicronLoading message="Buscando tu mapa…" />
      </div>
    );
  }

  if (trabajo.tipo === 'error') {
    return (
      <div className="aprendizaje-workspace" style={{ '--omi-accent': uc, '--omi-accent-soft': `${uc}33` } as CSSProperties}>
        <OmicronError cause={trabajo.mensaje} title="Tu mapa no llegó" ctaLabel="Intentarlo de nuevo" onCta={recargar} />
      </div>
    );
  }

  if (trabajo.tipo === 'vacio') {
    // Las palabras salen de AVISO_VACIO (única voz de los dos vacíos, misma que
    // lee la portada). Sin botón acá: el modal del CV vive en OrbShell, y un CTA
    // que no abre nada es ruido. La acción está en el home.
    const aviso = AVISO_VACIO[trabajo.motivo];
    return (
      <div className="aprendizaje-workspace" style={{ '--omi-accent': uc, '--omi-accent-soft': `${uc}33` } as CSSProperties}>
        <OmicronEmpty
          icon={<Icon role="aprendizaje" size={30} />}
          title={aviso.titulo}
          hint={aviso.hint}
        />
      </div>
    );
  }

  return (
    <div
      className="aprendizaje-workspace"
      style={{ '--omi-accent': uc, '--omi-accent-soft': `${uc}33` } as CSSProperties}
    >
      <header className="aprendizaje-header">
        <div className="aprendizaje-cabecera-texto">
          <h2 className="aprendizaje-titulo">Mapa de aprendizaje</h2>
        </div>
        <p className="aprendizaje-progreso" aria-live="polite">
          <strong>
            {reconocidas} de {brechas.length} reconocidas
          </strong>
        </p>
        <span className="aprendizaje-rail" aria-hidden="true">
          <i style={{ '--p': String(p / 100) } as CSSProperties} />
        </span>
      </header>

      {vista.simulado && (
        <>
          <span className="aprendizaje-badge aprendizaje-chip" data-tipo="muestra">
            {AVISO_MUESTRA}
          </span>
          <p className="aprendizaje-aviso">
            Son habilidades de ejemplo, <strong>no son tuyas</strong>. Sube tu CV y aquí aparecen tus brechas reales.
          </p>
        </>
      )}

      {error && (
        <p className="aprendizaje-error" role="alert">
          {error}
        </p>
      )}

      {siguiente ? (
        <button
          type="button"
          className="aprendizaje-siguiente"
          aria-controls={`brecha-${siguiente.id}`}
          onClick={() => {
            setAbiertaId(siguiente.id);
            setLlevaAId(siguiente.id);
          }}
        >
          <span className="siguiente-etiqueta">Siguiente</span>
          <span className="siguiente-titulo">{siguiente.titulo}</span>
          <span className="siguiente-cuenta">Quedan {pendientes.length} en la cola</span>
          <Icon role="siguiente" size={16} />
        </button>
      ) : (
        <p className="aprendizaje-siguiente" data-estado="libre" role="status">
          <span className="siguiente-etiqueta">Cola libre</span>
          <span className="siguiente-titulo">
            No queda ninguna brecha por responder. Cuando subas un CV nuevo, aquí vuelve la cola.
          </span>
        </p>
      )}

      <div className="aprendizaje-grid">
        <div className="aprendizaje-mapa">
          <MapaCapacidades
            ocupacion={vista.ocupacion}
            brechas={filas.map(aBrechaDeMapa)}
            modo={modo}
            recienId={recienId}
          />
        </div>

        <aside
          className="aprendizaje-cola"
          aria-label="Cola de revisión de brechas"
          onKeyDown={(e) => {
            // Escape cierra la fila SOLO con el foco dentro de la cola. Un listener
            // de documento sería un segundo dueño de la tecla: el modal de activación
            // también la usa y se cerrarían las dos cosas de una vez.
            if (e.key === 'Escape' && abiertaId !== null) setAbiertaId(null);
          }}
        >
          <h3 className="cola-titulo">
            Cola de revisión{' '}
            <b>{pendientes.length} pendientes</b>
          </h3>

          {filas.length === 0 && (
            <p className="cola-vacia">Todavía no hay brechas que revisar.</p>
          )}

          {filas.map((b) => {
            const abierta = abiertaId === b.id;
            const esDominada = b.estado === 'dominada';
            const puedeConfirmar = transicionValida(b.estado, 'confirmada');
            const puedeRechazar = transicionValida(b.estado, 'rechazada');
            const puedeDominar = transicionValida(b.estado, 'dominada');
            return (
              <div className="cola-item" id={`brecha-${b.id}`} data-testid="cola-item" data-estado={b.estado} key={b.id}>
                <button
                  type="button"
                  className="cola-toggle"
                  aria-expanded={abierta}
                  onClick={() => setAbiertaId(abierta ? null : b.id)}
                >
                  <span className="cola-punto" style={{ '--punto': MAPA_CAT[b.categoria] } as CSSProperties} aria-hidden="true" />
                  <span className="cola-nombre">{b.titulo}</span>
                  <span className="cola-badge" data-estado={b.estado}>
                    {ETIQUETA_ESTADO[b.estado]}
                  </span>
                  <span className="cola-chev" aria-hidden="true" />
                </button>

                {abierta && (
                  <div className="cola-cuerpo">
                    <p className="cola-severidad" data-severidad={b.severidad}>
                      Impacto <i>{b.severidad}</i>
                    </p>
                    <div className="cola-evidencia">
                      <span className="cola-label">Evidencia en el CV</span>
                      {b.evidencia}
                    </div>
                    <p className="cola-importa">{b.porQueImporta}</p>
                    <dl className="cola-aprender">
                      <div>
                        <dt>Qué aprender</dt>
                        <dd>{b.aprender.que}</dd>
                      </div>
                      <div>
                        <dt>Cómo</dt>
                        <dd>{b.aprender.como}</dd>
                      </div>
                      <div>
                        <dt>Cómo lo demuestro</dt>
                        <dd>{b.aprender.comoLoDemuestro}</dd>
                      </div>
                    </dl>

                    <div className="cola-acciones" aria-busy={guardando === b.id}>
                      {puedeConfirmar && (
                        <button
                          type="button"
                          className="boton boton-ok"
                          aria-label={`Es real: ${b.titulo}`}
                          disabled={guardando === b.id}
                          onClick={() => marcar(b.id, 'confirmada')}
                        >
                          Es real
                        </button>
                      )}
                      {!puedeConfirmar && (b.estado === 'confirmada') && (
                        <button type="button" className="boton boton-ok" aria-pressed disabled>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>Es real <Icon role="probada" size={12} /></span>
                        </button>
                      )}

                      {puedeRechazar && (
                        <button
                          type="button"
                          className="boton boton-bad"
                          aria-label={`No aplica: ${b.titulo}`}
                          disabled={guardando === b.id}
                          onClick={() => marcar(b.id, 'rechazada')}
                        >
                          No aplica
                        </button>
                      )}
                      {!puedeRechazar && b.estado === 'rechazada' && (
                        <button type="button" className="boton boton-bad" aria-pressed disabled>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>Descartada <Icon role="probada" size={12} /></span>
                        </button>
                      )}

                      {puedeDominar && !confirmando && (
                        <button
                          type="button"
                          className="boton boton-logro"
                          aria-label={`Ya lo aprendí: ${b.titulo}`}
                          disabled={guardando === b.id}
                          onClick={() => setConfirmando(b.id)}
                        >
                          Ya lo aprendí
                        </button>
                      )}

                      {confirmando === b.id && (
                        <div className="cola-confirma" role="group" aria-label="Confirmar dominio">
                          <span>Marcarlo como dominado es definitivo: no se puede volver atrás.</span>
                          <button type="button" className="boton boton-logro" onClick={() => marcar(b.id, 'dominada')}>
                            Sí, marcar como dominado
                          </button>
                          <button type="button" className="boton" onClick={() => setConfirmando(null)}>
                            Todavía no
                          </button>
                        </div>
                      )}

                      {guardando === b.id && <span className="cola-nota">Guardando…</span>}
                    </div>

                    {esDominada && (
                      <p className="cola-nota-logro" role="status">
                        Nació un logro · dominada el {b.dominadaEn ? fechaCorta(b.dominadaEn) : '—'}
                      </p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </aside>
      </div>
    </div>
  );
}
