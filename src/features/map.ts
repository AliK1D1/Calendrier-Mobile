/**
 * Carte des lieux (iPhone, Apple Plans) : point de vue qui montre tous les points.
 * Fonctions pures, sans dépendre de la carte elle-même.
 */

export interface MapPoint {
  id: string;
  lat: number;
  lng: number;
  label: string;
  /** Point mis en évidence (ex. l'adresse qu'on vient de choisir). */
  highlighted?: boolean;
}

/** Point de vue par défaut : Montréal. */
export const DEFAULT_CENTER = { latitude: 45.5019, longitude: -73.5674 };
/** Zoom d'un seul point (une rue ou deux autour). */
export const SINGLE_ZOOM = 15;

/**
 * Centre et zoom qui montrent tous les points (zoom de type « tuiles » : chaque cran double
 * l'échelle). Aucun point : Montréal, vu de loin.
 */
export function cameraFor(points: readonly Pick<MapPoint, "lat" | "lng">[]): {
  coordinates: { latitude: number; longitude: number };
  zoom: number;
} {
  const valid = points.filter((p) => Number.isFinite(p.lat) && Number.isFinite(p.lng));
  if (valid.length === 0) return { coordinates: DEFAULT_CENTER, zoom: 10 };
  const lats = valid.map((p) => p.lat);
  const lngs = valid.map((p) => p.lng);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);
  const center = { latitude: (minLat + maxLat) / 2, longitude: (minLng + maxLng) / 2 };
  // Écart en degrés ; la longitude rétrécit vers les pôles.
  const span = Math.max(maxLat - minLat, (maxLng - minLng) * Math.cos((center.latitude * Math.PI) / 180));
  if (span < 0.002) return { coordinates: center, zoom: SINGLE_ZOOM };
  // Marge : on garde un peu d'espace autour des points.
  const zoom = Math.log2(360 / (span * 1.6)) - 1;
  return { coordinates: center, zoom: Math.max(3, Math.min(SINGLE_ZOOM, Math.round(zoom * 10) / 10)) };
}

/** Coordonnées touchées sur la carte → point validé (6 décimales, ~10 cm), ou `null`. */
export function pickedPoint(lat: number | undefined, lng: number | undefined): { lat: number; lng: number } | null {
  if (lat === undefined || lng === undefined || !Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (Math.abs(lat) > 90 || Math.abs(lng) > 180) return null;
  const round = (n: number) => Math.round(n * 1e6) / 1e6;
  return { lat: round(lat), lng: round(lng) };
}
