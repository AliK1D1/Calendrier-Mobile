/**
 * « La file d'attente » : le deuxième œuf de Pâques, pour qui a déjà fait son choix de cours
 * au cégep. Écrire « omnivox » comme nom dans Profil ouvre une fausse file d'attente : la
 * position descend, quelqu'un te dépasse, ça bloque à 2, puis « Session expirée ».
 *
 * Fonctions pures (testées) : le mot magique et l'état de la file à un instant donné.
 * L'horloge est injectée (`elapsedMs`), rien n'est gardé ni envoyé.
 */

/** Le mot à écrire dans le champ du nom. */
export const MAGIC_WORD = "omnivox";

/** Vrai si le texte est exactement le mot magique (majuscules et espaces autour ignorés). */
export function isMagicWord(text: string): boolean {
  return text.trim().toLocaleLowerCase("fr-CA") === MAGIC_WORD;
}

/** Position au début de la file. */
export const START_POSITION = 4_812;

export type QueueTone = "wait" | "bad" | "good";

interface Step {
  /** Début de l'étape (ms depuis l'ouverture). */
  at: number;
  /** Position au début et à la fin de l'étape ; `null` : plus de position (hors de la file). */
  from: number | null;
  to: number | null;
  text: string;
  tone: QueueTone;
}

/** Le scénario : chaque étape dure jusqu'au début de la suivante. */
const STEPS: readonly Step[] = [
  { at: 0, from: START_POSITION, to: 38, text: "Tu es dans la file d'attente. Merci de ta patience.", tone: "wait" },
  { at: 2_400, from: 38, to: 214, text: "Oups. Toute une cohorte vient de te dépasser.", tone: "bad" },
  { at: 3_800, from: 214, to: 2, text: "Ça avance. Ne touche à rien.", tone: "wait" },
  { at: 5_800, from: 2, to: 2, text: "Presque… presque…", tone: "wait" },
  { at: 7_200, from: 1, to: 1, text: "C'est ton tour !", tone: "good" },
  { at: 8_200, from: null, to: null, text: "Session expirée. Reconnecte-toi.", tone: "bad" },
  { at: 9_800, from: null, to: null, text: "Ben non. Ici, pas de file d'attente : t'es déjà rendu.", tone: "good" },
];

/** Durée totale du gag : après ça, la file se ferme toute seule. */
export const QUEUE_MS = 12_000;

export interface QueueFrame {
  /** Rang de l'étape en cours (pour vibrer et annoncer quand elle change). */
  step: number;
  /** Position dans la file, ou `null` quand on n'y est plus. */
  position: number | null;
  text: string;
  tone: QueueTone;
  /** Barre de progression, de 0 à 1. Elle recule quand on se fait dépasser. */
  progress: number;
  /** Le gag est fini. */
  done: boolean;
}

/** État de la file `elapsedMs` après son ouverture. */
export function queueAt(elapsedMs: number): QueueFrame {
  const t = Number.isFinite(elapsedMs) ? Math.max(0, elapsedMs) : 0;
  let index = 0;
  for (let i = 0; i < STEPS.length; i++) if (t >= STEPS[i].at) index = i;
  const step = STEPS[index];
  const end = index + 1 < STEPS.length ? STEPS[index + 1].at : QUEUE_MS;
  const position = positionIn(step, Math.min(1, (t - step.at) / (end - step.at)));
  return {
    step: index,
    position,
    text: step.text,
    tone: step.tone,
    progress: progressOf(position, step.tone),
    done: t >= QUEUE_MS,
  };
}

/** Position à la fraction `f` (0 à 1) de l'étape : ça file vite, puis ça ralentit. */
function positionIn(step: Step, f: number): number | null {
  if (step.from === null || step.to === null) return null;
  const eased = 1 - (1 - f) ** 2;
  return Math.round(step.from + (step.to - step.from) * eased);
}

function progressOf(position: number | null, tone: QueueTone): number {
  // Hors de la file : tout perdu (session expirée), ou tout gagné (la chute).
  if (position === null) return tone === "good" ? 1 : 0;
  return Math.min(1, Math.max(0, 1 - (position - 1) / (START_POSITION - 1)));
}

/** « 4 812 » : milliers séparés par une espace fine insécable, comme en français. */
export function formatPosition(n: number): string {
  return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, " ");
}
