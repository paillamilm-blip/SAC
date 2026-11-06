// store/ProfileContext.tsx
// Auth + Perfil + Gemelo Digital. Se mantienen juntos a propósito: el
// AuthStatus depende de si el perfil existe/se puede crear en la base de
// datos (no_access se dispara ahí, no es un concepto de auth "puro"), y la
// lógica de reintento anti-race-condition (ver comentarios ✅ FIX) asume
// que profile y authStatus viven en el mismo efecto. Separarlos de más
// reintroduciría esa clase de bug que ya se corrigió antes.
//
// Extraído de AppContext.tsx (Fase 0.3 del plan de producción) para que
// NavigationContext.tsx pueda cambiar activeTab sin re-renderizar todo lo
// que solo depende de profile/gemelo.

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  useCallback,
  ReactNode,
} from 'react';
import { Session } from '@supabase/supabase-js';
import { supabase } from '@/infrastructure/supabase/client';
import { calculateGemeloDigital } from '@/features/gemelo/services/reputation';
import type { AuthStatus, Profile, GemeloDigital } from '../types';

const DEFAULT_PE_POINTS = 0;
const DEFAULT_REPUTATION = 50;

export interface ProfileContextState {
  authStatus: AuthStatus;
  isLoadingProfile: boolean;
  profile: Profile | null;
  gemelo: GemeloDigital | null;
  refreshProfile: () => Promise<void>;
  reintentarPerfil: () => Promise<void>;
}

/**
 * Resultado de LEER el perfil. Tres casos que antes se confundían en un solo `null`:
 *   · ok         → hay perfil.
 *   · sin_perfil → el servidor respondió y no existe (el trigger de BD puede tardar en crearlo).
 *   · error      → no se pudo leer (red caída, servidor con problemas). NO significa que no haya perfil.
 */
type LecturaPerfil =
  | { estado: 'ok'; perfil: Profile }
  | { estado: 'sin_perfil' }
  | { estado: 'error' };

const ProfileContext = createContext<ProfileContextState | null>(null);

export function ProfileProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [gemelo, setGemelo] = useState<GemeloDigital | null>(null);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const [authStatus, setAuthStatus] = useState<AuthStatus>('loading');

  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  const fetchProfile = useCallback(async (userId: string): Promise<LecturaPerfil> => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();
      if (error) return { estado: 'error' };
      return data ? { estado: 'ok', perfil: data as Profile } : { estado: 'sin_perfil' };
    } catch {
      // fetch() lanza cuando no hay red: es un fallo de lectura, no un perfil inexistente.
      return { estado: 'error' };
    }
  }, []);

  // Recalcular Gemelo Digital cada vez que cambia el perfil
  useEffect(() => {
    if (profile && isMounted.current) {
      setGemelo(calculateGemeloDigital(profile));
    }
  }, [profile]);

  // Sincronizar el color del Gemelo (lectura, read-through). Cuando el
  // perfil autenticado se materializa (login o canal real-time), se
  // reconcilia el color guardado en el perfil con la caché local
  // (localStorage). Este es el punto centralizado por donde fluye el
  // perfil. hydrateUserColorFromProfile solo escribe si los valores
  // difieren (anti-bucle) y no rompe el modo invitado.
  useEffect(() => {
    if (!profile) return;
    import('@/shared/services/userColorSync')
      .then(m => m.hydrateUserColorFromProfile(profile.user_color))
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.id, profile?.user_color]);

  // Sincronizar el perfil del onboarding (lectura, read-through). Mismo
  // patrón que el color: cuando el perfil autenticado se materializa, se
  // reconcilia el onboarding guardado en la nube (profesión / seniority /
  // skills / ejes) con la caché local del invitado, para que un dispositivo
  // nuevo vea el onboarding ya hecho. hydrateOnboardingFromProfile solo
  // escribe si los valores difieren (anti-bucle) y no rompe el modo invitado.
  useEffect(() => {
    if (!profile) return;
    import('@/shared/services/onboardingSync')
      .then(m => m.hydrateOnboardingFromProfile(profile))
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.id, profile?.onboarding_completed_at]);

  // La reputación es solo-lectura en el cliente: el canal real-time de
  // profiles (más abajo) detecta cualquier UPDATE server-side (triggers) y
  // actualiza el estado. No existe escritura de scores desde el cliente.
  const refreshProfile = useCallback(async () => {
    if (!profile?.id) return;
    const lectura = await fetchProfile(profile.id);
    if (lectura.estado === 'ok' && isMounted.current) setProfile(lectura.perfil);
  }, [profile?.id, fetchProfile]);

  // loadProfile vive dentro del efecto de autenticación (usa su `effectMounted`); se guarda aquí para poder
  // llamarlo de nuevo desde «Reintentar» sin duplicar la lógica.
  const cargarPerfilRef = useRef<((session: Session) => Promise<void>) | null>(null);
  // La última sesión con la que se intentó leer el perfil. Para reintentar la lectura no hace falta volver a
  // preguntarle a la autenticación: solo se usa el id (y el correo si hay que crear el perfil), y la petición usa el
  // token vigente del cliente. Si la sesión muriera de verdad, Supabase emite SIGNED_OUT y se maneja allí.
  const sesionRef = useRef<Session | null>(null);

  const reintentarPerfil = useCallback(async () => {
    if (sesionRef.current) {
      await cargarPerfilRef.current?.(sesionRef.current);
      return;
    }
    // Sin sesión guardada (no debería pasar estando en error): se lee de la autenticación.
    const { data, error } = await supabase.auth.getSession();
    // Sin poder leer la sesión NO se asume que cerró: sigue siendo un fallo recuperable.
    if (error) {
      if (isMounted.current) setAuthStatus('error_transitorio');
      return;
    }
    if (!data.session) {
      if (isMounted.current) {
        setProfile(null);
        setAuthStatus('unauthenticated');
      }
      return;
    }
    await cargarPerfilRef.current?.(data.session);
  }, []);

  // Flujo de autenticación usando onAuthStateChange como fuente única.
  // getSession() no dispara loadProfile directamente; INITIAL_SESSION lo cubre
  // al montar. Esto elimina la race condition entre getSession() y SIGNED_IN.
  useEffect(() => {
    let effectMounted = true;

    async function loadProfile(session: Session) {
      if (!effectMounted) return;
      sesionRef.current = session;
      setIsLoadingProfile(true);

      try {
        let lectura = await fetchProfile(session.user.id);

        // Reintentos con backoff. Dos causas distintas, dos paciencias distintas:
        //   · sin_perfil → el trigger de BD puede demorar en crear el perfil: hasta 5 intentos (≈3 s).
        //   · error      → red o servidor: 2 intentos cortos; si siguen fallando se muestra un aviso recuperable.
        let attempts = 0;
        while (lectura.estado !== 'ok' && effectMounted) {
          const maximo = lectura.estado === 'error' ? 2 : 5;
          if (attempts >= maximo) break;
          await new Promise(r => setTimeout(r, 200 * (attempts + 1)));
          if (!effectMounted) return;
          lectura = await fetchProfile(session.user.id);
          attempts++;
        }

        if (!effectMounted) return;

        // No se pudo LEER: la sesión sigue siendo válida, así que no se la trata como «sin acceso» ni se intenta
        // crear un perfil encima de uno que quizá ya existe (el upsert pisaría username y full_name).
        if (lectura.estado === 'error') {
          setAuthStatus('error_transitorio');
          setProfile(null);
          return;
        }

        let data: Profile | null = lectura.estado === 'ok' ? lectura.perfil : null;

        if (!data) {
          if (import.meta.env.DEV) {
            console.warn('Profile not found after retries. Creating fallback.');
          }

          const username = session.user.email?.split('@')[0] ?? 'usuario';
          const { data: created, error } = await supabase
            .from('profiles')
            .upsert({
              id: session.user.id,
              username,
              full_name: username,
              pe_points: DEFAULT_PE_POINTS,
              is_pioneer: false,
              node_type: 'Nodo Operativo',
              node_level: 1,
              reputation_score: DEFAULT_REPUTATION,
              execution_score: DEFAULT_REPUTATION,
              quality_score: DEFAULT_REPUTATION,
              transcendence_score: DEFAULT_REPUTATION,
              foundation_score: DEFAULT_REPUTATION,
              traditional_score: 0,
              experience_score: 0,
              node_status: 'ACTIVE',
              is_verified_professional: false,
              can_receive_contracts: true,
              total_contracts_completed: 0,
              total_earnings: 0,
            })
            .select()
            .maybeSingle();

          if (error) {
            if (import.meta.env.DEV) console.error('Profile creation error:', error);
            if (!effectMounted) return;
            // Un error de Postgres trae `code` (permiso denegado, violación de restricción...): el servidor SÍ
            // respondió y dijo que no → sin acceso. Sin `code` es un fallo de transporte → recuperable.
            setAuthStatus(error.code ? 'no_access' : 'error_transitorio');
            setProfile(null);
            return;
          }
          data = created as Profile | null;
        }

        if (!effectMounted) return;

        if (data) {
          setProfile(data);
          setAuthStatus('authenticated');
        } else {
          setAuthStatus('no_access');
          setProfile(null);
        }
      } catch (err) {
        if (import.meta.env.DEV) console.error('loadProfile error:', err);
        if (effectMounted) {
          // Una excepción inesperada no prueba que la persona no tenga acceso: se ofrece reintentar.
          setAuthStatus('error_transitorio');
          setProfile(null);
        }
      } finally {
        if (effectMounted) setIsLoadingProfile(false);
      }
    }

    cargarPerfilRef.current = loadProfile;

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!effectMounted) return;

      if (event === 'INITIAL_SESSION') {
        if (session) {
          loadProfile(session);
        } else {
          setAuthStatus('unauthenticated');
          setIsLoadingProfile(false);
        }
      } else if (event === 'SIGNED_IN' && session) {
        // Solo carga si no hay perfil (evita recargas innecesarias en token refresh)
        if (!profile) {
          loadProfile(session);
        }
      } else if (event === 'SIGNED_OUT') {
        sesionRef.current = null;
        setProfile(null);
        setGemelo(null);
        setAuthStatus('unauthenticated');
        setIsLoadingProfile(false);
        // Clean up session-specific caches to prevent data leaking between users
        import('@/features/omicron/services/brain').then(({ clearConversationMemory }) => clearConversationMemory()).catch(() => {});
        import('@/features/gemelo/services/memory').then(({ clearMemory }) => clearMemory()).catch(() => {});
        import('@/infrastructure/voice/voiceAI').then(({ clearVoiceCache }) => clearVoiceCache()).catch(() => {});
      }
    });

    return () => {
      effectMounted = false;
      subscription.unsubscribe();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Solo al montar; fetchProfile es estable (useCallback sin deps cambiantes)

  // Canal real-time para cambios de reputación (con debounce para evitar flood).
  useEffect(() => {
    if (!profile?.id) return;

    let debounceTimer: ReturnType<typeof setTimeout> | null = null;
    let latestPayload: Profile | null = null;

    const channel = supabase
      .channel(`reputation-changes-${profile.id}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'profiles',
        filter: `id=eq.${profile.id}`,
      }, (payload) => {
        if (!isMounted.current || !payload.new) return;
        latestPayload = payload.new as Profile;
        // Debounce: esperar 300ms antes de actualizar el estado
        // (evita flood de setProfile ante múltiples updates consecutivos)
        if (debounceTimer) clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
          if (isMounted.current && latestPayload) {
            setProfile(latestPayload);
            latestPayload = null;
          }
        }, 300);
      })
      .subscribe();

    return () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      supabase.removeChannel(channel);
    };
  }, [profile?.id]);

  const value: ProfileContextState = {
    authStatus,
    isLoadingProfile,
    profile,
    gemelo,
    refreshProfile,
    reintentarPerfil,
  };

  return (
    <ProfileContext.Provider value={value}>
      {children}
    </ProfileContext.Provider>
  );
}

export function useProfile(): ProfileContextState {
  const ctx = useContext(ProfileContext);
  if (!ctx) throw new Error('useProfile must be used inside ProfileProvider');
  return ctx;
}
