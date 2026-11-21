/**
 * Notifications sur le téléphone (expo-notifications). La logique est dans
 * src/features/notifications.ts ; ici, seulement les appels natifs et les réglages gardés sur
 * ce téléphone (localStorage d'expo-sqlite, comme l'apparence) :
 * - « Notifications des plans » (poussées) : activé ou non, et le jeton inscrit ;
 * - « Rappel avant un plan » : 0, 15, 30, 60 ou 120 minutes.
 *
 * Les notifications poussées partent de la base de données (migration 0023 du site) ; le
 * téléphone s'y inscrit avec `register_push_token` et se retire en supprimant sa ligne de
 * `push_tokens` (ma session, RLS).
 */
import "expo-sqlite/localStorage/install";

import type { SupabaseClient } from "@supabase/supabase-js";
import Constants, { ExecutionEnvironment } from "expo-constants";
import * as Notifications from "expo-notifications";
import { AndroidImportance } from "expo-notifications";
import { useSyncExternalStore } from "react";
import { Platform } from "react-native";

import {
  CANAL_PLANS,
  CANAL_RAPPELS,
  estJetonExpo,
  idProjetExpo,
  lireRappel,
  messageSansPush,
  type MinutesRappel,
  type PlanPourRappel,
  plateformePush,
  pushPossible,
  rappelsDesPlans,
} from "@/features/notifications";

const CLE_PUSH = "fc-notif-push";
const CLE_JETON = "fc-notif-jeton";
const CLE_RAPPEL = "fc-notif-rappel";

const natif = Platform.OS === "ios" || Platform.OS === "android";

function lire(cle: string): string | null {
  try {
    return typeof localStorage === "undefined" ? null : localStorage.getItem(cle);
  } catch {
    return null;
  }
}

function ecrire(cle: string, valeur: string | null) {
  try {
    if (valeur === null) localStorage.removeItem(cle);
    else localStorage.setItem(cle, valeur);
  } catch {
    // Stockage indisponible : le réglage vaut jusqu'à la fermeture de l'app.
  }
}

export interface ReglagesNotif {
  push: boolean;
  rappel: MinutesRappel;
}

let actuel: ReglagesNotif = { push: lire(CLE_PUSH) === "1", rappel: lireRappel(lire(CLE_RAPPEL)) };
const abonnes = new Set<() => void>();

function changer(patch: Partial<ReglagesNotif>) {
  actuel = { ...actuel, ...patch };
  if (patch.push !== undefined) ecrire(CLE_PUSH, patch.push ? "1" : "0");
  if (patch.rappel !== undefined) ecrire(CLE_RAPPEL, String(patch.rappel));
  for (const rappel of abonnes) rappel();
}

function abonner(rappel: () => void) {
  abonnes.add(rappel);
  return () => {
    abonnes.delete(rappel);
  };
}

const lecture = () => actuel;

/** Réglages de notification de ce téléphone ; l'écran se redessine quand ils changent. */
export function useReglagesNotif(): ReglagesNotif {
  return useSyncExternalStore(abonner, lecture, lecture);
}

// Notification reçue pendant que l'app est ouverte : bannière et liste, sans son.
if (natif) {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
    }),
  });
}

/** Canaux Android (à créer avant de demander la permission ou le jeton, Android 13+). */
async function creerCanaux() {
  if (Platform.OS !== "android") return;
  await Notifications.setNotificationChannelAsync(CANAL_PLANS, {
    name: "Plans (propositions, réponses, annulations)",
    importance: AndroidImportance.HIGH,
  });
  await Notifications.setNotificationChannelAsync(CANAL_RAPPELS, {
    name: "Rappels avant un plan",
    importance: AndroidImportance.HIGH,
  });
}

/** Demande la permission si besoin ; vrai si les notifications sont permises. */
async function permission(demander: boolean): Promise<boolean> {
  if (!natif) return false;
  await creerCanaux();
  const actuelle = await Notifications.getPermissionsAsync();
  if (actuelle.granted || !demander) return actuelle.granted;
  if (!actuelle.canAskAgain) return false;
  return (await Notifications.requestPermissionsAsync()).granted;
}

function environnement() {
  return {
    os: Platform.OS,
    expoGo: Constants.executionEnvironment === ExecutionEnvironment.StoreClient,
    projectId: idProjetExpo(Constants.expoConfig, Constants.easConfig),
  };
}

/** Message à afficher si les notifications poussées sont impossibles ici, sinon `null`. */
export function limitePush(): string | null {
  const p = pushPossible(environnement());
  return p.ok ? null : messageSansPush(p.raison);
}

type Resultat = { ok: true } | { ok: false; error: string };

/** Lit le jeton Expo de ce téléphone et l'inscrit pour mon compte. */
async function inscrire(supabase: SupabaseClient, demander: boolean): Promise<Resultat> {
  const possible = pushPossible(environnement());
  if (!possible.ok) return { ok: false, error: messageSansPush(possible.raison) };
  if (!(await permission(demander))) return { ok: false, error: messageSansPush("refusees") };
  const plateforme = plateformePush(Platform.OS);
  try {
    const { data: jeton } = await Notifications.getExpoPushTokenAsync({ projectId: possible.projectId });
    if (!estJetonExpo(jeton) || !plateforme) return { ok: false, error: messageSansPush("erreur") };
    const { error } = await supabase.rpc("register_push_token", { p_token: jeton, p_platform: plateforme });
    if (error) {
      console.error("Notifications :", error.code, error.message);
      // Fonction absente : la migration 0023 n'est pas appliquée.
      return {
        ok: false,
        error:
          error.code === "PGRST202" || error.code === "42883"
            ? "La base de données n'est pas à jour : applique supabase/migration-0023.sql (dépôt du site)."
            : messageSansPush("erreur"),
      };
    }
    ecrire(CLE_JETON, jeton);
    return { ok: true };
  } catch (e) {
    console.error("Notifications :", e);
    return { ok: false, error: messageSansPush("erreur") };
  }
}

/** Retire ce téléphone de mon compte (rien ne se passe s'il n'était pas inscrit). */
async function desinscrire(supabase: SupabaseClient): Promise<void> {
  const jeton = lire(CLE_JETON);
  if (!jeton) return;
  const { error } = await supabase.from("push_tokens").delete().eq("token", jeton);
  if (error) console.error("Notifications :", error.code, error.message);
  else ecrire(CLE_JETON, null);
}

/** Interrupteur « Notifications des plans ». */
export async function choisirPush(supabase: SupabaseClient, active: boolean): Promise<Resultat> {
  if (!active) {
    changer({ push: false });
    await desinscrire(supabase);
    return { ok: true };
  }
  const r = await inscrire(supabase, true);
  changer({ push: r.ok });
  return r;
}

/**
 * Au démarrage et à la connexion : réinscrit le jeton (il peut changer, ou le téléphone a pu
 * servir à un autre compte). Ne demande jamais la permission.
 */
export async function rafraichirPush(supabase: SupabaseClient): Promise<void> {
  if (!actuel.push || !natif) return;
  await inscrire(supabase, false);
}

/** Avant de se déconnecter : ce téléphone ne reçoit plus les notifications de ce compte. */
export async function oublierCeTelephone(supabase: SupabaseClient): Promise<void> {
  if (!natif) return;
  try {
    await desinscrire(supabase);
    await annulerRappels();
  } catch (e) {
    console.error("Notifications :", e);
  }
}

/** Choix « Rappel avant un plan » ; demande la permission s'il en faut une. */
export async function choisirRappel(minutes: MinutesRappel): Promise<Resultat> {
  if (minutes !== 0 && natif && !(await permission(true))) {
    return { ok: false, error: messageSansPush("refusees") };
  }
  changer({ rappel: minutes });
  if (minutes === 0) await annulerRappels();
  return { ok: true };
}

async function annulerRappels() {
  if (!natif) return;
  const prevues = await Notifications.getAllScheduledNotificationsAsync();
  await Promise.all(
    prevues
      .filter((n) => n.identifier.startsWith("rappel-"))
      .map((n) => Notifications.cancelScheduledNotificationAsync(n.identifier)),
  );
}

/**
 * Reprogramme les rappels à partir de mes plans (appelé à chaque chargement des plans). Les
 * anciens sont retirés : un plan annulé ou déplacé ne sonne plus.
 */
export async function programmerRappels(plans: readonly PlanPourRappel[], now = new Date()): Promise<void> {
  if (!natif) return;
  try {
    if (!(await permission(false))) return;
    const rappels = rappelsDesPlans(plans, now, actuel.rappel);
    await annulerRappels();
    for (const r of rappels) {
      await Notifications.scheduleNotificationAsync({
        identifier: r.id,
        content: { title: r.title, body: r.body, data: r.data },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: r.at, channelId: CANAL_RAPPELS },
      });
    }
  } catch (e) {
    console.error("Rappels :", e);
  }
}
