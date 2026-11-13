/**
 * Carte des lieux sur iPhone : Apple Plans (aucune clé requise). Un repère par lieu ; le lieu
 * mis en évidence a la couleur d'accent. Avec `onPick`, toucher la carte déplace ce point.
 * Android et le web : voir `place-map.tsx` (pas de carte pour l'instant).
 */
import { AppleMaps } from "expo-maps";
import { StyleSheet, View } from "react-native";

import { cameraFor, type MapPoint, pickedPoint } from "@/features/map";
import { hapticSelect } from "@/services/haptics";
import { shape } from "@/theme/tokens";
import { usePalette, useScheme } from "@/theme/use-palette";

export function PlaceMap({
  points,
  onPick,
  height = 220,
}: {
  points: MapPoint[];
  onPick?: (lat: number, lng: number) => void;
  height?: number;
}) {
  const c = usePalette();
  const scheme = useScheme();
  const camera = cameraFor(points);
  // La carte se recentre quand l'ensemble des points change (clé), pas à chaque rendu.
  const key = points.map((p) => `${p.id}:${p.lat.toFixed(4)},${p.lng.toFixed(4)}`).join("|");
  return (
    <View
      accessible
      accessibilityLabel={`Carte : ${points.map((p) => p.label).join(", ") || "aucun lieu"}`}
      style={[styles.box, { height, backgroundColor: c.card }]}
    >
      <AppleMaps.View
        key={key}
        style={StyleSheet.absoluteFill}
        cameraPosition={camera}
        colorScheme={scheme === "dark" ? AppleMaps.MapColorScheme.DARK : AppleMaps.MapColorScheme.LIGHT}
        uiSettings={{ compassEnabled: false, myLocationButtonEnabled: false, scaleBarEnabled: false, togglePitchEnabled: false }}
        markers={points.map((p) => ({
          id: p.id,
          title: p.label,
          coordinates: { latitude: p.lat, longitude: p.lng },
          systemImage: p.highlighted ? "star.fill" : "mappin",
          tintColor: String(p.highlighted ? c.primary : c.muted),
        }))}
        onMapClick={
          onPick
            ? (e) => {
                const at = pickedPoint(e.coordinates.latitude, e.coordinates.longitude);
                if (!at) return;
                hapticSelect();
                onPick(at.lat, at.lng);
              }
            : undefined
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  box: { borderRadius: shape.card, overflow: "hidden" },
});
