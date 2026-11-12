/**
 * Retour tactile : une petite vibration quand on choisit quelque chose ou qu'une action
 * réussit. iPhone : moteur haptique d'Apple ; Android : vibration courte du système. Rien dans
 * un navigateur. Ne plante jamais l'app (appareil sans vibreur, réglage coupé).
 */
import * as Haptics from "expo-haptics";
import { Platform } from "react-native";

const on = Platform.OS === "ios" || Platform.OS === "android";

function run(effect: () => Promise<void>) {
  if (!on) return;
  try {
    effect().catch(() => {});
  } catch {
    // Module natif absent (ancienne version de l'app) : pas de vibration.
  }
}

/** Un choix change (pastille, segment, jour de la semaine, interrupteur). */
export function hapticSelect() {
  run(() => Haptics.selectionAsync());
}

/** Un bouton d'action est touché. */
export function hapticTap() {
  run(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light));
}

/** Une action a réussi (plan accepté, bloc enregistré). */
export function hapticSuccess() {
  run(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success));
}

/** Une action a échoué. */
export function hapticError() {
  run(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error));
}
