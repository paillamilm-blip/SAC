// Términos y Política de Privacidad dentro de la app. El texto sale de los MISMOS archivos del repositorio
// (TERMINOS_SERVICIO.md, POLITICA_PRIVACIDAD.md): hay una sola versión, la que se edita y se revisa.
// Se dibuja con elementos de React (nunca HTML crudo). Esta pantalla se carga aparte para no pesar en el resto.

import { Fragment, useEffect, useMemo, useRef } from 'react';
import terminos from '../../../../TERMINOS_SERVICIO.md?raw';
import privacidad from '../../../../POLITICA_PRIVACIDAD.md?raw';
import { parsearMarkdown, type Tramo } from '../services/markdownSimple';
import { BASE, HREF_PRIVACIDAD, HREF_TERMINOS } from './ruta';

export type DocLegal = 'terminos' | 'privacidad';

const FUENTE: Record<DocLegal, string> = { terminos, privacidad };

function Texto({ tramos }: { tramos: Tramo[] }) {
  return (
    <>
      {tramos.map((t, i) =>
        t.tipo === 'negrita' ? (
          <strong key={i}>{t.texto}</strong>
        ) : t.tipo === 'codigo' ? (
          <code key={i}>{t.texto}</code>
        ) : (
          <Fragment key={i}>{t.texto}</Fragment>
        ),
      )}
    </>
  );
}

export default function DocumentoLegal({ doc, onIr }: { doc: DocLegal; onIr: (href: string) => void }) {
  const bloques = useMemo(() => parsearMarkdown(FUENTE[doc]), [doc]);
  const titulo = useRef<HTMLHeadingElement>(null);

  // Al abrir un documento, el foco va a su título (quien navega con teclado o lector de pantalla sabe dónde está).
  useEffect(() => {
    titulo.current?.focus();
    const t = bloques.find((b) => b.tipo === 'titulo' && b.nivel === 1);
    document.title = t && t.tipo === 'titulo' ? t.tramos.map((x) => x.texto).join('') : 'Ómicrom';
    return () => {
      document.title = 'Ómicrom';
    };
  }, [bloques]);

  const ir = (href: string) => (e: { preventDefault: () => void }) => {
    e.preventDefault();
    onIr(href);
  };
  const otro = doc === 'terminos' ? { href: HREF_PRIVACIDAD, texto: 'Política de Privacidad' } : { href: HREF_TERMINOS, texto: 'Términos y Condiciones' };
  let primerH1 = true;

  return (
    <div className="wrap u-legal">
      <a className="enlace-atras" href={BASE} onClick={ir(BASE)}>
        ← Volver al inicio
      </a>
      <article className="u-legal-doc">
        {bloques.map((b, i) => {
          switch (b.tipo) {
            case 'titulo': {
              const contenido = <Texto tramos={b.tramos} />;
              if (b.nivel === 1) {
                const esPrimero = primerH1;
                primerH1 = false;
                return (
                  <h1 key={i} id={b.id} ref={esPrimero ? titulo : undefined} tabIndex={esPrimero ? -1 : undefined}>
                    {contenido}
                  </h1>
                );
              }
              return b.nivel === 2 ? (
                <h2 key={i} id={b.id}>
                  {contenido}
                </h2>
              ) : (
                <h3 key={i} id={b.id}>
                  {contenido}
                </h3>
              );
            }
            case 'parrafo':
              return (
                <p key={i}>
                  <Texto tramos={b.tramos} />
                </p>
              );
            case 'cita':
              return (
                <p key={i} className="u-legal-nota">
                  <Texto tramos={b.tramos} />
                </p>
              );
            case 'lista':
              return (
                <ul key={i}>
                  {b.items.map((it, j) => (
                    <li key={j}>
                      <Texto tramos={it} />
                    </li>
                  ))}
                </ul>
              );
            case 'tabla':
              return (
                <div key={i} className="u-legal-tabla" role="region" aria-label="Tabla" tabIndex={0}>
                  <table>
                    <thead>
                      <tr>
                        {b.cabecera.map((c, j) => (
                          <th key={j} scope="col">
                            <Texto tramos={c} />
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {b.filas.map((f, j) => (
                        <tr key={j}>
                          {f.map((c, k) => (
                            <td key={k}>
                              <Texto tramos={c} />
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              );
            case 'separador':
              return <hr key={i} />;
          }
        })}
      </article>
      <p className="u-legal-otro">
        Ver también:{' '}
        <a href={otro.href} onClick={ir(otro.href)}>
          {otro.texto}
        </a>
      </p>
    </div>
  );
}
