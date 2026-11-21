import { useState } from "react";
import { View } from "react-native";

import { ListGroup, ListRow } from "@/components/list";
import { Toggle } from "@/components/toggle";
import { Card, Chip, ErrorText, Label, Muted, Row } from "@/components/ui";
import { CHOIX_RAPPEL, libelleRappel, type MinutesRappel } from "@/features/notifications";
import { loadPlans } from "@/lib/plans/queries";
import { locale } from "@/services/i18n";
import { choisirPush, choisirRappel, limitePush, programmerRappels, useReglagesNotif } from "@/services/notifications";
import { useAuthed } from "@/services/session";
import { space } from "@/theme/colors";
import { usePalette } from "@/theme/use-palette";

/**
 * Profil > Notifications, pour ce téléphone seulement :
 * - « Notifications des plans » (poussées par la base de données) : quelqu'un me propose un
 *   plan, répond au mien, ou annule un plan où je vais ;
 * - « Rappel avant un plan » : notification programmée sur le téléphone avant chaque plan où
 *   je vais (aucun réseau ni compte Expo nécessaire).
 */
export function NotificationsCard() {
  const { supabase, userId } = useAuthed();
  const c = usePalette();
  const { push, rappel } = useReglagesNotif();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const limite = limitePush();

  async function changerPush(active: boolean) {
    setBusy(true);
    setError(null);
    const r = await choisirPush(supabase, active);
    setBusy(false);
    if (!r.ok) setError(r.error);
  }

  async function changerRappel(minutes: MinutesRappel) {
    setError(null);
    const r = await choisirRappel(minutes);
    if (!r.ok) {
      setError(r.error);
      return;
    }
    // Reprogramme tout de suite avec le nouveau délai.
    const plans = await loadPlans(supabase, userId, new Date(), { locale });
    if (plans.ok) await programmerRappels(plans.views);
  }

  return (
    <View style={{ gap: space.md }}>
      <ListGroup
        header="Notifications"
        footer={limite ?? "Quand on te propose un plan, quand on répond au tien ou qu'un plan est annulé. Seulement sur ce téléphone."}
      >
        <ListRow
          icon="bell"
          iconColor={c.danger}
          title="Notifications des plans"
          subtitle={busy ? "Un instant…" : undefined}
          trailing={
            <Toggle
              value={push}
              onValueChange={(v) => {
                if (!busy) void changerPush(v);
              }}
              accessibilityLabel="Notifications des plans"
            />
          }
        />
      </ListGroup>
      <Card>
        <Label>Rappel avant un plan</Label>
        <Row>
          {CHOIX_RAPPEL.map((m) => (
            <Chip key={m} label={libelleRappel(m)} selected={rappel === m} onPress={() => void changerRappel(m)} />
          ))}
        </Row>
        <Muted>Pour les plans où tu vas (acceptés ou proposés par toi), dans les 14 prochains jours.</Muted>
      </Card>
      <ErrorText>{error}</ErrorText>
    </View>
  );
}
