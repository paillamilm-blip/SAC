// Pasaporte con sellos. Reúne en una sola pantalla lo que era credencial, perfil y «mis pruebas»:
//   · cada examen aprobado es un SELLO (mismo color que el nodo del mapa) con su puntaje y fecha
//   · cada brecha que reconociste y aún no demostraste es un sello POR GANAR (se toca para ir a demostrarlo)
//   · con sesión y al menos un sello: descargar la imagen o copiar el enlace firmado por el servidor
// Nada se estima: sin examen aprobado no hay sello (PRODUCT.md, principio 4).

import { useMemo, useState, type CSSProperties } from 'react';
import type { Accion } from '@/features/assistant/recomendar';
import { COLOR_CAT } from '../domain/colores';
import { CATEGORIAS } from '../domain/types';
import { emitirCredencial } from '../services/credencial';
import { armarPasaporte } from '../services/pasaporte';
import { descargarPasaporte } from '../services/pasaportePng';
import type { Db } from '../services/repositorio';
import { BASE, hrefReporte } from './ruta';

const fechaCorta = (iso: string) =>
  new Intl.DateTimeFormat('es-CL', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(iso));
const fechaLarga = (d: Date) => new Intl.DateTimeFormat('es-CL', { day: 'numeric', month: 'long', year: 'numeric' }).format(d);

type Fase = 'quieto' | 'trabajando';

export default function PasaportePage({
  db,
  nombre,
  sesionIniciada,
  colorUsuario,
  onIr,
  onAccion,
  onPedirSesion,
}: {
  db: Db;
  nombre: string | null;
  sesionIniciada: boolean;
  colorUsuario: string;
  onIr: (href: string) => void;
  onAccion: (a: Accion) => void;
  onPedirSesion: () => void;
}) {
  const p = useMemo(() => armarPasaporte(db), [db]);
  const [fase, setFase] = useState<Fase>('quieto');
  const [enlace, setEnlace] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const titular = nombre ?? 'Tu pasaporte';
  const hayAnalisis = p.ocupacion !== null;
  const conSellos = p.sellos.length > 0;

  const ir = (href: string) => (e: { preventDefault: () => void }) => {
    e.preventDefault();
    onIr(href);
  };

  /** El enlace lo firma el servidor leyendo tus pruebas; si ya hay uno de esta visita se reutiliza. */
  async function conseguirEnlace(): Promise<string | null> {
    if (enlace) return enlace;
    const r = await emitirCredencial();
    if (!r.ok) {
      setError(r.error);
      return null;
    }
    setEnlace(r.datos.enlace);
    return r.datos.enlace;
  }

  async function descargar() {
    if (fase === 'trabajando') return;
    setFase('trabajando');
    setError(null);
    setAviso(null);
    const url = await conseguirEnlace();
    if (url) {
      const ok = await descargarPasaporte({
        nombre: titular,
        ocupacion: p.ocupacion ?? '',
        sellos: p.sellos.map((s) => ({ titulo: s.titulo, categoria: s.categoria, puntaje: s.puntaje, fecha: fechaCorta(s.en) })),
        colorUsuario,
        enlace: url,
        emitido: fechaLarga(new Date()),
      });
      if (ok) setAviso('Listo: tu pasaporte se descargó como imagen. Lleva impreso el enlace que lo comprueba.');
      else setError('Tu navegador no pudo generar la imagen. Copia el enlace y compártelo directamente.');
    }
    setFase('quieto');
  }

  async function copiar() {
    if (fase === 'trabajando') return;
    setFase('trabajando');
    setError(null);
    setAviso(null);
    const url = await conseguirEnlace();
    if (url) {
      try {
        await navigator.clipboard.writeText(url);
        setAviso('Enlace copiado. Cualquiera puede abrirlo, sin cuenta, para comprobar tus sellos.');
      } catch {
        setError('No pude copiarlo solo. Descarga la imagen: lleva el enlace impreso.');
      }
    }
    setFase('quieto');
  }

  const siguiente = () => {
    if (p.porGanar[0]) return onIr(hrefReporte(p.porGanar[0].analisisId, 'brechas', p.porGanar[0].brechaId));
    onAccion({ tipo: 'escanear' });
  };

  return (
    <div className="wrap u-pasaporte">
      <a className="enlace-atras" href={BASE} onClick={ir(BASE)}>
        ← Volver al inicio
      </a>

      <header className="u-pas-cab">
        <p className="u-pas-eyebrow">Pasaporte profesional</p>
        <h1>{titular}</h1>
        {hayAnalisis && <p className="u-pas-ocupacion">{p.ocupacion}</p>}
        <p className="u-pas-cuenta">
          {conSellos
            ? `${p.sellos.length} ${p.sellos.length === 1 ? 'habilidad probada' : 'habilidades probadas'} con examen`
            : 'Aún no tienes sellos. Cada examen que apruebes se estampa aquí.'}
        </p>
      </header>

      {p.esMuestra && (
        <div className="aviso aviso-sim" role="note">
          Tu último análisis es una muestra de ejemplo, no sale de tu CV. Escanea tu CV para que tus sellos sean tuyos.
        </div>
      )}

      {!hayAnalisis ? (
        <section className="card">
          <p className="u-pas-vacio">Primero escanea tu CV: de ahí salen las brechas que puedes convertir en sellos.</p>
          <button type="button" className="boton boton-primario" onClick={() => onAccion({ tipo: 'escanear' })}>
            Escanear mi CV
          </button>
        </section>
      ) : (
        <>
          <section className="card" aria-labelledby="u-pas-sellos-t">
            <h2 className="card-titulo" id="u-pas-sellos-t">
              Sellos
            </h2>
            <ul className="u-sellos">
              {p.sellos.map((s) => (
                <li key={s.brechaId}>
                  <a
                    className="u-sello"
                    data-estado="ganado"
                    style={{ '--sello': COLOR_CAT[s.categoria] } as CSSProperties}
                    href={hrefReporte(s.analisisId, 'brechas', s.brechaId)}
                    onClick={ir(hrefReporte(s.analisisId, 'brechas', s.brechaId))}
                    aria-label={`${s.titulo}. ${CATEGORIAS[s.categoria]}. Probado: ${Math.round(s.puntaje)} de 100, ${fechaCorta(s.en)}. Ver la brecha`}
                  >
                    <span className="u-sello-aro" aria-hidden="true">
                      <b>{Math.round(s.puntaje)}</b>
                      <small>/100</small>
                    </span>
                    <span className="u-sello-titulo">{s.titulo}</span>
                    <span className="u-sello-fecha">{fechaCorta(s.en)}</span>
                  </a>
                </li>
              ))}
              {p.porGanar.map((g) => (
                <li key={g.brechaId}>
                  <a
                    className="u-sello"
                    data-estado="por-ganar"
                    style={{ '--sello': COLOR_CAT[g.categoria] } as CSSProperties}
                    href={hrefReporte(g.analisisId, 'brechas', g.brechaId)}
                    onClick={ir(hrefReporte(g.analisisId, 'brechas', g.brechaId))}
                    aria-label={`Sello por ganar: ${g.titulo}. ${CATEGORIAS[g.categoria]}. Ir a demostrarlo`}
                  >
                    <span className="u-sello-aro" aria-hidden="true">
                      <b>+</b>
                    </span>
                    <span className="u-sello-titulo">{g.titulo}</span>
                    <span className="u-sello-fecha">Por ganar · demuéstralo</span>
                  </a>
                </li>
              ))}
            </ul>
            {p.sellos.length === 0 && p.porGanar.length === 0 && (
              <p className="u-pas-vacio">
                {p.porReconocer > 0
                  ? `Te faltan ${p.porReconocer} ${p.porReconocer === 1 ? 'brecha' : 'brechas'} por revisar. Dime cuáles son reales y aparecerán aquí como sellos por ganar.`
                  : 'No reconociste ninguna brecha como real, así que no hay sellos por ganar en este análisis.'}
              </p>
            )}
            {p.porReconocer > 0 && (p.sellos.length > 0 || p.porGanar.length > 0) && (
              <p className="u-pas-nota">
                {p.porReconocer} {p.porReconocer === 1 ? 'brecha' : 'brechas'} sin revisar: aún no sabemos si te faltan.
              </p>
            )}
          </section>

          <section className="card" aria-labelledby="u-pas-comp-t">
            <h2 className="card-titulo" id="u-pas-comp-t">
              Compartir
            </h2>
            {conSellos ? (
              sesionIniciada ? (
                <>
                  <p className="u-pas-nota">
                    La imagen se hace en tu dispositivo y lleva impreso un enlace firmado por Ómicrom: la imagen sola no
                    prueba nada, el enlace sí. Vence a los 12 meses.
                  </p>
                  <div className="u-pas-botones">
                    <button type="button" className="boton boton-primario" onClick={() => void descargar()} disabled={fase === 'trabajando'}>
                      {fase === 'trabajando' ? 'Preparando…' : 'Descargar mi pasaporte'}
                    </button>
                    <button type="button" className="boton" onClick={() => void copiar()} disabled={fase === 'trabajando'}>
                      Copiar enlace verificable
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <p className="u-pas-nota">
                    Para firmar tu pasaporte necesitas una cuenta: el enlace lo crea el servidor leyendo tus exámenes.
                  </p>
                  <button type="button" className="boton boton-primario" onClick={onPedirSesion}>
                    Iniciar sesión para firmarlo
                  </button>
                </>
              )
            ) : (
              <>
                <p className="u-pas-nota">Todavía no hay nada que firmar. Gana tu primer sello y podrás descargar y compartir tu pasaporte.</p>
                <button type="button" className="boton boton-primario" onClick={siguiente}>
                  {p.porGanar[0] ? 'Ganar mi primer sello' : 'Escanear mi CV'}
                </button>
              </>
            )}
            <p className="u-pas-estado" role="status">
              {aviso ?? ''}
            </p>
            {error && (
              <p className="aviso aviso-error" role="alert">
                {error}
              </p>
            )}
          </section>
        </>
      )}
    </div>
  );
}
