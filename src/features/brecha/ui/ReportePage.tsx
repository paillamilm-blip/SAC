import { compararConAnterior, obtenerAnalisis, type Db } from '../services/repositorio';
import type { Veredicto } from '../domain/types';
import PanelReporte, { type Pestana } from '../components/PanelReporte';
import { BASE } from './ruta';

export default function ReportePage({
  db,
  analisisId,
  pestana,
  brechaId,
  onIr,
  onMarcar,
  onDominar,
}: {
  db: Db;
  analisisId: string;
  pestana: Pestana;
  brechaId: string | null;
  onIr: (href: string) => void;
  onMarcar: (analisisId: string, brechaId: string, v: Veredicto) => void;
  onDominar: (analisisId: string, brechaId: string) => void;
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
          analisisId={analisis.id}
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
          onDominar={(bid) => onDominar(analisis.id, bid)}
          pestanaInicial={pestana}
          brechaInicialId={brechaId}
        />
      )}
    </div>
  );
}
