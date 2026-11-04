// Guarda de la migración que crea donde se guardan los análisis de cada persona. No ejecuta SQL (en CI no hay
// Postgres): comprueba que nadie le quite la seguridad por descuido y que coincida con lo que el código usa.

import { describe, expect, it } from 'vitest';
import sql from '../../../supabase/migrations/10012_brecha_db.sql?raw';
import nube from '../../features/brecha/services/nube.ts?raw';

/** El SQL sin comentarios de línea, para no confundir texto explicativo con instrucciones. */
const codigo = sql
  .split('\n')
  .filter((l) => !l.trim().startsWith('--'))
  .join('\n');

describe('migración 10012_brecha_db.sql', () => {
  it('crea la tabla que el código lee y escribe', () => {
    expect(codigo).toMatch(/create table if not exists public\.brecha_db\b/i);
    expect(nube).toContain("from('brecha_db')");
  });

  it('activa RLS y define una política por operación, todas atadas a auth.uid()', () => {
    expect(codigo).toMatch(/alter table public\.brecha_db enable row level security/i);
    const politicas = codigo.match(/create policy [\s\S]*?;/gi) ?? [];
    expect(politicas).toHaveLength(4);
    for (const operacion of ['select', 'insert', 'update', 'delete']) {
      expect(politicas.some((p) => new RegExp(`for ${operacion}\\b`, 'i').test(p)), `falta la política de ${operacion}`).toBe(true);
    }
    for (const p of politicas) {
      expect(p, 'toda política se limita al propio usuario').toMatch(/auth\.uid\(\)\s*\)?\s*=\s*user_id/i);
      expect(p, 'solo para personas con sesión').toMatch(/to authenticated\b/i);
      expect(p).not.toMatch(/to (anon|public)\b/i);
      expect(p).not.toMatch(/using\s*\(\s*true\s*\)|with check\s*\(\s*true\s*\)/i);
    }
  });

  it('actualizar exige que la fila siga siendo de la misma persona (no se puede regalar ni robar)', () => {
    const actualizar = (codigo.match(/create policy [^;]*for update[\s\S]*?;/i) ?? [''])[0];
    expect(actualizar).toMatch(/using/i);
    expect(actualizar).toMatch(/with check/i);
  });

  it('quita el acceso a anon y a public, y solo da permisos a authenticated', () => {
    expect(codigo).toMatch(/revoke all on public\.brecha_db from anon, public/i);
    expect(codigo).toMatch(/grant select, insert, update, delete on public\.brecha_db to authenticated/i);
    expect(codigo).not.toMatch(/grant [^;]*\bto (anon|public)\b/i);
  });

  it('valida la forma y acota el tamaño del documento', () => {
    expect(codigo).toMatch(/jsonb_typeof\(data\)\s*=\s*'object'/i);
    // Debe tratar la clave ausente como inválida: un CHECK que evalúa a NULL pasa, y jsonb_typeof(NULL) es NULL.
    expect(codigo).toMatch(/coalesce\(\s*jsonb_typeof\(data\s*->\s*'analisis'\)\s*=\s*'array'\s*,\s*false\s*\)/i);
    expect(codigo).toMatch(/pg_column_size\(data\)\s*<=\s*\d+/i);
  });

  it('borrar a la persona borra su copia, y la fila es una por persona', () => {
    expect(codigo).toMatch(/user_id\s+uuid primary key references public\.profiles\(id\) on delete cascade/i);
  });

  it('es idempotente: se puede pegar dos veces sin error', () => {
    expect(codigo).not.toMatch(/create table (?!if not exists)/i);
    expect(codigo).toMatch(/drop trigger if exists brecha_db_touch/i);
    expect(codigo).toMatch(/create or replace function public\.brecha_db_touch/i);
    for (const bloque of codigo.match(/create policy[^;]*;/gi) ?? []) expect(bloque).toBeTruthy();
    expect((codigo.match(/if not exists \(select 1 from pg_policies/gi) ?? []).length).toBe(4);
  });

  it('no usa comandos de la terminal ni deja texto que no sea SQL (se pega tal cual en el editor)', () => {
    expect(codigo).not.toMatch(/^\s*(supabase|npm|git|cd|psql)\b/im);
    expect(codigo).not.toMatch(/Initialising|Connecting to remote/i);
  });
});
