// src/lib/pwaUpdate.ts
// Registro del Service Worker con AUTO-ACTUALIZACIÓN + aviso de nueva versión.
// - Chequea updates al cargar, al volver a la pestaña y cada 60s.
// - Cuando hay una versión nueva "esperando", muestra un aviso "Actualizar".
// - Al tocar "Actualizar": ordena al SW activarse y recarga una sola vez.
// Así el usuario nunca queda pegado en una versión vieja ni tiene que borrar caché.

import { ANIM } from '@/theme';

let registered = false;

export function registerPWA(): void {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return;
  // Guard: only register once (prevents stacking intervals during HMR)
  if (registered) return;
  registered = true;

  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').then((reg) => {
      const check = () => { reg.update().catch(() => {}); };
      // Revisa si hay build nuevo periódicamente y al volver a la app.
      setInterval(check, 60_000);
      document.addEventListener('visibilitychange', () => { if (!document.hidden) check(); });

      // Si ya hay una versión esperando (p. ej. se instaló en una carga previa).
      if (reg.waiting && navigator.serviceWorker.controller) showUpdateBanner(reg);

      // Nuevo SW encontrado → cuando quede "installed" y ya había uno activo → hay update.
      reg.addEventListener('updatefound', () => {
        const nw = reg.installing;
        if (!nw) return;
        nw.addEventListener('statechange', () => {
          if (nw.state === 'installed' && navigator.serviceWorker.controller) {
            showUpdateBanner(reg);
          }
        });
      });
    }).catch((err) => console.warn('[Ómicrom] No se pudo registrar el service worker:', err));

    // Tras activar la versión nueva (SKIP_WAITING), recargar una sola vez.
    let reloaded = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (reloaded) return;
      reloaded = true;
      window.location.reload();
    });
  });
}

function showUpdateBanner(reg: ServiceWorkerRegistration): void {
  if (document.getElementById('omi-update')) return;

  const bar = document.createElement('div');
  bar.id = 'omi-update';
  // El aviso se inyecta fuera de React, así que no puede traer los tokens de
  // theme/*.ts: se cuelga de las variables del documento. Un hex escrito acá es
  // una marca que se desincroniza la próxima vez que el tema cambie.
  bar.style.cssText =
    'position:fixed;left:50%;bottom:calc(16px + env(safe-area-inset-bottom));transform:translateX(-50%);' +
    'z-index:99999;display:flex;align-items:center;gap:12px;padding:12px 16px;border-radius:14px;' +
    'background:color-mix(in srgb, var(--surface) 92%, transparent);backdrop-filter:blur(var(--vidrio-cristal));-webkit-backdrop-filter:blur(var(--vidrio-cristal));' +
    'border:1px solid var(--line-strong);box-shadow:var(--caida-lg) rgba(0,0,0,.6),0 0 var(--halo-resplandor) color-mix(in srgb, var(--gold) 25%, transparent);' +
    'color:var(--ink);' +
    `max-width:calc(100vw - 32px);animation:${ANIM.riseFixed}`;

  const txt = document.createElement('span');
  txt.textContent = 'Hay una nueva versión de Ómicrom. Toca para actualizarla.';
  txt.style.cssText = 'font-size:13px;font-weight:600';

  const btn = document.createElement('button');
  btn.textContent = 'Actualizar';
  btn.style.cssText =
    'flex-shrink:0;min-height:44px;padding:10px 16px;border-radius:9px;border:none;cursor:pointer;font-weight:700;font-size:13px;' +
    'color:var(--on-accent);background:linear-gradient(135deg,var(--gold),var(--gold-deep));' +
    'box-shadow:var(--caida-sm) color-mix(in srgb, var(--gold) 40%, transparent)';
  btn.onclick = () => {
    btn.textContent = 'Actualizando…';
    btn.disabled = true;
    if (reg.waiting) reg.waiting.postMessage({ type: 'SKIP_WAITING' });
    else window.location.reload();
  };

  bar.appendChild(txt);
  bar.appendChild(btn);
  document.body.appendChild(bar);
}
