// lib/proactiveEngine.ts
// ═══════════════════════════════════════════════════════════════════════
// ÓMICROM · MOTOR DE PROACTIVIDAD — El Gemelo que se anticipa
// Detecta momentos para intervenir ANTES de que el usuario pregunte.
// Contexto: hora, red en vivo, inactividad, logros.
// ═══════════════════════════════════════════════════════════════════════

import { getGoals, generateContextualGreeting } from './memory';
import { getProfile, bestNextStep } from './profile';

export type ProactiveEventType = 
  | 'greeting'           // Saludo contextual al abrir
  | 'network_surge'      // Muchos nodos nuevos en línea
  | 'milestone'          // Logro alcanzado (nivel, PE, etc)
  | 'reminder'           // Recordatorio de goal/tarea pendiente
  | 'inactivity'         // Usuario inactivo por X días
  | 'suggestion'         // Sugerencia proactiva basada en contexto
  | 'celebration';       // Celebración de éxito

export interface ProactiveEvent {
  type: ProactiveEventType;
  priority: number; // 1-5 (5 = urgente)
  message: string;
  emotion: 'idle' | 'excited' | 'alert' | 'celebrating' | 'thinking';
  actions?: Array<{
    label: string;
    action: () => void;
  }>;
  timestamp: number;
}

interface ProactiveContext {
  currentHour: number;
  dayOfWeek: number;
  reputation: number;
  pe: number;
  onlineCount: number;
  lastOnlineCount: number;
  daysSinceLastLogin: number;
  currentTab: string;
  userName?: string;
}

const LAST_GREETING_KEY = 'omicron_last_greeting';
const LAST_NETWORK_CHECK_KEY = 'omicron_last_network_check';

// ══════════════════════════════════════════════════════════════════════
// DETECTORES DE EVENTOS PROACTIVOS
// ══════════════════════════════════════════════════════════════════════

/**
 * Genera saludo contextual al abrir la app (una vez por sesión).
 */
export function detectGreeting(context: ProactiveContext): ProactiveEvent | null {
  try {
    const lastGreeting = localStorage.getItem(LAST_GREETING_KEY);
    const now = Date.now();
    
    // Solo saludar una vez cada 4 horas
    if (lastGreeting && now - parseInt(lastGreeting) < 4 * 60 * 60 * 1000) {
      return null;
    }
    
    localStorage.setItem(LAST_GREETING_KEY, now.toString());
    
    const message = generateContextualGreeting(
      context.userName || 'operador',
      context.currentHour,
      context.reputation,
      context.daysSinceLastLogin
    );
    
    const profile = getProfile();
    const next = bestNextStep(profile);
    
    const fullMessage = next 
      ? `${message} Tu mejor paso ahora: ${next.label}.`
      : message;
    
    return {
      type: 'greeting',
      priority: 3,
      message: fullMessage,
      emotion: 'idle',
      timestamp: now,
    };
  } catch {
    return null;
  }
}

/**
 * Detecta incremento significativo en nodos online.
 */
export function detectNetworkSurge(context: ProactiveContext): ProactiveEvent | null {
  try {
    const surge = context.onlineCount - context.lastOnlineCount;
    
    if (surge >= 3) {
      const message = `${surge} nodos nuevos entraron a la red. La actividad está alta: es buen momento para probar una habilidad.`;
      
      return {
        type: 'network_surge',
        priority: 4,
        message,
        emotion: 'excited',
        timestamp: Date.now(),
      };
    }
    
    return null;
  } catch {
    return null;
  }
}

/**
 * Detecta logros alcanzados (milestone).
 */
export function detectMilestone(context: ProactiveContext): ProactiveEvent | null {
  try {
    // Detectar si acabó de subir de nivel
    const previousRep = localStorage.getItem('omicron_previous_rep');
    const currentRep = context.reputation;
    
    if (previousRep) {
      const prev = parseInt(previousRep);
      
      // Cruzó umbral de 50 (Nodo 2)
      if (prev < 50 && currentRep >= 50) {
        localStorage.setItem('omicron_previous_rep', currentRep.toString());
        
        return {
          type: 'milestone',
          priority: 4,
          message: '¡Subiste a Nodo 2! Tu reputación es 50+. Ya puedes rendir el examen de tu habilidad más fuerte.',
          emotion: 'celebrating',
          timestamp: Date.now(),
        };
      }
      
      // Cruzó umbral de 80 (Nodo 3)
      if (prev < 80 && currentRep >= 80) {
        localStorage.setItem('omicron_previous_rep', currentRep.toString());
        
        return {
          type: 'milestone',
          priority: 5,
          message: '¡NODO 3 ALCANZADO! Eres élite: tu Gemelo Digital está sostenido por evidencia, no por lo que dijiste de ti.',
          emotion: 'celebrating',
          timestamp: Date.now(),
        };
      }
    } else {
      localStorage.setItem('omicron_previous_rep', currentRep.toString());
    }
    
    // Detectar PE milestones
    const previousPE = localStorage.getItem('omicron_previous_pe');
    const currentPE = context.pe;
    
    if (previousPE) {
      const prev = parseInt(previousPE);
      const milestones = [100, 500, 1000, 2000, 5000];
      
      for (const milestone of milestones) {
        if (prev < milestone && currentPE >= milestone) {
          localStorage.setItem('omicron_previous_pe', currentPE.toString());
          
          return {
            type: 'milestone',
            priority: 3,
            message: `¡${currentPE.toLocaleString()} PE acumulados! Cada prueba que apruebas suma al Gemelo, no al discurso.`,
            emotion: 'celebrating',
            timestamp: Date.now(),
          };
        }
      }
    } else {
      localStorage.setItem('omicron_previous_pe', currentPE.toString());
    }
    
    return null;
  } catch {
    return null;
  }
}

/**
 * Detecta recordatorios basados en goals del usuario.
 */
export function detectReminder(context: ProactiveContext): ProactiveEvent | null {
  try {
    const goals = getGoals();
    const activeGoal = goals.find(g => g.progress < 100 && g.priority >= 3);
    
    if (!activeGoal) return null;
    
    const lastReminder = localStorage.getItem(`omicron_reminder_${activeGoal.goal}`);
    const now = Date.now();
    
    // Recordar cada 24 horas
    if (lastReminder && now - parseInt(lastReminder) < 24 * 60 * 60 * 1000) {
      return null;
    }
    
    // Solo recordar en horarios laborales (9am-6pm)
    if (context.currentHour < 9 || context.currentHour >= 18) {
      return null;
    }
    
    localStorage.setItem(`omicron_reminder_${activeGoal.goal}`, now.toString());
    
    const profile = getProfile();
    const next = bestNextStep(profile);
    
    const message = next && next.label.toLowerCase().includes(activeGoal.goal.toLowerCase())
      ? `Recuerda tu objetivo: ${activeGoal.goal}. Te recomiendo: ${next.label}.`
      : `Sigues trabajando en "${activeGoal.goal}". Progreso: ${activeGoal.progress}%.`;
    
    return {
      type: 'reminder',
      priority: 2,
      message,
      emotion: 'thinking',
      timestamp: now,
    };
  } catch {
    return null;
  }
}

/**
 * Detecta inactividad prolongada.
 */
export function detectInactivity(context: ProactiveContext): ProactiveEvent | null {
  try {
    if (context.daysSinceLastLogin >= 3 && context.daysSinceLastLogin <= 7) {
      const profile = getProfile();
      const next = bestNextStep(profile);
      
      const message = next
        ? `Han pasado ${context.daysSinceLastLogin} días. Te recomiendo: ${next.label}. ¿Te ayudo?`
        : `Han pasado ${context.daysSinceLastLogin} días. Tu Gemelo te extraña. ¿Revisamos juntos?`;
      
      return {
        type: 'inactivity',
        priority: 3,
        message,
        emotion: 'thinking',
        timestamp: Date.now(),
      };
    }
    
    return null;
  } catch {
    return null;
  }
}

/**
 * Genera sugerencias contextuales basadas en patrones.
 */
export function detectSuggestion(context: ProactiveContext): ProactiveEvent | null {
  try {
    const profile = getProfile();

    // Si está en horario nocturno y tiene cursos pendientes
    if (context.currentHour >= 20 && context.currentHour < 23) {
      const next = bestNextStep(profile);
      
      if (next && next.label.toLowerCase().includes('curso')) {
        const message = 'Horario tranquilo para aprender. Tienes cursos pendientes que subirían tu reputación. ¿Los vemos?';
        
        return {
          type: 'suggestion',
          priority: 2,
          message,
          emotion: 'thinking',
          timestamp: Date.now(),
        };
      }
    }
    
    return null;
  } catch {
    return null;
  }
}

// ══════════════════════════════════════════════════════════════════════
// ORQUESTADOR
// ══════════════════════════════════════════════════════════════════════

/**
 * Evalúa todos los detectores y retorna el evento proactivo de mayor prioridad.
 */
export function evaluateProactiveEvents(
  context: ProactiveContext
): ProactiveEvent | null {
  const events: ProactiveEvent[] = [];
  
  // Ejecutar todos los detectores
  const greeting = detectGreeting(context);
  if (greeting) events.push(greeting);
  
  const milestone = detectMilestone(context);
  if (milestone) events.push(milestone);
  
  const networkSurge = detectNetworkSurge(context);
  if (networkSurge) events.push(networkSurge);
  
  const reminder = detectReminder(context);
  if (reminder) events.push(reminder);
  
  const inactivity = detectInactivity(context);
  if (inactivity) events.push(inactivity);
  
  const suggestion = detectSuggestion(context);
  if (suggestion) events.push(suggestion);
  
  // Retornar el de mayor prioridad
  if (events.length === 0) return null;
  
  events.sort((a, b) => b.priority - a.priority);
  return events[0];
}

/**
 * Calcula días desde el último login.
 */
export function getDaysSinceLastLogin(): number {
  try {
    const lastLogin = localStorage.getItem('omicron_last_login');
    if (!lastLogin) {
      // Primera vez
      localStorage.setItem('omicron_last_login', Date.now().toString());
      return 0;
    }
    
    const daysDiff = Math.floor((Date.now() - parseInt(lastLogin)) / (24 * 60 * 60 * 1000));
    
    // Actualizar last login
    localStorage.setItem('omicron_last_login', Date.now().toString());
    
    return daysDiff;
  } catch {
    return 0;
  }
}

/**
 * Resetea todos los throttles/cooldowns (útil para testing).
 */
export function resetProactiveState(): void {
  localStorage.removeItem(LAST_GREETING_KEY);
  localStorage.removeItem(LAST_NETWORK_CHECK_KEY);
  localStorage.removeItem('omicron_previous_rep');
  localStorage.removeItem('omicron_previous_pe');
}
