/**
 * Lieux, premier accueil et réglages du profil : mêmes écritures que les actions serveur du
 * site (src/app/lieux, src/app/bienvenue, src/app/profil), avec ma session (RLS).
 */
import type { SupabaseClient } from "@supabase/supabase-js";

import { dbErrorMessage } from "@/lib/actions";
import {
  validateDisplayName,
  validateOnboardingInput,
  validatePlaceId,
  validatePlaceInput,
  validatePlaceName,
  validateTravelMode,
} from "@/lib/places/validation";
import { validateOutingLimits } from "@/lib/scheduling/outingLimits";
import { quietHoursToDb, validateQuietHours } from "@/lib/scheduling/quietHours";

export type Result = { ok: true } | { ok: false; error: string };

async function updateProfile(
  supabase: SupabaseClient,
  userId: string,
  patch: Record<string, unknown>,
  context: string,
): Promise<Result> {
  const { data, error } = await supabase.from("profiles").update(patch).eq("id", userId).select("id");
  if (error) return { ok: false, error: dbErrorMessage(context, error) };
  return data?.length ? { ok: true } : { ok: false, error: "Profil introuvable." };
}

/** Premier accueil : maison, cégep (facultatif), transport (complete_onboarding). */
export async function completeOnboarding(supabase: SupabaseClient, input: unknown): Promise<Result> {
  const v = validateOnboardingInput(input);
  if (!v.ok) return v;
  const { home, school, travelMode } = v.value;
  const { error } = await supabase.rpc("complete_onboarding", {
    home_name: home.name,
    home_lat: home.lat,
    home_lng: home.lng,
    school_name: school?.name ?? null,
    school_lat: school?.lat ?? null,
    school_lng: school?.lng ?? null,
    mode: travelMode,
  });
  return error ? { ok: false, error: dbErrorMessage("Accueil", error) } : { ok: true };
}

/** « Plus tard » : on ne redemande plus l'accueil. */
export async function skipOnboarding(supabase: SupabaseClient): Promise<Result> {
  const { error } = await supabase.rpc("complete_onboarding", {});
  return error ? { ok: false, error: dbErrorMessage("Accueil", error) } : { ok: true };
}

export async function addPlace(
  supabase: SupabaseClient,
  userId: string,
  input: unknown,
  asHome: boolean,
): Promise<Result> {
  const place = validatePlaceInput(input);
  if (!place.ok) return place;
  const { data, error } = await supabase
    .from("places")
    .insert({ owner_id: userId, ...place.value })
    .select("id")
    .single<{ id: string }>();
  if (error) return { ok: false, error: dbErrorMessage("Ajout du lieu", error) };
  if (asHome) return setHome(supabase, userId, data.id);
  return { ok: true };
}

export async function renamePlace(supabase: SupabaseClient, userId: string, id: string, name: string): Promise<Result> {
  const placeId = validatePlaceId(id);
  if (!placeId.ok) return placeId;
  const newName = validatePlaceName(name);
  if (!newName.ok) return newName;
  const { data, error } = await supabase
    .from("places")
    .update({ name: newName.value })
    .eq("id", placeId.value)
    .eq("owner_id", userId)
    .select("id");
  if (error) return { ok: false, error: dbErrorMessage("Renommer le lieu", error) };
  return data?.length ? { ok: true } : { ok: false, error: "Lieu introuvable." };
}

export async function deletePlace(supabase: SupabaseClient, userId: string, id: string): Promise<Result> {
  const placeId = validatePlaceId(id);
  if (!placeId.ok) return placeId;
  const { data, error } = await supabase
    .from("places")
    .delete()
    .eq("id", placeId.value)
    .eq("owner_id", userId)
    .select("id");
  if (error) return { ok: false, error: dbErrorMessage("Supprimer le lieu", error) };
  return data?.length ? { ok: true } : { ok: false, error: "Lieu introuvable." };
}

export async function setHome(supabase: SupabaseClient, userId: string, id: string): Promise<Result> {
  const placeId = validatePlaceId(id);
  if (!placeId.ok) return placeId;
  return updateProfile(supabase, userId, { home_place_id: placeId.value }, "Choix de la maison");
}

export async function saveProfile(
  supabase: SupabaseClient,
  userId: string,
  input: { displayName: string; travelMode: string },
): Promise<Result> {
  const name = validateDisplayName(input.displayName);
  if (!name.ok) return name;
  const mode = validateTravelMode(input.travelMode);
  if (!mode.ok) return mode;
  return updateProfile(supabase, userId, { display_name: name.value, travel_mode: mode.value }, "Profil");
}

export async function saveQuietHours(
  supabase: SupabaseClient,
  userId: string,
  input: { before: string; after: string },
): Promise<Result> {
  const quiet = validateQuietHours(input);
  if (!quiet.ok) return quiet;
  return updateProfile(supabase, userId, quietHoursToDb(quiet.value), "Heures où je ne sors pas");
}

export async function savePrivacy(supabase: SupabaseClient, userId: string, hideTitles: boolean): Promise<Result> {
  return updateProfile(supabase, userId, { hide_block_titles: hideTitles }, "Confidentialité");
}

export async function saveOutingLimits(
  supabase: SupabaseClient,
  userId: string,
  input: { perDay: number | null; perWeek: number | null },
): Promise<Result> {
  const limits = validateOutingLimits(input);
  if (!limits.ok) return limits;
  return updateProfile(
    supabase,
    userId,
    { max_outings_per_day: limits.value.perDay, max_outings_per_week: limits.value.perWeek },
    "Limite de sorties",
  );
}
