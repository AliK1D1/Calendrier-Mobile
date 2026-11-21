/**
 * « La file d'attente » (œuf de Pâques, voir `src/features/fileAttente.ts`) : une fausse salle
 * d'attente par-dessus l'app, ouverte en écrivant « omnivox » comme nom dans Profil. La
 * position défile toute seule jusqu'à la chute, puis la fenêtre se ferme. On peut en sortir
 * avant : bouton « Sortir de la file », toucher à côté, ou le bouton Retour d'Android.
 *
 * Chaque étape est annoncée au lecteur d'écran et marquée d'une vibration.
 */
import { useEffect, useRef, useState } from "react";
import { AccessibilityInfo, Modal, Pressable, StyleSheet, Text, View } from "react-native";

import { Button } from "@/components/ui";
import { formatPosition, QUEUE_MS, queueAt } from "@/features/fileAttente";
import { hapticError, hapticSelect, hapticSuccess } from "@/services/haptics";
import { space } from "@/theme/colors";
import { shape, strong, type } from "@/theme/tokens";
import { usePalette } from "@/theme/use-palette";

/** Temps entre deux mises à jour de la position (ms). */
const TICK_MS = 50;

export function QueueGag({ onClose }: { onClose: () => void }) {
  const c = usePalette();
  const [elapsed, setElapsed] = useState(0);
  const frame = queueAt(elapsed);
  const lastStep = useRef(-1);

  useEffect(() => {
    const start = Date.now();
    const id = setInterval(() => {
      const t = Date.now() - start;
      setElapsed(t);
      if (t >= QUEUE_MS) clearInterval(id);
    }, TICK_MS);
    return () => clearInterval(id);
  }, []);

  // Nouvelle étape : on l'annonce, avec une vibration qui va avec la nouvelle (bonne ou mauvaise).
  useEffect(() => {
    if (lastStep.current === frame.step) return;
    lastStep.current = frame.step;
    AccessibilityInfo.announceForAccessibility(frame.text);
    if (frame.tone === "bad") hapticError();
    else if (frame.tone === "good") hapticSuccess();
    else hapticSelect();
  }, [frame.step, frame.text, frame.tone]);

  useEffect(() => {
    if (frame.done) onClose();
  }, [frame.done, onClose]);

  const tint = frame.tone === "bad" ? c.danger : frame.tone === "good" ? c.success : c.primary;
  // Hors de la file : rien à afficher (session expirée), ou zéro personne devant (la chute).
  const shown = frame.position !== null ? formatPosition(frame.position) : frame.tone === "good" ? "0" : "—";

  return (
    <Modal visible transparent animationType="fade" statusBarTranslucent navigationBarTranslucent onRequestClose={onClose}>
      <Pressable accessibilityLabel="Sortir de la file" onPress={onClose} style={styles.backdrop}>
        {/* Toucher la carte ne ferme rien : seul le fond (ou le bouton) fait sortir. */}
        <Pressable accessibilityViewIsModal onPress={() => {}} style={[styles.card, { backgroundColor: c.card }]}>
          <Text style={[type.caption, strong, styles.caption, { color: c.muted }]}>FILE D&apos;ATTENTE</Text>
          <Text accessibilityRole="header" style={[type.headline, { color: c.text, textAlign: "center" }]}>
            Tu as dit « Omnivox » ? Prends un numéro.
          </Text>

          <View accessible accessibilityLabel={`Ta position : ${shown}`} style={styles.position}>
            <Text allowFontScaling={false} style={[styles.number, { color: tint }]}>
              {shown}
            </Text>
            <Text style={[type.footnote, { color: c.muted }]}>Ta position</Text>
          </View>

          <View style={[styles.track, { backgroundColor: c.border }]}>
            <View style={[styles.fill, { backgroundColor: tint, width: `${Math.round(frame.progress * 100)}%` }]} />
          </View>

          <Text style={[type.subhead, styles.message, { color: c.text }]}>{frame.text}</Text>

          <Button label="Sortir de la file" variant="plain" size="small" onPress={onClose} />
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: space.xl,
    backgroundColor: "rgba(0, 0, 0, 0.55)",
  },
  card: {
    width: "100%",
    maxWidth: 360,
    alignItems: "center",
    gap: space.md,
    padding: space.xl,
    borderRadius: shape.card,
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  caption: { letterSpacing: 1.5 },
  position: { alignItems: "center" },
  number: { fontSize: 56, lineHeight: 64, fontWeight: "800", fontVariant: ["tabular-nums"] },
  track: { alignSelf: "stretch", height: 8, borderRadius: 4, overflow: "hidden" },
  fill: { height: 8, borderRadius: 4 },
  // Deux lignes réservées : la carte ne change pas de hauteur quand le texte change.
  message: { textAlign: "center", minHeight: 40 },
});
