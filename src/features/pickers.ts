/**
 * Conversions pour les sélecteurs natifs d'heure et de date (roulette d'iOS, horloge et
 * calendrier Material). Le sélecteur rend un `Date` dans le fuseau de l'appareil ; on n'en
 * garde que l'heure et les minutes (ou l'année, le mois et le jour), lus dans ce même fuseau,
 * donc sans calcul de fuseau.
 */

/** Minutes depuis minuit → heures et minutes. */
export function clockParts(minutes: number): { hours: number; minutes: number } {
  const m = Math.max(0, Math.round(minutes));
  return { hours: Math.floor(m / 60) % 24, minutes: m % 60 };
}

/**
 * Heure choisie dans le sélecteur → minutes depuis minuit, arrondies au pas (`step`) et
 * gardées entre `min` et `max` (ex. une fin ne peut pas être avant 0 h 15).
 */
export function pickedClock(hours: number, minutes: number, step: number, min: number, max: number): number {
  const raw = hours * 60 + minutes;
  const snapped = step > 0 ? Math.round(raw / step) * step : raw;
  return Math.min(max, Math.max(min, snapped));
}

/** Jour `yyyy-MM-dd` → année, mois (1-12) et jour. `null` si le texte n'est pas une date. */
export function dayParts(day: string): { year: number; month: number; date: number } | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(day);
  if (!m) return null;
  return { year: Number(m[1]), month: Number(m[2]), date: Number(m[3]) };
}

/** Année, mois (1-12) et jour → `yyyy-MM-dd`. */
export function dayFromParts(year: number, month: number, date: number): string {
  const two = (n: number) => String(n).padStart(2, "0");
  return `${year}-${two(month)}-${two(date)}`;
}

/** Pas de minutes accepté par la roulette d'iOS (1, 5, 10, 15, 30…), sinon 1. */
export function iosMinuteInterval(step: number): 1 | 2 | 3 | 4 | 5 | 6 | 10 | 12 | 15 | 20 | 30 {
  const allowed = [1, 2, 3, 4, 5, 6, 10, 12, 15, 20, 30] as const;
  return allowed.find((a) => a === step) ?? 1;
}

/** Ce qu'un sélecteur natif doit montrer et rendre. */
export type PickerSpec =
  | { mode: "time"; minutes: number; step: number; min: number; max: number; onPick: (minutes: number) => void }
  | { mode: "date"; day: string; onPick: (day: string) => void };

/** Valeur initiale du sélecteur, comme heure ou jour de l'appareil. */
export function pickerDate(spec: PickerSpec): Date {
  if (spec.mode === "time") {
    const { hours, minutes } = clockParts(spec.minutes);
    return new Date(2000, 0, 1, hours, minutes);
  }
  const p = dayParts(spec.day);
  return p ? new Date(p.year, p.month - 1, p.date, 12) : new Date();
}

/** Rend au formulaire la valeur choisie dans le sélecteur. */
export function applyPicked(spec: PickerSpec, picked: Date): void {
  if (spec.mode === "time") {
    spec.onPick(pickedClock(picked.getHours(), picked.getMinutes(), spec.step, spec.min, spec.max));
  } else {
    spec.onPick(dayFromParts(picked.getFullYear(), picked.getMonth() + 1, picked.getDate()));
  }
}
