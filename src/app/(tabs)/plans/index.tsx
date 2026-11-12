import { PlanCard } from "@/components/plan-card";
import { ErrorText, Heading, Loading, Muted, Screen } from "@/components/ui";
import { loadPlans } from "@/lib/plans/queries";
import { groupPlans, type PlanView } from "@/lib/plans/view";
import { locale, t } from "@/services/i18n";
import { useAuthed } from "@/services/session";
import { useLoad } from "@/services/use-load";

const tp = t.plans;

/** Mes plans, dans les mêmes sections que la page /plans du site. */
export default function Plans() {
  const { supabase, userId } = useAuthed();
  const { data, error, refreshing, refresh, reload } = useLoad(async () => {
    const r = await loadPlans(supabase, userId, new Date(), { locale });
    if (!r.ok) throw new Error(r.error);
    return groupPlans(r.views);
  }, userId);

  const section = (title: string, hint: string | null, list: PlanView[]) =>
    list.length === 0 ? null : (
      <>
        <Heading>{title}</Heading>
        {hint ? <Muted>{hint}</Muted> : null}
        {list.map((p) => <PlanCard key={p.id} plan={p} onChanged={() => void reload()} />)}
      </>
    );

  const empty =
    data &&
    data.awaiting.length + data.upcoming.length + data.others.length + data.past.length === 0;

  return (
    <Screen title={tp.title} refreshing={refreshing} onRefresh={refresh}>
      <ErrorText>{error}</ErrorText>
      {!data && !error ? <Loading /> : null}
      {empty ? <Muted>{`${tp.emptyBefore}${tp.emptyLink}${tp.emptyAfter}`}</Muted> : null}
      {data ? (
        <>
          {section(tp.sections.awaiting, tp.sections.awaitingHint, data.awaiting)}
          {section(tp.sections.upcoming, tp.sections.upcomingHint, data.upcoming)}
          {section(tp.sections.others, tp.sections.othersHint, data.others)}
          {section(tp.sections.past, null, data.past.slice(0, 20))}
        </>
      ) : null}
    </Screen>
  );
}
