import { compararConAnterior, obtenerAnalisis, type Db } from '../services/repositorio';
import type { PruebaExamen, Veredicto } from '../domain/types';
import PanelReporte, { type Pestana } from '../components/PanelReporte';
import { BASE, hrefReporte } from './ruta';

export default function ReportePage({
  db,
  analisisId,
  pestana,
  brechaId,
  onIr,
  onMarcar,
  onProbar,
  sesionIniciada,
  onPedirSesion,
}: {
  db: Db;
  analisisId: string;
  pestana: Pestana;
  brechaId: string | null;
  onIr: (href: string) => void;
  onMarcar: (analisisId: string, brechaId: string, v: Veredicto) => void;
  onProbar: (analisisId: string, brechaId: string, prueba: PruebaExamen) => void;
  sesionIniciada: boolean;
  onPedirSesion: () => void;
}) {
  const analisis = obtenerAnalisis(db, analisisId);

  return (
    <div className="wrap">
      <a
        className="enlace-atras"
        href={BASE}
        onClick={(e) => {
          e.preventDefault();
          onIr(BASE);
        }}
      >
        ← Volver al inicio
      </a>

      {!analisis ? (
        <div className="vacio" role="alert">
          <p>No encontré ese análisis en este dispositivo. Puede haberse borrado o ser de otra cuenta.</p>
          <button type="button" className="boton boton-primario" onClick={() => onIr(BASE)}>
            Ir al inicio
          </button>
        </div>
      ) : (
        <PanelReporte
          // Se remonta si el asistente cambia de pestaña o de brecha: esos valores son solo iniciales.
          key={`${analisis.id}:${pestana}:${brechaId ?? ''}`}
          ocupacion={analisis.ocupacion}
          nivel={analisis.nivel}
          creadoEn={analisis.creadoEn}
          nombreArchivo={analisis.nombreArchivo}
          simulado={analisis.simulado}
          proveedor={analisis.proveedor}
          resumen={analisis.resumen}
          fortalezas={analisis.fortalezas}
          brechas={analisis.brechas}
          comparacion={compararConAnterior(db, analisis)}
          onMarcar={(bid, v) => onMarcar(analisis.id, bid, v)}
          onProbar={(bid, prueba) => onProbar(analisis.id, bid, prueba)}
          sesionIniciada={sesionIniciada}
          onPedirSesion={onPedirSesion}
          pestanaInicial={pestana}
          brechaInicialId={brechaId}
          onPestana={(p) => {
            const href = hrefReporte(analisisId, p, brechaId ?? undefined);
            window.history.replaceState(null, '', href);
            onIr(href);
          }}
        />
      )}
    </div>
  );
}
