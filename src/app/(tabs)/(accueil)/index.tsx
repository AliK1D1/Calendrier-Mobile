import { Link, router } from "expo-router";

import { PlanCard } from "@/components/plan-card";
import { Body, Button, Card, ErrorText, Heading, Loading, Muted, Screen } from "@/components/ui";
import { loadPlans } from "@/lib/plans/queries";
import { homePlans } from "@/lib/ux/homePlans";
import { locale, t } from "@/services/i18n";
import { useAuthed } from "@/services/session";
import { getHomeProfile } from "@/services/home";
import { useLoad, useReloadOnFocus } from "@/services/use-load";
import { usePalette } from "@/theme/use-palette";

/** Accueil : bonjour, plans qui attendent ma réponse, mes prochains plans. */
export default function Accueil() {
  const { supabase, userId } = useAuthed();
  const c = usePalette();
  const { data, error, refreshing, refresh, reload, age } = useLoad(async () => {
    const [profile, plans] = await Promise.all([
      getHomeProfile(supabase, userId),
      loadPlans(supabase, userId, new Date(), { locale }),
    ]);
    if (!plans.ok) throw new Error(plans.error);
    return { profile, onboarded: profile.onboarded, plans: homePlans(plans.views) };
  }, userId, "accueil");
  // Retour sur l'accueil (bienvenue, un groupe, un autre onglet) : on relit les plans et l'état
  // du profil, sauf à la première ouverture et si on vient de les lire.
  useReloadOnFocus(reload, age, 5_000);

  return (
    <Screen title={t.home.hello(data?.profile.displayName || undefined)} refreshing={refreshing} onRefresh={refresh}>
      <ErrorText>{error}</ErrorText>
      {!data && !error ? <Loading /> : null}
      {data?.onboarded === false ? (
        <Card>
          <Body bold>Termine ta configuration</Body>
          <Muted>
            Choisis ton lieu « maison » et ton moyen de transport : sans eux, les moments proposés ne
            tiennent pas compte de tes trajets.
          </Muted>
          <Button label="Commencer (3 questions)" onPress={() => router.push("/bienvenue")} />
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
