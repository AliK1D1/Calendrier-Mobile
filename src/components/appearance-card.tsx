import { Platform } from "react-native";

import { Card, Chip, Label, Muted, Row } from "@/components/ui";
import { ACCENT_APPAREIL, couleurPastille } from "@/features/apparence";
import { ACCENTS, THEME_LIBELLES, THEMES } from "@/lib/ux/apparence";
import { choisirAccent, choisirTheme, useApparence } from "@/services/apparence";
import { useScheme } from "@/theme/use-palette";

/**
 * Profil > Apparence : thème (selon l'appareil, clair, sombre) et couleur d'accent, les mêmes
 * que sur le site. S'applique tout de suite et reste gardé sur ce téléphone (comme le site le
 * garde dans le navigateur) : pas de bouton Enregistrer.
 */
export function AppearanceCard() {
  const { theme, accent } = useApparence();
  const scheme = useScheme();
  return (
    <Card>
      <Label>Thème</Label>
      <Row>
        {THEMES.map((t) => (
          <Chip key={t} label={THEME_LIBELLES[t]} selected={theme === t} onPress={() => choisirTheme(t)} />
        ))}
      </Row>
      <Label>Couleur d&apos;accent</Label>
      <Row>
        {Platform.OS === "android" ? (
          <Chip
            label="Couleurs du téléphone"
            selected={accent === ACCENT_APPAREIL}
            onPress={() => choisirAccent(ACCENT_APPAREIL)}
          />
        ) : null}
        {ACCENTS.map((a) => (
          <Chip
            key={a.id}
            label={a.libelle}
            swatch={couleurPastille(a.id, scheme)}
            selected={accent === a.id}
            onPress={() => choisirAccent(a.id)}
          />
        ))}
      </Row>
      <Muted>
        {Platform.OS === "android"
          ? "« Couleurs du téléphone » reprend les couleurs de ton fond d'écran (Material You). Gardé sur ce téléphone seulement."
          : "Gardé sur ce téléphone seulement : le site garde son propre choix."}
      </Muted>
    </Card>
  );
}
