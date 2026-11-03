// Detecta el regreso desde el correo de «olvidé mi contraseña».
// Supabase abre la app con una sesión de recuperación y emite el evento PASSWORD_RECOVERY:
// en ese momento hay que mostrar el formulario para elegir una clave nueva.
// Antes lo hacía solo la app de siempre (AppShell); como la raíz abre /u, /u tiene que hacerlo.

import { useEffect, useState } from 'react';
import { supabase } from '@/infrastructure/supabase/client';

export function useRecuperarClave(): { recuperando: boolean; terminar: () => void } {
  const [recuperando, setRecuperando] = useState(false);

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((evento) => {
      if (evento === 'PASSWORD_RECOVERY') setRecuperando(true);
    });
    return () => subscription.unsubscribe();
  }, []);

  return { recuperando, terminar: () => setRecuperando(false) };
}
