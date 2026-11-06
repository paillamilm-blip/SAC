import { useRef, useState } from 'react';
import type { ResultadoAnalisis } from '../domain/types';
import { ORDEN_EVENTOS, validarArchivo, type EventoAnalisis, type ProveedorAnalisis } from '../services/analizar';
import EscaneoCv from './EscaneoCv';

// Un CV firmado suele pesar 150–400 KB: en MB con dos decimales daría "0.00 MB".
function peso(bytes: number) {
  return bytes < 1024 * 1024
    ? `${Math.max(1, Math.round(bytes / 1024))} KB`
    : `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

export interface ResultadoSubida {
  resultado: ResultadoAnalisis;
  archivo: File;
}

export default function SubirCv({
  proveedor,
  onListo,
}: {
  proveedor: ProveedorAnalisis;
  /** Se llama cuando el análisis terminó. La pantalla decide qué hacer (guardar y navegar). */
  onListo: (r: ResultadoSubida) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [archivo, setArchivo] = useState<File | null>(null);
  // Índice del PRÓXIMO evento esperado: -1 = no empezó; ORDEN_EVENTOS.length = terminó.
  const [etapa, setEtapa] = useState(-1);
  const [totalBrechas, setTotalBrechas] = useState<number | null>(null);
  const [fallido, setFallido] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [arrastrando, setArrastrando] = useState(false);

  const escaneando = etapa >= 0 && !fallido;

  function elegir(candidato: File | null | undefined) {
    setError(null);
    setFallido(false);
    setEtapa(-1);
    if (!candidato) return;
    const problema = validarArchivo(candidato);
    if (problema) {
      setArchivo(null);
      setError(problema);
      return;
    }
    setArchivo(candidato);
  }

  async function analizar() {
    if (!archivo || escaneando) return;
    setError(null);
    setFallido(false);
    setTotalBrechas(null);
    setEtapa(0);
    try {
      // El avance sale de los eventos que EMITE el proveedor, no de pausas fijas de esta pantalla.
      const resultado = await proveedor.analizar(archivo, (e: EventoAnalisis) => {
        setEtapa(ORDEN_EVENTOS.indexOf(e) + 1);
      });
      setTotalBrechas(resultado.brechas.length);
      setEtapa(ORDEN_EVENTOS.length);
      onListo({ resultado, archivo });
    } catch (e) {
      setFallido(true);
      setError(e instanceof Error ? e.message : 'Falló el análisis. Inténtalo de nuevo.');
    }
  }

  return (
    <section className="card" aria-labelledby="subir-t">
      <h2 className="card-titulo" id="subir-t">
        Sube tu CV
      </h2>

      <div
        className="dropzone"
        data-activo={arrastrando}
        data-bloqueado={escaneando}
        role="button"
        tabIndex={0}
        // Sin aria-label: el nombre accesible sale del texto visible (título y detalle), tal como se ve
        // (WCAG 2.5.3, la etiqueta debe estar en el nombre).
        onClick={() => !escaneando && inputRef.current?.click()}
        onKeyDown={(e) => {
          if ((e.key === 'Enter' || e.key === ' ') && !escaneando) {
            e.preventDefault();
            inputRef.current?.click();
          }
        }}
        onDragOver={(e) => {
          e.preventDefault();
          setArrastrando(true);
        }}
        onDragLeave={() => setArrastrando(false)}
        onDrop={(e) => {
          e.preventDefault();
          setArrastrando(false);
          if (!escaneando) elegir(e.dataTransfer.files?.[0]);
        }}
      >
        <strong>{archivo ? archivo.name : 'Arrastra tu CV aquí o haz clic para elegirlo'}</strong>
        <span>
          {archivo
            ? `${peso(archivo.size)} · listo para analizar`
            : proveedor.simulado
              ? 'PDF o Word (.docx), hasta 15 MB. En esta demostración el archivo no sale de tu equipo.'
              : 'PDF o Word (.docx) con texto, hasta 15 MB. Tu archivo se lee en tu equipo; a la IA solo viaja su texto.'}
        </span>
      </div>
      {/* Fuera del botón: un control interactivo dentro de otro no es accesible. Oculto del todo (no entra al orden
          del teclado ni al lector de pantalla); el botón de arriba es quien lo abre. */}
      <input
        ref={inputRef}
        hidden
        type="file"
        accept=".pdf,application/pdf,.docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        aria-label="Archivo de tu CV (PDF o Word)"
        onChange={(e) => elegir(e.target.files?.[0])}
      />

      <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginTop: 14, flexWrap: 'wrap' }}>
        <button type="button" className="boton boton-primario" onClick={analizar} disabled={!archivo || escaneando}>
          {escaneando ? 'Analizando…' : 'Analizar mi CV'}
        </button>
      </div>

      {etapa >= 0 && (
        <EscaneoCv
          etapa={etapa}
          kb={peso(archivo?.size ?? 0)}
          totalBrechas={totalBrechas}
          fallido={fallido}
          simulado={proveedor.simulado}
        />
      )}

      {error && (
        <div className="aviso aviso-error" role="alert">
          {error}
        </div>
      )}
    </section>
  );
}
