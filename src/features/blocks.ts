/**
 * Modifier mon horaire sur le téléphone : brouillons du formulaire (fonctions pures, testées)
 * et écritures dans `busy_blocks`, mêmes règles que les actions serveur du site
 * (src/app/horaire/actions.ts) : validateBlockForm, skipOccurrence, RLS sur mes lignes.
 */
import type { SupabaseClient } from "@supabase/supabase-js";

import { dbErrorMessage } from "@/lib/actions";
import { type BusyBlockInput, fromBlockSpec, toBlockSpec } from "@/lib/db/convert";
import { restoreOccurrence, skipOccurrence, validateSkipDay } from "@/lib/scheduling/skipDays";
import {
  type BlockFormInput,
  type BlockSpec,
  formatClock,
  parseClock,
  shiftDay,
  validateBlockForm,
  validateBlockId,
  weekdayOf,
} from "@/lib/scheduling/weeklyBlocks";

export type Result = { ok: true } | { ok: false; error: string };

/** Blocs que j'ai saisis ou importés : ceux qu'on modifie ou annule une fois ici. */
export const EDITABLE_SOURCES = ["manual", "ics", "image"] as const;

export function isEditableSource(source: string | null | undefined): boolean {
  return (EDITABLE_SOURCES as readonly string[]).includes(source ?? "manual");
}

/** Brouillon du formulaire : un nouveau bloc (`id` absent) ou un bloc existant. */
export interface BlockDraft extends BlockFormInput {
  id?: string;
}

const CUSTOM_DEFAULTS = {
  repeatEvery: "2",
  repeatUnit: "week",
  repeatEnd: "never",
  repeatCount: "10",
} as const;

/** Nouveau bloc hebdomadaire ce jour-là, 1 h 30 à partir de 8 h 30 par défaut. */
export function newBlockDraft(
  day: string,
  session: { from: string; to: string },
  placeId: string | null,
): BlockDraft {
  return {
    title: "",
    placeId,
    start: "08:30",
    end: "10:00",
    kind: "weekly",
    weekdays: [weekdayOf(day)],
    date: day,
    sessionStart: session.from,
    sessionEnd: session.to,
    ...CUSTOM_DEFAULTS,
  };
}

/** Brouillon pour modifier un bloc (même règle que le site). */
export function editBlockDraft(
  b: BlockSpec & { id: string },
  day: string,
  session: { from: string; to: string },
): BlockDraft {
  const custom = b.repeatUnit != null;
  return {
    id: b.id,
    title: b.title,
    placeId: b.placeId,
    start: formatClock(b.startMinute),
    end: formatClock(b.endMinute),
    kind: custom ? "custom" : b.weekday == null ? "once" : "weekly",
    weekdays: b.weekday == null ? [weekdayOf(day)] : [b.weekday],
    date: b.weekday == null ? (b.validFrom ?? day) : day,
    sessionStart: b.validFrom ?? session.from,
    sessionEnd: b.validUntil ?? (custom ? "" : session.to),
    ...CUSTOM_DEFAULTS,
    ...(custom && {
      repeatEvery: String(b.repeatEvery ?? 1),
      repeatUnit: b.repeatUnit ?? "week",
      repeatEnd: b.validUntil ? "date" : "never",
    }),
  };
}

/** Décale une heure `HH:mm` de `minutes`, entre `min` et `max` (minutes depuis minuit). */
export function shiftClock(value: string, minutes: number, min = 0, max = 24 * 60): string {
  const m = parseClock(value) ?? 8 * 60;
  return formatClock(Math.min(max, Math.max(min, m + minutes)));
}

/** Décale un jour `yyyy-MM-dd` de `weeks` semaines. */
export function shiftWeeks(day: string, weeks: number): string {
  return shiftDay(day, 7 * weeks);
}

/** Ajoute un bloc (un par jour coché s'il est hebdomadaire), tout ou rien. */
export async function addBlocks(supabase: SupabaseClient, userId: string, draft: BlockDraft): Promise<Result> {
  const blocs = validateBlockForm(draft);
  if (!blocs.ok) return blocs;
  const { error } = await supabase
    .from("busy_blocks")
    .insert(blocs.value.map((b) => ({ ...fromBlockSpec(b), owner_id: userId, source: "manual" })));
  return error ? { ok: false, error: dbErrorMessage("Ajout de bloc", error) } : { ok: true };
}

/** Modifie un de mes blocs. */
export async function updateBlock(supabase: SupabaseClient, userId: string, draft: BlockDraft): Promise<Result> {
  const blockId = validateBlockId(draft.id);
  if (!blockId.ok) return blockId;
  const blocs = validateBlockForm(draft, { single: true });
  if (!blocs.ok) return blocs;
  const { data, error } = await supabase
    .from("busy_blocks")
    .update(fromBlockSpec(blocs.value[0]))
    .eq("id", blockId.value)
    .eq("owner_id", userId)
    .select("id");
  if (error) return { ok: false, error: dbErrorMessage("Modification de bloc", error) };
  return data?.length ? { ok: true } : { ok: false, error: "Bloc introuvable." };
}

/** Supprime un de mes blocs (toutes ses semaines). */
export async function deleteBlock(supabase: SupabaseClient, userId: string, id: string): Promise<Result> {
  const blockId = validateBlockId(id);
  if (!blockId.ok) return blockId;
  const { data, error } = await supabase
    .from("busy_blocks")
    .delete()
    .eq("id", blockId.value)
    .eq("owner_id", userId)
    .select("id");
  if (error) return { ok: false, error: dbErrorMessage("Suppression de bloc", error) };
  return data?.length ? { ok: true } : { ok: false, error: "Bloc introuvable." };
}

const SKIP_COLUMNS =
  "id, owner_id, title, place_id, start_time, end_time, weekday, valid_from, valid_until, repeat_unit, repeat_every, source, skip_days";

/** « Cours annulé cette fois-ci » (`skip` vrai) ou rétablir cette occurrence. */
export async function setOccurrence(
  supabase: SupabaseClient,
  userId: string,
  id: string,
  day: string,
  skip: boolean,
  today: string,
): Promise<Result> {
  const blockId = validateBlockId(id);
  if (!blockId.ok) return blockId;
  const jour = validateSkipDay(day);
  if (!jour.ok) return jour;
  const read = await supabase
    .from("busy_blocks")
    .select(SKIP_COLUMNS)
    .eq("id", blockId.value)
    .eq("owner_id", userId)
    .maybeSingle<BusyBlockInput & { source: string }>();
  if (read.error?.code === "42703") {
    return { ok: false, error: "La base de données n'est pas à jour : applique la migration 0021 du site." };
  }
  if (read.error) return { ok: false, error: dbErrorMessage("Occurrence annulée", read.error) };
  if (!read.data) return { ok: false, error: "Bloc introuvable." };
  if (!isEditableSource(read.data.source)) return { ok: false, error: "Ce bloc ne s'annule pas ici." };

  const spec = toBlockSpec(read.data);
  let next: string[];
  if (skip) {
    const r = skipOccurrence(spec, jour.value, today);
    if (!r.ok) return r;
    next = r.value;
  } else {
    next = restoreOccurrence(spec, jour.value);
  }
  const { data, error } = await supabase
    .from("busy_blocks")
    .update({ skip_days: next })
    .eq("id", blockId.value)
    .eq("owner_id", userId)
    .select("id");
  if (error) return { ok: false, error: dbErrorMessage("Occurrence annulée", error) };
  return data?.length ? { ok: true } : { ok: false, error: "Bloc introuvable." };
}
