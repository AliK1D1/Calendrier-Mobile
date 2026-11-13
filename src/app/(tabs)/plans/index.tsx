import { router } from "expo-router";
import { useState } from "react";
import { View } from "react-native";

import { PlanCard } from "@/components/plan-card";
import { Button, EmptyState, ErrorText, Heading, Loading, Muted, Screen, Section } from "@/components/ui";
import { Tip } from "@/components/tip";
import { loadPlans } from "@/lib/plans/queries";
import { groupPlans, type PlanView } from "@/lib/plans/view";
import { locale, t } from "@/services/i18n";
import { programmerRappels } from "@/services/notifications";
import { useAuthed } from "@/services/session";
import { useLoad } from "@/services/use-load";

const tp = t.plans;

/** Plans passés montrés quand on ouvre la section. */
const MAX_PAST = 20;

/** Mes plans, dans les mêmes sections que la page /plans du site. Les passés sont repliés. */
export default function Plans() {
  const { supabase, userId } = useAuthed();
  const [showPast, setShowPast] = useState(false);
  const { data, error, refreshing, refresh, reload } = useLoad(async () => {
    const r = await loadPlans(supabase, userId, new Date(), { locale });
    if (!r.ok) throw new Error(r.error);
    void programmerRappels(r.views);
    return groupPlans(r.views);
  }, userId, "plans");

  const section = (title: string, hint: string | null, list: PlanView[], count = false) =>
    list.length === 0 ? null : (
      <Section>
        <View style={{ gap: 2 }}>
          <Heading count={count ? list.length : undefined}>{title}</Heading>
          {hint ? <Muted>{hint}</Muted> : null}
        </View>
        {list.map((p, i) => <PlanCard key={p.id} index={i} plan={p} onChanged={() => void reload()} />)}
      </Section>
    );

  const empty =
    data &&
    data.awaiting.length + data.upcoming.length + data.others.length + data.past.length === 0;

  return (
    <Screen title={tp.title} refreshing={refreshing} onRefresh={refresh}>
      <ErrorText>{error}</ErrorText>
      {!data && !error ? <Loading /> : null}
      {empty ? (
        <EmptyState
          icon="calendar"
          title="Aucun plan pour l'instant"
          text={`Dans un groupe, cherche « ${t.meetups.title} » puis propose un moment.`}
          action={{ label: t.home.myGroups, icon: "group", onPress: () => router.push("/groupes") }}
        />
      ) : null}
      {data ? (
        <>
          <Tip id="swipePlan" when={data.awaiting.length > 0} />
          {section(tp.sections.awaiting, tp.sections.awaitingHint, data.awaiting, true)}
          {section(tp.sections.upcoming, tp.sections.upcomingHint, data.upcoming)}
          {section(tp.sections.others, tp.sections.othersHint, data.others)}
          {data.past.length > 0 && !showPast ? (
            <Button
              variant="secondary"
              label={`${tp.sections.past} (${Math.min(data.past.length, MAX_PAST)})`}
              onPress={() => setShowPast(true)}
            />
          ) : null}
          {showPast ? section(tp.sections.past, null, data.past.slice(0, MAX_PAST)) : null}
        </>
      ) : null}
    </Screen>
  );
}
