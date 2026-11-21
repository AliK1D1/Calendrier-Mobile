/**
 * « Proposer un moment » sur le téléphone (fonctions pures, testées) : brouillon à partir
 * d'une proposition de « Quand on peut se voir », choix du jour et de l'heure sans
 * calendrier natif (jours en liste, heure par pas de 15 min), et mêmes règles que le site
 * (`validatePropose`) avant l'appel à `propose_meetup`.
 */
import type { SupabaseClient } from "@supabase/supabase-js";

import type { FreeNowMatchView } from "@/lib/meetups/freeNow";
import type { ProposalView } from "@/lib/meetups/search";
import { type PlanRepeat, type ProposeFormInput, draftFromSlot, validatePropose } from "@/lib/plans/validation";
import { formatClock, parseClock, shiftDay } from "@/lib/scheduling/weeklyBlocks";

import { planError } from "./actions";
import { dayLabelFr } from "./agenda";

/** Pas de l'heure de début, en minutes. */
export const START_STEP = 15;

/** Brouillon du formulaire (même forme que le site). */
export type ProposeDraft = ProposeFormInput & { fromSlot?: string };

/** Brouillon à partir d'une carte « Quand on peut se voir ». */
export function draftFromProposal(
  p: ProposalView,
  opts: {
    groupId: string;
    memberIds: readonly string[];
    participantIds: readonly string[];
    defaultTitle: string;
    callTitle: string;
    callLocation: string;
  },
): ProposeDraft {
  const call = p.kind === "call";
  const everyone = opts.memberIds.every((id) => opts.participantIds.includes(id));
  return {
    groupId: opts.groupId,
    title: call ? opts.callTitle : opts.defaultTitle,
    ...draftFromSlot(p.start, p.durationMinutes),
    placeId: call ? null : p.placeId,
    location: call ? opts.callLocation : "",
    inviteeIds: everyone ? null : [...opts.participantIds],
    repeat: null,
    fromSlot: `${p.dayLabel}, ${p.timeLabel}${call ? " (appel)" : p.placeName ? ` · ${p.placeName}` : ""}`,
  };
}

/**
 * Brouillon à partir de « Je suis libre maintenant » (page d'un groupe) : moi et cette
 * personne seulement, au moment trouvé.
 */
export function draftFromFreeNow(
  m: FreeNowMatchView,
  opts: { groupId: string; userId: string; defaultTitle: string; callTitle: string; callLocation: string },
): ProposeDraft {
  const call = m.kind === "call";
  return {
    groupId: opts.groupId,
    title: call ? opts.callTitle : opts.defaultTitle,
    ...draftFromSlot(m.start, m.durationMinutes),
    placeId: call ? null : m.placeId,
    location: call ? opts.callLocation : "",
    inviteeIds: [opts.userId, m.personId],
    repeat: null,
    fromSlot: `${m.dayLabel}, ${m.timeLabel} · ${m.name}${call ? " (appel)" : m.placeName ? ` · ${m.placeName}` : ""}`,
  };
}

/** Les `count` prochains jours à partir d'aujourd'hui, avec un libellé court. */
export function nextDays(today: string, count: number): { day: string; label: string }[] {
  return Array.from({ length: count }, (_, i) => {
    const day = shiftDay(today, i);
    const label = i === 0 ? "Aujourd'hui" : i === 1 ? "Demain" : dayLabelFr(day);
    return { day, label };
  });
}

/** Décale l'heure `HH:mm` de `steps` pas de 15 min, sans sortir de 00:00 – 23:45. */
export function shiftStart(start: string, steps: number): string {
  const m = parseClock(start) ?? 18 * 60;
  const next = Math.min(24 * 60 - START_STEP, Math.max(0, m + steps * START_STEP));
  return formatClock(next);
}

/** Répétitions offertes sur le téléphone (le site offre aussi « personnalisé »). */
export type RepeatChoice = "none" | "day1" | "week1";

export function repeatOf(choice: RepeatChoice): PlanRepeat | null {
  if (choice === "day1") return { unit: "day", every: 1, until: null };
  if (choice === "week1") return { unit: "week", every: 1, until: null };
  return null;
}

/** Envoie la proposition (même fonction SQL que le site). */
export async function proposeMoment(
  supabase: SupabaseClient,
  draft: ProposeFormInput,
  now: Date,
): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const input = validatePropose(draft, now);
  if (!input.ok) return input;
  const v = input.value;
  const common = {
    p_group: v.groupId,
    p_starts_at: v.startsAt,
    p_ends_at: v.endsAt,
    p_title: v.title,
    p_place: v.placeId,
    p_location: v.location,
    p_invitees: v.inviteeIds,
  };
  const { data, error } = v.repeat
    ? await supabase.rpc("propose_recurring_meetup", {
        ...common,
        p_repeat_unit: v.repeat.unit,
        p_repeat_every: v.repeat.every,
        p_repeat_until: v.repeat.until,
      })
    : await supabase.rpc("propose_meetup", common);
  if (error) return { ok: false, error: planError("Proposer un moment", error) };
  if (typeof data !== "string") return { ok: false, error: "La proposition n'a pas fonctionné." };
  return { ok: true, id: data };
}
