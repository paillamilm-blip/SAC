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
  bar.style.cssText =
    'position:fixed;left:50%;bottom:calc(18px + env(safe-area-inset-bottom));transform:translateX(-50%);' +
    'z-index:99999;display:flex;align-items:center;gap:12px;padding:11px 14px;border-radius:16px;' +
    'background:rgba(10,16,30,0.92);backdrop-filter:blur(16px);-webkit-backdrop-filter:blur(16px);' +
    'border:1px solid rgba(160,174,192,0.4);box-shadow:0 12px 40px rgba(0,0,0,.6),0 0 22px rgba(160,174,192,.25);' +
    "font-family:-apple-system,BlinkMacSystemFont,'Inter',system-ui,sans-serif;color:#eaf0fb;" +
    `max-width:calc(100vw - 32px);animation:${ANIM.riseFixed}`;

  const txt = document.createElement('span');
  txt.textContent = 'Hay una nueva versión de Ómicrom. Tocá para actualizarla.';
  txt.style.cssText = 'font-size:13px;font-weight:600';

  const btn = document.createElement('button');
  btn.textContent = 'Actualizar';
  btn.style.cssText =
    'flex-shrink:0;padding:8px 15px;border-radius:11px;border:none;cursor:pointer;font-weight:700;font-size:13px;' +
    'color:#fff;background:linear-gradient(135deg,#a0aec0,#5e5ce6);box-shadow:0 6px 16px rgba(160,174,192,.4)';
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
