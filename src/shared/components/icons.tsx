// shared/components/icons.tsx
// ═══════════════════════════════════════════════════════════════════════
// El ÚNICO traductor entre "qué rol cumple" y "qué se dibuja".
//
// Por qué existe: hasta L3 la app tenía dos lenguajes de icono conviviendo.
// Ocho archivos ya importaban lucide-react y dibujaban SVG; el resto guardaba
// un glifo unicode en un dato (`icon: '◈'`, `emoji: '🔥'`) y lo pintaba en un
// `<span>`. Un glifo unicode no es un icono: su trazo depende de la fuente que
// el sistema tenga, cambia de tamaño entre plataformas, no hereda el color del
// usuario y no escala sin romper la línea de base. El emoji además trae la
// paleta de la plataforma, que es exactamente el color que este sistema prohibió.
//
// La regla: ningún dato guarda un carácter y ninguna pantalla guarda un glifo.
// Se guarda un ROL y acá se resuelve el dibujo.
//
// El trazo, en cambio, vive en UN solo lugar para TODOS los iconos del sistema
// (los ~200 llamados directos a lucide incluidos): la regla `svg.lucide` de
// src/index.css. Reescribir cada llamado para pasar por acá sería churn sin
// ganancia visual; lo que sí se unifica de una es el peso de la línea.
//
// Añadir un rol: el rol tiene que describir un papel que la app ya necesita. Si
// no lo necesita, no se agrega; se reusa. Los cinco niveles de la jerarquía
// ('elite' … 'novato') los comparten el Gemelo y la Red, que antes tenían dos
// escaleras de emoji que ni siquiera decían lo mismo.
// ═══════════════════════════════════════════════════════════════════════
import type { CSSProperties, ReactNode } from 'react';
import {
  AlertTriangle, ArrowDownRight, ArrowLeft, ArrowRight, ArrowUpRight, Award, BookOpen,
  Brain, Check, CheckCircle2, Circle, Compass, Crown, Dna, FileText, Flame, GraduationCap,
  Hexagon, Laptop, Lightbulb, Link, Mic, Moon, Palette, Pencil, RefreshCw, Rocket,
  ScrollText, Send, Settings, Sparkles, Sprout, Star, Target, TrendingUp, Trophy, Unlock, X, Zap,
  type LucideIcon,
} from 'lucide-react';

export type IconRole =
  // ── Los cuatro destinos del hub ──
  | 'gemelo' | 'academia' | 'habilidades' | 'aprendizaje'
  // ── Acciones que ofrece el asistente ──
  | 'cv' | 'descubrir' | 'curso' | 'validar' | 'compartir' | 'reintentar' | 'editar'
  // ── Estado real de una habilidad (el dato manda, no la decoración) ──
  | 'declarada' | 'en-curso' | 'probada'
  // ── Señales de estado ──
  | 'idea' | 'meta' | 'racha' | 'en-reposo' | 'subio' | 'bajó' | 'tendencia' | 'sinergia'
  | 'exito' | 'error' | 'aviso' | 'desbloqueado' | 'nodo' | 'cerebro' | 'documento' | 'registro'
  // ── Controles táctiles ──
  | 'cerrar' | 'anterior' | 'siguiente' | 'microfono' | 'enviar' | 'volver'
  // ── Una sola escalera de niveles para toda la app ──
  | 'elite' | 'senior' | 'avanzado' | 'intermedio' | 'novato' | 'pionero'
  // ── Profesiones del alta ──
  | 'prof-desarrollo' | 'prof-diseno' | 'prof-industria' | 'prof-estudiante' | 'prof-freelance';

const TABLE: Record<IconRole, LucideIcon> = {
  'gemelo': Hexagon,
  'academia': GraduationCap,
  'habilidades': Target,
  'aprendizaje': Compass,

  'cv': FileText,
  'descubrir': Sparkles,
  'curso': BookOpen,
  'validar': Award,
  'compartir': Link,
  'reintentar': RefreshCw,
  'editar': Pencil,

  'declarada': Circle,
  'en-curso': Target,
  'probada': Check,

  'idea': Lightbulb,
  'meta': Target,
  'racha': Flame,
  'en-reposo': Moon,
  'subio': ArrowUpRight,
  'bajó': ArrowDownRight,
  'tendencia': TrendingUp,
  'sinergia': Zap,
  'exito': CheckCircle2,
  'error': AlertTriangle,
  'aviso': AlertTriangle,
  'desbloqueado': Unlock,
  'nodo': Dna,
  'cerebro': Brain,
  'documento': FileText,
  'registro': ScrollText,

  'cerrar': X,
  'anterior': ArrowLeft,
  'siguiente': ArrowRight,
  'microfono': Mic,
  'enviar': Send,
  'volver': ArrowLeft,

  'elite': Crown,
  'senior': Star,
  'avanzado': TrendingUp,
  'intermedio': Award,
  'novato': Sprout,
  'pionero': Trophy,

  'prof-desarrollo': Laptop,
  'prof-diseno': Palette,
  'prof-industria': Settings,
  'prof-estudiante': GraduationCap,
  'prof-freelance': Rocket,
};

interface IconProps {
  role: IconRole;
  size?: number;
  /** Trazo. Si se omite, hereda el color del texto que acompaña (currentColor). */
  color?: string;
  style?: CSSProperties;
  /** Nombre para un lector de pantalla. Sin él, el icono es decorativo y se oculta. */
  label?: string;
}

export function Icon({ role, size = 16, color, style, label }: IconProps): ReactNode {
  const Cmp = TABLE[role];
  return (
    <Cmp
      size={size}
      strokeWidth={1.75}
      color={color}
      style={{ display: 'block', ...style }}
      aria-hidden={label ? undefined : true}
      aria-label={label}
      role={label ? 'img' : undefined}
    />
  );
}
