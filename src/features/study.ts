/**
 * Étude sur le téléphone : mêmes calculs que le site (src/lib/study/service.ts, copiés) et
 * mêmes écritures que ses actions serveur (src/app/etude/actions.ts), avec ma session (RLS).
 * Trajets estimés (comme « Quand on peut se voir » dans l'app).
 */
import type { SupabaseClient } from "@supabase/supabase-js";

import { dbErrorMessage } from "@/lib/actions";
import { validateUuid } from "@/lib/groups/validation";
import type { Locale } from "@/lib/i18n/config";
import { requiredMinutes } from "@/lib/scheduling/studyPlanner";
import { EstimatedTravelProvider } from "@/lib/scheduling/travel";
import {
  type AcceptResult,
  planMyStudy,
  prepareAcceptance,
  replanMyConflicts,
  type SessionView,
  studyOverview,
} from "@/lib/study/service";
import { supabaseStudyStore } from "@/lib/study/supabaseStore";
import { validateDeadlineForm, validateSessionList } from "@/lib/study/validation";

export type Result = { ok: true } | { ok: false; error: string };

const travel = new EstimatedTravelProvider();

const deps = (userId: string, locale: Locale) => ({ userId, now: new Date(), travel, locale });

/** Ce qu'envoie une séance proposée pour être acceptée (même forme que le site). */
export function sessionInput(s: SessionView) {
  return {
    key: s.key,
    deadlineId: s.deadlineId,
    start: s.start,
    end: s.end,
    placeId: s.placeId,
    kind: s.kind,
    replacesId: s.replacesId,
  };
}

export function loadOverview(supabase: SupabaseClient, userId: string, locale: Locale) {
  return studyOverview(supabaseStudyStore(supabase, userId), deps(userId, locale), requiredMinutes);
}

export function planStudy(supabase: SupabaseClient, userId: string, locale: Locale) {
  return planMyStudy(supabaseStudyStore(supabase, userId), deps(userId, locale));
}

export function replanConflicts(supabase: SupabaseClient, userId: string, locale: Locale) {
  return replanMyConflicts(supabaseStudyStore(supabase, userId), deps(userId, locale));
}

export async function addDeadline(supabase: SupabaseClient, userId: string, input: unknown): Promise<Result> {
  const v = validateDeadlineForm(input, new Date());
  if (!v.ok) return v;
  const { error } = await supabase.from("deadlines").insert({
    owner_id: userId,
    kind: v.value.kind,
    course: v.value.course,
    due_at: v.value.dueAt.toISOString(),
    estimated_hours: v.value.estimatedHours,
    difficulty: v.value.difficulty,
  });
  return error ? { ok: false, error: dbErrorMessage("Ajout d'échéance", error) } : { ok: true };
}

export async function deleteDeadline(supabase: SupabaseClient, userId: string, id: string): Promise<Result> {
  const d = validateUuid(id, "Échéance introuvable.");
  if (!d.ok) return d;
  const { data, error } = await supabase.from("deadlines").delete().eq("id", d.value).eq("owner_id", userId).select("id");
  if (error) return { ok: false, error: dbErrorMessage("Suppression d'échéance", error) };
  return data?.length ? { ok: true } : { ok: false, error: "Échéance introuvable." };
}

/** Accepte des séances : tout est revalidé, puis écrit (source « study », déplaçable). */
export async function acceptSessions(
  supabase: SupabaseClient,
  userId: string,
  sessions: SessionView[],
  locale: Locale,
): Promise<AcceptResult> {
  const list = validateSessionList(sessions.map(sessionInput));
  if (!list.ok) return list;
  const plan = await prepareAcceptance(supabaseStudyStore(supabase, userId), list.value, deps(userId, locale));
  if (!plan.ok) return plan;
  if (plan.value.inserts.length > 0) {
    const { error } = await supabase
      .from("busy_blocks")
      .insert(plan.value.inserts.map((row) => ({ ...row, owner_id: userId, source: "study", movable: true })));
    if (error) return { ok: false, error: dbErrorMessage("Accepter des séances", error) };
  }
  for (const u of plan.value.updates) {
    const { data, error } = await supabase
      .from("busy_blocks")
      .update(u.row)
      .eq("id", u.id)
      .eq("owner_id", userId)
      .eq("source", "study")
      .select("id");
    if (error) return { ok: false, error: dbErrorMessage("Déplacer une séance", error) };
    if (!data?.length) return { ok: false, error: "Séance introuvable." };
  }
  return { ok: true, count: plan.value.inserts.length + plan.value.updates.length };
}

export async function removeSession(supabase: SupabaseClient, userId: string, id: string): Promise<Result> {
  const s = validateUuid(id, "Séance introuvable.");
  if (!s.ok) return s;
  const { data, error } = await supabase
    .from("busy_blocks")
    .delete()
    .eq("id", s.value)
    .eq("owner_id", userId)
    .eq("source", "study")
    .select("id");
  if (error) return { ok: false, error: dbErrorMessage("Retirer une séance", error) };
  return data?.length ? { ok: true } : { ok: false, error: "Séance introuvable." };
}

export async function setMovable(supabase: SupabaseClient, userId: string, id: string, movable: boolean): Promise<Result> {
  const s = validateUuid(id, "Séance introuvable.");
  if (!s.ok) return s;
  const { data, error } = await supabase
    .from("busy_blocks")
    .update({ movable })
    .eq("id", s.value)
    .eq("owner_id", userId)
    .eq("source", "study")
    .select("id");
  if (error) return { ok: false, error: dbErrorMessage("Séance déplaçable", error) };
  return data?.length ? { ok: true } : { ok: false, error: "Séance introuvable." };
}
