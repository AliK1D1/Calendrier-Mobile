/**
 * Notifications : logique pure (aucun module natif ici), testée dans
 * __tests__/notifications.test.ts. Les appels à expo-notifications sont dans
 * src/services/notifications.ts.
 *
 * Deux sortes de notifications :
 * - poussées, envoyées par la base de données (migration 0023 du site) : nouveau plan, réponse
 *   à mon plan, plan annulé. Le téléphone s'inscrit avec son jeton Expo ;
 * - locales, programmées sur le téléphone : rappel avant un plan où je vais.
 */
import { formatInTimeZone } from "date-fns-tz";

import { TIME_ZONE } from "@/lib/scheduling/time";

/** Canal Android des notifications poussées (le même nom que `channelId` dans la BD). */
export const CANAL_PLANS = "plans";
/** Canal Android des rappels avant un plan. */
export const CANAL_RAPPELS = "rappels";

/** Même format que la contrainte `push_tokens_format` de la BD. */
const FORMAT_JETON = /^Expo(nent)?PushToken\[[A-Za-z0-9_-]+\]$/;

export function estJetonExpo(valeur: unknown): valeur is string {
  return typeof valeur === "string" && valeur.length <= 200 && FORMAT_JETON.test(valeur);
}

/** Plateforme acceptée par `register_push_token`, ou `null` (web : pas de notifications). */
export function plateformePush(os: string): "ios" | "android" | null {
  return os === "ios" || os === "android" ? os : null;
}

/** Identifiant du projet Expo (app.json : extra.eas.projectId), ou `null` s'il manque. */
export function idProjetExpo(expoConfig: unknown, easConfig: unknown): string | null {
  const depuisExtra = lire(lire(lire(expoConfig, "extra"), "eas"), "projectId");
  const id = typeof depuisExtra === "string" ? depuisExtra : lire(easConfig, "projectId");
  return typeof id === "string" && /^[0-9a-f-]{36}$/i.test(id) ? id : null;
}

function lire(objet: unknown, cle: string): unknown {
  return objet !== null && typeof objet === "object" ? (objet as Record<string, unknown>)[cle] : undefined;
}

/** Pourquoi les notifications poussées ne marchent pas sur ce téléphone. */
export type RaisonSansPush = "web" | "expo-go-android" | "projet-absent" | "refusees" | "erreur";

export interface Environnement {
  os: string;
  /** Expo Go (et non une version de développement ou l'app installée). */
  expoGo: boolean;
  projectId: string | null;
}

/** Les notifications poussées sont-elles possibles ici (avant de demander la permission) ? */
export function pushPossible(env: Environnement): { ok: true; projectId: string } | { ok: false; raison: RaisonSansPush } {
  if (plateformePush(env.os) === null) return { ok: false, raison: "web" };
  // Depuis le SDK 53, Expo Go sur Android ne reçoit plus de notifications poussées.
  if (env.os === "android" && env.expoGo) return { ok: false, raison: "expo-go-android" };
  if (!env.projectId) return { ok: false, raison: "projet-absent" };
  return { ok: true, projectId: env.projectId };
}

export function messageSansPush(raison: RaisonSansPush): string {
  switch (raison) {
    case "web":
      return "Les notifications ne sont offertes que dans l'app sur téléphone.";
    case "expo-go-android":
      return "Expo Go sur Android ne reçoit pas les notifications poussées : installe la version de développement de Freecrew. Les rappels avant un plan fonctionnent quand même.";
    case "projet-absent":
      return "L'app n'est pas encore reliée à son projet Expo (extra.eas.projectId dans app.json) : les notifications poussées sont désactivées.";
    case "refusees":
      return "Les notifications sont bloquées pour Freecrew. Autorise-les dans les réglages du téléphone, puis réessaie.";
    case "erreur":
      return "Impossible d'activer les notifications pour l'instant. Réessaie plus tard.";
  }
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Écrans qu'une notification peut ouvrir (rien d'autre, quoi que dise la notification). */
export type RouteNotification = "/plans" | `/groupe/${string}`;

/** Écran à ouvrir quand on touche une notification, ou `null`. */
export function routeDeNotification(data: unknown): RouteNotification | null {
  const url = lire(data, "url");
  if (url === "/plans") return "/plans";
  if (typeof url === "string") {
    const m = /^\/groupe\/([^/?#]+)$/.exec(url);
    if (m && UUID.test(m[1])) return `/groupe/${m[1]}`;
  }
  return null;
}

/** Choix « Rappel avant un plan », en minutes (0 = aucun rappel). */
export const CHOIX_RAPPEL = [0, 15, 30, 60, 120] as const;
export type MinutesRappel = (typeof CHOIX_RAPPEL)[number];
export const RAPPEL_PAR_DEFAUT: MinutesRappel = 30;

export function lireRappel(valeur: unknown): MinutesRappel {
  const n = typeof valeur === "string" ? Number(valeur) : valeur;
  return CHOIX_RAPPEL.find((c) => c === n) ?? RAPPEL_PAR_DEFAUT;
}

/** « 15 min », « 1 h », « 2 h » ; « Aucun » pour 0. */
export function libelleRappel(minutes: MinutesRappel): string {
  if (minutes === 0) return "Aucun";
  return minutes < 60 ? `${minutes} min` : `${minutes / 60} h`;
}

/** Ce qu'il faut d'un plan pour son rappel (sous-ensemble de `PlanView`). */
export interface PlanPourRappel {
  id: string;
  title: string;
  startsAt: string;
  where: string;
  state: "upcoming" | "past" | "cancelled";
  isMine: boolean;
  myResponse: "yes" | "no" | null;
}

export interface Rappel {
  /** Identifiant de la notification programmée (un par plan et par heure de début). */
  id: string;
  /** Moment où le rappel s'affiche. */
  at: Date;
  title: string;
  body: string;
  data: { url: "/plans"; planId: string; kind: "rappel" };
}

/** Au plus 20 rappels programmés (iOS en garde 64 au total pour une app). */
export const MAX_RAPPELS = 20;
/** Rappels programmés seulement pour les 14 prochains jours (recalculés à chaque ouverture). */
const HORIZON_MS = 14 * 86_400_000;

/**
 * Rappels des plans où je vais (j'ai accepté, ou c'est ma proposition), pas encore commencés.
 * Pour une série, `startsAt` est déjà la prochaine fois (`PlanView`). Un rappel dont l'heure est
 * passée n'est pas programmé. Triés par heure, au plus `MAX_RAPPELS`.
 */
export function rappelsDesPlans(plans: readonly PlanPourRappel[], now: Date, minutes: MinutesRappel): Rappel[] {
  if (minutes === 0) return [];
  const avance = minutes * 60_000;
  const rappels: Rappel[] = [];
  for (const p of plans) {
    if (p.state !== "upcoming") continue;
    if (!p.isMine && p.myResponse !== "yes") continue;
    const debut = new Date(p.startsAt);
    if (Number.isNaN(debut.getTime())) continue;
    const at = new Date(debut.getTime() - avance);
    if (at.getTime() <= now.getTime() || debut.getTime() - now.getTime() > HORIZON_MS) continue;
    const heure = formatInTimeZone(debut, TIME_ZONE, "H 'h' mm").replace(/ 00$/, "");
    rappels.push({
      id: `rappel-${p.id}-${debut.getTime()}`,
      at,
      title: `${p.title}, dans ${libelleRappel(minutes)}`,
      body: p.where ? `À ${heure} · ${p.where}` : `À ${heure}`,
      data: { url: "/plans", planId: p.id, kind: "rappel" },
    });
  }
  return rappels.sort((a, b) => a.at.getTime() - b.at.getTime()).slice(0, MAX_RAPPELS);
}
