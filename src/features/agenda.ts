/**
 * Mon horaire en liste, jour par jour (fonction pure, testée) : l'écran Horaire du téléphone
 * montre une semaine à la fois, comme la grille du site, mais en liste lisible sur un petit
 * écran. Mêmes règles que le site pour savoir si un bloc a lieu (répétitions, cours annulé).
 */
import { type BusyBlockInput, toBlockSpec } from "@/lib/db/convert";
import {
  type BlockSpec,
  blocksOnDay,
  formatClockFr,
  shiftDay,
  WEEKDAY_LONG,
  weekdayOf,
  weekDays,
  weekStart,
} from "@/lib/scheduling/weeklyBlocks";

export interface AgendaItem {
  id: string;
  /** Le bloc (pour le modifier, ou annuler cette fois-ci). */
  block: AgendaBlock;
  /** Occurrence annulée ce jour-là (« cours annulé cette fois-ci ») : affichée barrée. */
  skipped: boolean;
  title: string;
  /** « 8 h 30 – 10 h 20 » */
  timeLabel: string;
  /** Origine : cours saisi, plan de groupe, séance d'étude, import… */
  source: string | null;
}

export interface AgendaDay {
  day: string;
  /** « lundi 16 novembre » */
  label: string;
  isToday: boolean;
  items: AgendaItem[];
}

const MONTHS = [
  "janvier", "février", "mars", "avril", "mai", "juin",
  "juillet", "août", "septembre", "octobre", "novembre", "décembre",
];

/** « lundi 16 novembre » pour `2026-11-16`. */
export function dayLabelFr(day: string): string {
  const [, m, d] = day.split("-").map(Number);
  return `${WEEKDAY_LONG[weekdayOf(day)]} ${d === 1 ? "1er" : d} ${MONTHS[m - 1]}`;
}

/** Bloc de mon horaire, avec son identifiant et son origine. */
export type AgendaBlock = BlockSpec & { id: string; source: string | null };

/** Lundi de la semaine décalée de `offset` semaines par rapport à `today`. */
export function mondayOf(today: string, offset: number): string {
  return shiftDay(weekStart(today), 7 * offset);
}

/** Les 7 jours de la semaine du lundi `monday`, avec les blocs de chaque jour. */
export function weekAgenda(
  rows: readonly (BusyBlockInput & { source?: string | null })[],
  monday: string,
  today: string,
): AgendaDay[] {
  const specs: AgendaBlock[] = rows.map((r) => ({
    ...toBlockSpec(r),
    id: r.id,
    source: r.source ?? null,
  }));
  // Les occurrences annulées restent visibles (barrées), pour pouvoir les rétablir.
  const withSkipped = specs.map((b) => ({ ...b, skipDays: undefined, original: b }));
  return weekDays(monday).map((day) => ({
    day,
    label: dayLabelFr(day),
    isToday: day === today,
    items: blocksOnDay(withSkipped, day).map((b) => ({
      id: `${b.id}-${day}`,
      block: b.original,
      skipped: b.original.skipDays?.includes(day) ?? false,
      title: b.title,
      timeLabel: `${formatClockFr(b.startMinute)} – ${formatClockFr(b.endMinute)}`,
      source: b.source,
    })),
  }));
}
