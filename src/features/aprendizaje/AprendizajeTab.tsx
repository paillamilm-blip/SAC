// features/aprendizaje/AprendizajeTab.tsx
// B4 · LA PESTAÑA. Es el "andamio" del mapa: arma los datos (puente del invitado o
// la muestra etiquetada), sostiene el estado de la máquina del huésped, cablea la
// escritura optimista al RPC y monta el workspace de dos columnas (mapa al centro,
// cola a la derecha) con header sticky. NO toca geometría ni CSS del mapa: consume
// <MapaCapacidades> por props.
//
// Honestidad sin motor (brief §2, §4 y spec §8):
//  - Fuente 1 puente, Fuente 2 muestra (solo si el puente está vacío) siempre con
//    el aviso "Análisis de muestra · sin IA conectada". Nunca se pasa la muestra
//    por análisis propio.
//  - Confirmar/dominar/rechazar aplican en memoria y llaman marcarBrecha(). Si el
//    RPC falla (motor sin desplegar), se ve el motivo y el estado VUELVE al
//    anterior: cero optimismo huérfano.
//  - Vocabulario: Pendiente / Reconocida / Dominada / Descartada. Nunca
//    "Verificada", nunca "ADN", nunca jerga de scores.
import { useMemo, useState } from 'react';
import MapaCapacidades, { type ModoMapa } from '@/features/mapa/MapaCapacidades';
import { puenteBrechasInvitado } from '@/features/gemelo/services/aprendizaje';
import { transicionValida, type EstadoBrecha } from '@/features/gemelo/services/brechas';
import { MAPA_CAT } from '@/theme/tokens';
import {
  aBrechaDeMapa,
  resolverFuente,
  ETIQUETA_ESTADO,
  type BrechaDeTrabajo,
  type MuestraAnalisis,
} from './abrirBrechas';
import { marcarBrecha } from './marcarBrecha';
import muestraRaw from '../mapa/__fixtures__/analisis-donante.json?raw';
import './aprendizaje.css';

const MUESTRA = JSON.parse(muestraRaw) as MuestraAnalisis;

// Literal del donante (PanelReporte.tsx L113): la cabecera y el badge lo dicen igual.
const AVISO_MUESTRA = 'Análisis de muestra · sin IA conectada';

// El botón "Reproducir el nacimiento" y la leyenda viven dentro de
// MapaCapacidades (no se tocan). La cola define el orden de las filas como el
// donante: categoría (ORDEN) y dentro, severidad alta→media→baja.
const ORDEN_CATS = ['dura', 'blanda', 'conocimiento', 'credencial'] as const;
const PESO_SEVERIDAD = { alta: 0, media: 1, baja: 2 } as const;

const fechaCorta = (iso: string) =>
  new Intl.DateTimeFormat('es-CL', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date(iso));

export default function AprendizajeTab() {
  // La fuente se resuelve UNA vez al montar (el puente se lee del localStorage;
  // no muta durante la sesión en B4 — la persistencia del estado es B8+).
  const fuente = useMemo(() => resolverFuente(puenteBrechasInvitado.leer(), MUESTRA), []);

  const [brechas, setBrechas] = useState<BrechaDeTrabajo[]>(fuente.brechas);
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
    setBrechas((prev) => prev.map((x) => (x.id === id ? aplicado : x)));
    setModo('vivo'); // el mapa no se reinventa: los cambios van en modo vivo
    setGuardando(id);
    setConfirmando(null);

    try {
      await marcarBrecha(id, siguiente);
      pulsar(id);
    } catch (e) {
      setBrechas(anterior); // revertir: nada de optimismo huérfano
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

  return (
    <div className="aprendizaje-workspace">
      <header className="aprendizaje-header">
        <div className="aprendizaje-cabecera-texto">
          <h2 className="aprendizaje-titulo">Mapa de aprendizaje</h2>
          {fuente.simulado && (
            <span className="aprendizaje-badge" data-tipo="muestra">
              {AVISO_MUESTRA}
            </span>
          )}
        </div>
        <p className="aprendizaje-progreso" aria-live="polite">
          <strong>
            {reconocidas} de {brechas.length} reconocidas
          </strong>
        </p>
      </header>

      {fuente.simulado && (
        <p className="aprendizaje-aviso">
          Este mapa es una <strong>muestra fija</strong>, no surge de tu CV. La estructura, las categorías y los botones
          son los del producto real: cuando el motor esté conectado, este mismo lugar muestra tu análisis.
        </p>
      )}

      {error && (
        <p className="aprendizaje-error" role="alert">
          {error}
        </p>
      )}

      <div className="aprendizaje-grid">
        <div className="aprendizaje-mapa">
          <MapaCapacidades
            ocupacion={fuente.ocupacion}
            brechas={filas.map(aBrechaDeMapa)}
            modo={modo}
            recienId={recienId}
          />
        </div>

        <aside className="aprendizaje-cola" aria-label="Cola de revisión de brechas">
          <h3 className="cola-titulo">
            Cola de revisión · {brechas.filter((b) => b.estado === 'detectada').length} pendientes
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
              <div className="cola-item" data-testid="cola-item" data-estado={b.estado} key={b.id}>
                <button
                  type="button"
                  className="cola-toggle"
                  aria-expanded={abierta}
                  onClick={() => setAbiertaId(abierta ? null : b.id)}
                >
                  <span className="cola-punto" style={{ backgroundColor: MAPA_CAT[b.categoria] }} aria-hidden="true" />
                  <span className="cola-nombre">{b.titulo}</span>
                  <span className="cola-badge" data-estado={b.estado}>
                    {ETIQUETA_ESTADO[b.estado]}
                  </span>
                </button>

                {abierta && (
                  <div className="cola-cuerpo">
                    <p className="cola-severidad">Impacto {b.severidad}</p>
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

                    <div className="cola-acciones">
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
                          Es real ✓
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
                          Descartada ✓
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
