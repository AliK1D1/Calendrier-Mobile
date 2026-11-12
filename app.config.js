/**
 * Complète app.json au moment du build (le reste de la configuration est dans app.json).
 *
 * Android : les notifications poussées passent par Firebase (FCM), qui demande le fichier
 * google-services.json de la console Firebase. On le prend, dans l'ordre :
 *   1. de la variable d'environnement GOOGLE_SERVICES_JSON (variable « fichier » d'Expo/EAS) ;
 *   2. du fichier ./google-services.json, s'il existe.
 * Sans lui, l'app se construit quand même, mais Android ne reçoit pas de notifications poussées
 * (les rappels avant un plan, eux, fonctionnent).
 */
const { existsSync } = require("node:fs");

/**
 * @param {import("expo/config").ConfigContext} ctx
 * @returns {import("expo/config").ExpoConfig}
 */
module.exports = ({ config }) => {
  const googleServicesFile =
    process.env.GOOGLE_SERVICES_JSON ??
    (existsSync("./google-services.json") ? "./google-services.json" : undefined);
  return {
    ...config,
    name: config.name ?? "Freecrew",
    slug: config.slug ?? "freecrew",
    android: { ...config.android, ...(googleServicesFile ? { googleServicesFile } : {}) },
  };
};
