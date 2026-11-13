/**
 * Carte des lieux : seulement sur iPhone pour l'instant (`place-map.ios.tsx`, Apple Plans).
 * Android (qui demanderait une clé Google Maps) et le web : rien, l'écran reste comme avant.
 */
import type { MapPoint } from "@/features/map";

export function PlaceMap(_props: { points: MapPoint[]; onPick?: (lat: number, lng: number) => void; height?: number; frameKey?: string }) {
  return null;
}
