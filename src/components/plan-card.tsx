import { useState } from "react";
import { Alert, View } from "react-native";

import { Badge, Body, Button, Card, ErrorText, Muted, Row } from "@/components/ui";
import { cancelPlan, respondToPlan } from "@/features/actions";
import { isAwaitingMe, type PlanView } from "@/lib/plans/view";
import { t } from "@/services/i18n";
import { useAuthed } from "@/services/session";
import { space } from "@/theme/colors";

const tp = t.plans;

/** Un plan : quand, où, qui y va, et mes boutons de réponse. */
export function PlanCard({ plan, onChanged }: { plan: PlanView; onChanged: () => void }) {
  const { supabase } = useAuthed();
  const [busy, setBusy] = useState<"yes" | "no" | "cancel" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const awaiting = isAwaitingMe(plan);

  async function run(kind: "yes" | "no" | "cancel") {
    setBusy(kind);
    setError(null);
    const r =
      kind === "cancel"
        ? await cancelPlan(supabase, plan.id)
        : await respondToPlan(supabase, plan.id, kind === "yes");
    setBusy(null);
    if (!r.ok) setError(r.error);
    else onChanged();
  }

  const series = plan.repeatLabel !== null;

  function confirmCancel() {
    Alert.alert(
      series ? tp.stopSeries : tp.cancelPlan,
      series ? tp.confirmStopSeries(plan.title) : tp.confirmCancel(plan.title),
      [
        { text: "Garder", style: "cancel" },
        {
          text: series ? tp.stopSeries : tp.cancelPlan,
          style: "destructive",
          onPress: () => void run("cancel"),
        },
      ],
    );
  }

  const status = plan.state === "cancelled"
    ? tp.status.cancelled
    : plan.state === "past"
      ? tp.status.past
      : plan.isMine
        ? tp.status.mine
        : awaiting
          ? tp.status.yourTurn
          : plan.myResponse === "yes"
            ? tp.status.accepted
            : plan.myResponse === "no"
              ? tp.status.declined
              : tp.status.info;

  return (
    <Card>
      <Row>
        <Badge>{plan.groupName}</Badge>
        <Badge>{status}</Badge>
        {plan.review ? <Badge>{tp.reviewBadge}</Badge> : null}
      </Row>
      <Body bold>{plan.title}</Body>
      <Body>{`${plan.dayLabel} · ${plan.timeLabel}`}</Body>
      {plan.repeatLabel ? <Muted>{plan.repeatLabel}</Muted> : null}
      <Muted>{plan.where}</Muted>
      <Muted>
        {plan.going.length > 0
          ? `${tp.yes} ${plan.going.map((g) => g.name).join(", ")}`
          : `${tp.proposedBy} ${plan.isMine ? tp.you : plan.creatorName}`}
      </Muted>
      {plan.waiting.length > 0 ? <Muted>{`${tp.notYet} ${plan.waiting.join(", ")}`}</Muted> : null}
      {plan.review?.mine ? <Muted>{plan.review.mine}</Muted> : null}
      {plan.review?.others ? <Muted>{plan.review.others}</Muted> : null}
      <ErrorText>{error}</ErrorText>
      {plan.state === "upcoming" ? (
        <View style={{ gap: space.sm, marginTop: space.xs }}>
          {plan.invited && !plan.isMine ? (
            <Row>
              <View style={{ flex: 1 }}>
                <Button
                  label={`${series ? tp.acceptSeries : tp.accept}${plan.myResponse === "yes" ? " ✓" : ""}`}
                  variant={plan.myResponse === "yes" ? "secondary" : "primary"}
                  busy={busy === "yes"}
                  disabled={busy !== null || plan.myResponse === "yes"}
                  onPress={() => void run("yes")}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Button
                  label={`${series && plan.myResponse === "yes" ? tp.leaveSeries : tp.decline}${plan.myResponse === "no" ? " ✓" : ""}`}
                  variant="secondary"
                  busy={busy === "no"}
                  disabled={busy !== null || plan.myResponse === "no"}
                  onPress={() => void run("no")}
                />
              </View>
            </Row>
          ) : null}
          {plan.isMine ? (
            <Button label={series ? tp.stopSeries : tp.cancelPlan} variant="secondary" busy={busy === "cancel"} disabled={busy !== null} onPress={confirmCancel} />
          ) : null}
        </View>
      ) : null}
    </Card>
  );
}
