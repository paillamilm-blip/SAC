// lib/oraculo.test.ts
// Tests unitarios del motor de intención (interpret). Es la única función
// 100% pura del módulo: askTutor/askCoach llaman a Supabase y no se testean
// aquí (requieren mocking de red, fuera de alcance de un test unitario puro).
// Ejecutar: npm run test

import { describe, it, expect } from 'vitest';
import { interpret } from './oraculo';

describe('interpret — casos vacíos/inválidos', () => {
  it('string vacío → unknown', () => {
    expect(interpret('')).toEqual({ kind: 'unknown' });
  });

  it('solo espacios → unknown', () => {
    expect(interpret('   ')).toEqual({ kind: 'unknown' });
  });
});

describe('interpret — navegación', () => {
  it('detecta "academia" → tab academia', () => {
    expect(interpret('llevame a la academia')).toEqual({ kind: 'navigate', tab: 'academia', label: 'Academia' });
  });

  it('"billetera" ya no tiene pantalla: cae a unknown (la IA responde, no se abre nada vacío)', () => {
    expect(interpret('abrí mi billetera')).toEqual({ kind: 'unknown' });
  });

  it('"empleos" lleva a la Red Viva, que es donde hoy vive la evidencia del mercado', () => {
    expect(interpret('quiero ver empleos')).toEqual({ kind: 'navigate', tab: 'perfil', label: 'La Red Viva' });
  });

  it('"bóveda" sin verbo de convalidación aterriza en Academia (no hay pantalla de Bóveda)', () => {
    expect(interpret('llevame a la bóveda')).toEqual({ kind: 'navigate', tab: 'academia', label: 'Academia' });
  });

  it('"gobernanza" ya no tiene pantalla: cae a unknown', () => {
    expect(interpret('quiero votar en gobernanza')).toEqual({ kind: 'unknown' });
  });

  it('es case-insensitive', () => {
    expect(interpret('ACADEMIA')).toEqual({ kind: 'navigate', tab: 'academia', label: 'Academia' });
  });

  // El mapa de capacidades quedó montado como pestaña del hub, pero el Oráculo
  // no sabía nombrarla: 'aprend' es palabra de Academia y la secuestraba.
  it('"abrir aprendizaje" abre el mapa de capacidades, no la Academia', () => {
    expect(interpret('abrir aprendizaje')).toEqual({ kind: 'navigate', tab: 'aprendizaje', label: 'Aprendizaje' });
  });

  it('"¿cómo va mi aprendizaje?" pregunta por la pestaña, no por una lección', () => {
    expect(interpret('¿cómo va mi aprendizaje?')).toEqual({ kind: 'navigate', tab: 'aprendizaje', label: 'Aprendizaje' });
  });

  it('"ver mis brechas" y "la cola de revisión" viven en el mapa de capacidades', () => {
    expect(interpret('quiero ver mis brechas')).toEqual({ kind: 'navigate', tab: 'aprendizaje', label: 'Aprendizaje' });
    expect(interpret('abrir la cola de revisión')).toEqual({ kind: 'navigate', tab: 'aprendizaje', label: 'Aprendizaje' });
  });

  it('"curso" y "lección" siguen siendo Academia: la fila nueva no les pisa el vocabulario', () => {
    expect(interpret('dame un curso')).toEqual({ kind: 'navigate', tab: 'academia', label: 'Academia' });
    expect(interpret('quiero una lección')).toEqual({ kind: 'navigate', tab: 'academia', label: 'Academia' });
  });

  it('"¿cuál es mi brecha?" sigue siendo coach: la diagnosis la responde Ómicrom, no una pantalla', () => {
    expect(interpret('¿cuál es mi brecha?')).toEqual({ kind: 'coach' });
  });
});

// ── ÓRDENES NATURALES DE LA BARRA JARVIS (Matar el Escritorio, Inc 3) ──
// El fundador habla/escribe en lenguaje natural y la barra teletransporta al
// módulo REAL correcto (destinos verificados contra el código, sin inventar
// pantallas). Estas mapean a tabs existentes, ganando sobre las palabras
// genéricas. El spec falla si se revierten los grupos NAV_NATURAL.
describe('interpret — órdenes naturales (Jarvis)', () => {
  it('"quiero jugar" → Habilidades (maxskill hospeda los retos)', () => {
    expect(interpret('quiero jugar')).toEqual({ kind: 'navigate', tab: 'maxskill', label: 'Habilidades' });
  });

  it('"muéstrame un reto" → Habilidades (maxskill)', () => {
    expect(interpret('muéstrame un reto')).toEqual({ kind: 'navigate', tab: 'maxskill', label: 'Habilidades' });
  });

  it('"vender una idea" ya no tiene Mercado: cae a unknown', () => {
    expect(interpret('vender una idea')).toEqual({ kind: 'unknown' });
  });

  it('"quiero monetizar mi servicio" ya no tiene Mercado: cae a unknown', () => {
    expect(interpret('quiero monetizar mi servicio')).toEqual({ kind: 'unknown' });
  });

  it('"buscar trabajo freelance" → la Red Viva (es lo que el mercado pide)', () => {
    expect(interpret('buscar trabajo freelance')).toEqual({ kind: 'navigate', tab: 'perfil', label: 'La Red Viva' });
  });

  it('"ver mi ranking" → Mi Gemelo (ahí está la reputación de la red)', () => {
    expect(interpret('ver mi ranking')).toEqual({ kind: 'navigate', tab: 'perfil', label: 'Inicio' });
  });

  it('"cuál es mi posición en la tabla" → Mi Gemelo', () => {
    expect(interpret('cuál es mi posición en la tabla')).toEqual({ kind: 'navigate', tab: 'perfil', label: 'Inicio' });
  });

  it('regresión: "buscar empleo" (sin freelance) también va a la Red Viva', () => {
    expect(interpret('buscar empleo')).toEqual({ kind: 'navigate', tab: 'perfil', label: 'La Red Viva' });
  });
});

describe('interpret — convalidación', () => {
  it('"sube mi cv" → convalidate cv', () => {
    expect(interpret('sube mi cv')).toEqual({ kind: 'convalidate', item: 'cv' });
  });

  it('"agrega un título" → convalidate title', () => {
    expect(interpret('agrega un título')).toEqual({ kind: 'convalidate', item: 'title' });
  });

  it('"suma un año de experiencia" → convalidate year', () => {
    expect(interpret('suma un año de experiencia')).toEqual({ kind: 'convalidate', item: 'year' });
  });

  it('"carga un aporte a la bóveda" ya no es convalidable: la Bóveda salió del producto, aterriza en Academia', () => {
    expect(interpret('carga un aporte a la bóveda')).toEqual({ kind: 'navigate', tab: 'academia', label: 'Academia' });
  });

  it('verbo de convalidación sin objeto reconocible no revienta: cae a Habilidades, donde se valida una skill', () => {
    expect(interpret('convalida algo random sin sentido')).toEqual({ kind: 'navigate', tab: 'maxskill', label: 'Habilidades' });
  });
});

describe('interpret — coach', () => {
  it('"dame un consejo" → coach', () => {
    expect(interpret('dame un consejo')).toEqual({ kind: 'coach' });
  });

  it('"qué estudio ahora" → coach', () => {
    expect(interpret('qué estudio ahora')).toEqual({ kind: 'coach' });
  });

  it('"cómo mejoro mi reputación" → coach (trigger de coach precede a fact)', () => {
    expect(interpret('cómo mejoro mi reputación')).toEqual({ kind: 'coach' });
  });
});

describe('interpret — datos simples (fact)', () => {
  it('"cuánta reputación tengo" → fact reputacion', () => {
    expect(interpret('cuánta reputación tengo')).toEqual({ kind: 'fact', topic: 'reputacion' });
  });

  it('"cuántos tokens tengo" → fact tokens', () => {
    expect(interpret('cuántos tokens tengo')).toEqual({ kind: 'fact', topic: 'tokens' });
  });

  it('"cuántos puntos de experiencia tengo" → fact pe', () => {
    expect(interpret('cuántos puntos tengo')).toEqual({ kind: 'fact', topic: 'pe' });
  });

  it('"hola" → unknown (goes to AI brain)', () => {
    expect(interpret('hola')).toEqual({ kind: 'unknown' });
  });

  it('"qué puedo hacer" → fact ayuda', () => {
    expect(interpret('qué puedo hacer')).toEqual({ kind: 'fact', topic: 'ayuda' });
  });
});

describe('interpret — unknown', () => {
  it('frase sin ningún patrón reconocible → unknown', () => {
    expect(interpret('xkjhasdf 12341 zzz')).toEqual({ kind: 'unknown' });
  });
});
