import { useState } from "react";
import { Alert, View } from "react-native";

import { AvatarStack } from "@/components/avatar";
import { DateTile } from "@/components/date-tile";
import { Appear } from "@/components/motion";
import { Badge, Body, Button, Card, Divider, ErrorText, Fill, Meta, Muted, Row, type Tone } from "@/components/ui";
import { dayOfInstant, namesSummary } from "@/features/display";
import { cancelPlan, respondToPlan } from "@/features/actions";
import { isAwaitingMe, type PlanView } from "@/lib/plans/view";
import { t } from "@/services/i18n";
import { useAuthed } from "@/services/session";
import { space } from "@/theme/colors";
import { usePalette } from "@/theme/use-palette";

const tp = t.plans;

/**
 * Un plan : la date en étiquette, quoi, quand, où, qui y va, et mes boutons de réponse.
 */
export function PlanCard({ plan, onChanged, index = 0 }: { plan: PlanView; onChanged: () => void; index?: number }) {
  const { supabase } = useAuthed();
  const c = usePalette();
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
  const tone: Tone = plan.state === "cancelled"
    ? "danger"
    : plan.state === "past"
      ? "neutral"
      : plan.isMine
        ? "primary"
        : awaiting
          ? "warning"
          : plan.myResponse === "yes"
            ? "success"
            : "neutral";
  const done = plan.state !== "upcoming";
  const goingNames = plan.going.map((g) => g.name);
  const canAnswer = plan.state === "upcoming" && plan.invited && !plan.isMine;

  return (
    <Appear index={index}>
    <Card>
      <Row nowrap align="flex-start" gap={space.md}>
        <DateTile day={dayOfInstant(plan.startsAt)} dimmed={done} />
        <Fill>
          <View style={{ gap: 3 }}>
            <Body bold color={done ? c.muted : undefined}>{plan.title}</Body>
            {/* Le jour est dans l'étiquette de date ; les lecteurs d'écran l'entendent ici. */}
            <Meta icon="clock" accessibilityLabel={`${plan.dayLabel}, ${plan.timeLabel}`}>{plan.timeLabel}</Meta>
            <Meta icon="pin">{plan.where}</Meta>
            {plan.repeatLabel ? <Meta icon="repeat">{plan.repeatLabel}</Meta> : null}
          </View>
        </Fill>
      </Row>
      <Row>
        <Badge tone={tone}>{status}</Badge>
        <Badge icon="group">{plan.groupName}</Badge>
        {plan.review ? <Badge tone="warning" icon="alert">{tp.reviewBadge}</Badge> : null}
      </Row>
      {plan.review?.mine ? <Meta icon="alert" color={c.warning}>{plan.review.mine}</Meta> : null}
      {plan.review?.others ? <Meta icon="alert" color={c.warning}>{plan.review.others}</Meta> : null}
      {goingNames.length > 0 ? (
        <Row nowrap gap={space.sm}>
          <AvatarStack names={goingNames} size={24} />
          <Fill>
            <Muted>{`${tp.yes} ${namesSummary(goingNames, 3)}`}</Muted>
          </Fill>
        </Row>
      ) : (
        <Muted>{`${tp.proposedBy} ${plan.isMine ? tp.you : plan.creatorName}`}</Muted>
      )}
      {plan.waiting.length > 0 ? <Muted>{`${tp.notYet} ${namesSummary(plan.waiting, 3)}`}</Muted> : null}
      <ErrorText>{error}</ErrorText>
      {canAnswer ? (
        <>
          <Divider />
          <Row nowrap>
            <Fill>
              <Button
                size="small"
                icon={plan.myResponse === "yes" ? "check" : undefined}
                label={series ? tp.acceptSeries : tp.accept}
                variant={plan.myResponse === "yes" ? "secondary" : "primary"}
                busy={busy === "yes"}
                disabled={busy !== null || plan.myResponse === "yes"}
                onPress={() => void run("yes")}
              />
            </Fill>
            <Fill>
              <Button
                size="small"
                icon={plan.myResponse === "no" ? "check" : undefined}
                label={series && plan.myResponse === "yes" ? tp.leaveSeries : tp.decline}
                variant="secondary"
                busy={busy === "no"}
                disabled={busy !== null || plan.myResponse === "no"}
                onPress={() => void run("no")}
              />
            </Fill>
          </Row>
        </>
      ) : null}
      {plan.state === "upcoming" && plan.isMine ? (
        <>
          <Divider />
          <Button
            size="small"
            variant="danger"
            label={series ? tp.stopSeries : tp.cancelPlan}
            busy={busy === "cancel"}
            disabled={busy !== null}
            onPress={confirmCancel}
          />
        </>
      ) : null}
    </Card>
    </Appear>
  );
}
