/**
 * Petites mises en forme pour l'interface du téléphone (fonctions pures, testées) : initiales
 * et teinte d'un avatar, étiquette de date d'une carte, libellé d'une semaine, liste de noms.
 */
import { formatInTimeZone } from "date-fns-tz";

import { TIME_ZONE } from "@/lib/scheduling/time";
import { shiftDay, type Weekday, WEEKDAY_SHORT, weekdayOf } from "@/lib/scheduling/weeklyBlocks";

const MONTHS_SHORT = [
  "janv.", "févr.", "mars", "avr.", "mai", "juin",
  "juill.", "août", "sept.", "oct.", "nov.", "déc.",
];

/** Initiales d'un nom (2 lettres au plus) : « Ali Khaldi » → « AK », « sam » → « S ». */
export function initials(name: string): string {
  const words = name.trim().split(/[\s\-_.]+/u).filter(Boolean);
  if (words.length === 0) return "?";
  const first = [...words[0]][0] ?? "";
  const last = words.length > 1 ? ([...words[words.length - 1]][0] ?? "") : "";
  return (first + last).toLocaleUpperCase("fr-CA");
}

/**
 * Teinte d'un avatar (1 à 7, les couleurs des jours de l'horaire) : toujours la même pour le
 * même nom, pour reconnaître quelqu'un d'un coup d'œil.
 */
export function avatarTone(name: string): Weekday {
  let h = 0;
  for (const ch of name.trim().toLocaleLowerCase("fr-CA")) h = (h * 31 + (ch.codePointAt(0) ?? 0)) % 9973;
  return ((h % 7) + 1) as Weekday;
}

export interface DateTileParts {
  /** « lun. » */
  weekday: string;
  /** « 16 » */
  day: string;
  /** « nov. » */
  month: string;
}

/** Les trois lignes d'une étiquette de date pour le jour `aaaa-mm-jj`. */
export function dateTile(day: string): DateTileParts {
  const [, m, d] = day.split("-").map(Number);
  return { weekday: WEEKDAY_SHORT[weekdayOf(day)], day: String(d), month: MONTHS_SHORT[m - 1] };
}

/** Jour civil (à Montréal) d'un instant ISO : « 2026-11-17T01:30:00Z » → « 2026-11-16 ». */
export function dayOfInstant(iso: string): string {
  return formatInTimeZone(new Date(iso), TIME_ZONE, "yyyy-MM-dd");
}

/** « 16 – 22 nov. », ou « 30 nov. – 6 déc. » quand la semaine chevauche deux mois. */
export function weekRangeLabel(monday: string): string {
  const sunday = shiftDay(monday, 6);
  const [, m1, d1] = monday.split("-").map(Number);
  const [, m2, d2] = sunday.split("-").map(Number);
  const jour = (d: number) => (d === 1 ? "1er" : String(d));
  return m1 === m2
    ? `${jour(d1)} – ${jour(d2)} ${MONTHS_SHORT[m2 - 1]}`
    : `${jour(d1)} ${MONTHS_SHORT[m1 - 1]} – ${jour(d2)} ${MONTHS_SHORT[m2 - 1]}`;
}

/** Jour montré à l'ouverture d'une semaine : aujourd'hui s'il en fait partie, sinon le lundi. */
export function defaultDay(days: readonly string[], today: string): string {
  return days.includes(today) ? today : (days[0] ?? today);
}

/** « Ali », « Ali et Sam », « Ali, Sam et 2 autres ». */
export function namesSummary(names: readonly string[], max = 2): string {
  if (names.length === 0) return "";
  if (names.length === 1) return names[0];
  if (names.length <= max) return `${names.slice(0, -1).join(", ")} et ${names[names.length - 1]}`;
  const rest = names.length - max;
  return `${names.slice(0, max).join(", ")} et ${rest} autre${rest > 1 ? "s" : ""}`;
}
