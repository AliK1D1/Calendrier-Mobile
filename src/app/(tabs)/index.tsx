import { Link } from "expo-router";
import * as WebBrowser from "expo-web-browser";

import { PlanCard } from "@/components/plan-card";
import { Body, Button, Card, ErrorText, Heading, Loading, Muted, Screen } from "@/components/ui";
import { getMyProfile, getOnboardingStatus } from "@/lib/profile";
import { loadPlans } from "@/lib/plans/queries";
import { homePlans } from "@/lib/ux/homePlans";
import { locale, t } from "@/services/i18n";
import { useAuthed } from "@/services/session";
import { SITE_URL } from "@/services/site";
import { useLoad } from "@/services/use-load";
import { usePalette } from "@/theme/use-palette";

/** Accueil : bonjour, plans qui attendent ma réponse, mes prochains plans. */
export default function Accueil() {
  const { supabase, userId } = useAuthed();
  const c = usePalette();
  const { data, error, refreshing, refresh, reload } = useLoad(async () => {
    const [profile, onboarded, plans] = await Promise.all([
      getMyProfile(supabase, userId),
      getOnboardingStatus(supabase),
      loadPlans(supabase, userId, new Date(), { locale }),
    ]);
    if (!plans.ok) throw new Error(plans.error);
    return { profile, onboarded, plans: homePlans(plans.views) };
  }, userId);

  return (
    <Screen title={t.home.hello(data?.profile?.display_name || undefined)} refreshing={refreshing} onRefresh={refresh}>
      <ErrorText>{error}</ErrorText>
      {!data && !error ? <Loading /> : null}
      {data?.onboarded === false ? (
        <Card>
          <Body bold>Termine ta configuration</Body>
          <Muted>
            Choisis ton lieu « maison » et ton moyen de transport : sans eux, les moments proposés ne
            tiennent pas compte de tes trajets. Pour l&apos;instant, ça se fait sur le site.
          </Muted>
          <Button label="Ouvrir sur le site" variant="secondary" onPress={() => void WebBrowser.openBrowserAsync(`${SITE_URL}/bienvenue`)} />
        </Card>
      ) : null}
      {data ? (
        <>
          {data.plans.awaiting.length > 0 ? (
            <>
              <Heading>{t.home.plans.awaiting(data.plans.awaiting.length)}</Heading>
              <Muted>{t.home.plans.awaitingHint}</Muted>
              {data.plans.awaiting.map((p) => <PlanCard key={p.id} plan={p} onChanged={() => void reload()} />)}
            </>
          ) : null}
          <Heading>{t.home.plans.upcoming}</Heading>
          {data.plans.upcoming.length === 0 ? (
            <Muted>{t.plans.nothingToAnswer} Ouvre un groupe pour trouver un moment.</Muted>
          ) : (
            data.plans.upcoming.map((p) => <PlanCard key={p.id} plan={p} onChanged={() => void reload()} />)
          )}
          <Link href="/plans" style={{ color: c.primary, fontSize: 16, fontWeight: "600", paddingVertical: 8 }}>
            {t.home.plans.seeAll(data.plans.moreUpcoming)}
          </Link>
        </>
      ) : null}
    </Screen>
  );
}
