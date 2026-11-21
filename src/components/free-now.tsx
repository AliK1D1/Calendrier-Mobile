/**
 * « Je suis libre maintenant » : qui, dans mes groupes (ou dans ce groupe), peut me voir
 * d'ici 2 heures, trajets compris (en personne, sinon un appel). Même calcul que le site
 * (`searchFreeNow`), lu avec ma session (RLS). Temps de trajet estimés sur le téléphone.
 */
import { useState } from "react";
import { View } from "react-native";

import { Avatar } from "@/components/avatar";
import { Appear } from "@/components/motion";
import { Badge, Body, Button, Card, ErrorText, Fill, Footnote, Muted, Row } from "@/components/ui";
import { type FreeNowMatchView, type FreeNowView, searchFreeNow } from "@/lib/meetups/freeNow";
import { supabaseFreeNowStore } from "@/lib/meetups/supabaseStore";
import { EstimatedTravelProvider } from "@/lib/scheduling/travel";
import { hapticSuccess } from "@/services/haptics";
import { locale, t } from "@/services/i18n";
import { useAuthed } from "@/services/session";
import { space } from "@/theme/colors";

const tf = t.meetups.freeNow;
const travel = new EstimatedTravelProvider();

export function FreeNow({ groupId, onPropose }: { groupId?: string; onPropose?: (m: FreeNowMatchView) => void }) {
  const { supabase, userId } = useAuthed();
  const [view, setView] = useState<FreeNowView | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function run() {
    setBusy(true);
    setError(null);
    try {
      const r = await searchFreeNow(supabaseFreeNowStore(supabase), { groupId: groupId ?? null }, {
        userId,
        now: new Date(),
        travel,
        locale,
      });
      if (!r.ok) {
        setView(null);
        setError(r.error);
      } else {
        setView(r.value);
        if (r.value.matches.length > 0) hapticSuccess();
      }
    } catch (e) {
      console.error("Libre maintenant :", e);
      setError("Le calcul n'a pas fonctionné. Réessaie.");
    } finally {
      setBusy(false);
    }
  }

  const notes: string[] = [];
  if (view && view.incomplete.length > 0) notes.push(tf.noHome(view.incomplete.join(", ")));
  if (view?.truncated) notes.push(tf.truncated);

  return (
    <Card>
      <View style={{ gap: 2 }}>
        <Body bold>{tf.title}</Body>
        <Muted>{groupId ? tf.inGroup : tf.inGroups}</Muted>
      </View>
      <Button
        icon="bolt"
        label={busy ? tf.searching : view ? "Chercher de nouveau" : tf.whoIsFree}
        variant={view ? "secondary" : "primary"}
        busy={busy}
        disabled={busy}
        onPress={() => void run()}
      />
      <ErrorText>{error}</ErrorText>
      {view ? (
        <View accessibilityLiveRegion="polite" style={{ gap: space.md }}>
          {view.matches.length === 0 ? (
            <Muted>{view.checked === 0 ? tf.nobodyToCheck : tf.nobodyFree(view.windowLabel)}</Muted>
          ) : (
            <>
              <Muted>{tf.count(view.matches.length, view.checked, view.windowLabel)}</Muted>
              {view.matches.map((m, i) => (
                <Appear key={m.personId} index={i}>
                  <Row nowrap align="flex-start" gap={space.md}>
                    <Avatar name={m.name} size={36} />
                    <Fill>
                      <View style={{ gap: 3 }}>
                        <Row gap={space.sm}>
                          <Body bold>{m.name}</Body>
                          <Badge icon={m.kind === "call" ? "call" : "pin"}>{m.kind === "call" ? tf.call : tf.inPerson}</Badge>
                        </Row>
                        <Body>{m.timeLabel}</Body>
                        <Footnote>
                          {`${m.kind === "call" ? tf.tooFar : tf.travel(m.placeName ?? t.meetups.place, m.myTravel, m.theirTravel)}${m.groups.length > 0 ? ` · ${m.groups.join(", ")}` : ""}`}
                        </Footnote>
                        {onPropose ? (
                          <View style={{ alignSelf: "flex-start", marginTop: space.xs }}>
                            <Button size="small" variant="secondary" label={t.meetups.propose} onPress={() => onPropose(m)} />
                          </View>
                        ) : null}
                      </View>
                    </Fill>
                  </Row>
                </Appear>
              ))}
            </>
          )}
          {notes.map((n) => (
            <Footnote key={n}>{n}</Footnote>
          ))}
        </View>
      ) : null}
    </Card>
  );
}
