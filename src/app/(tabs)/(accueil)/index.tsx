import { formatInTimeZone } from "date-fns-tz";
import { type Href, router } from "expo-router";
import { StyleSheet, Text, View } from "react-native";

import { Icon, type IconName } from "@/components/icon";
import { PlanCard } from "@/components/plan-card";
import { Body, Button, Card, EmptyState, ErrorText, Heading, Loading, Muted, Row, Screen, Section } from "@/components/ui";
import { dayLabelFr } from "@/features/agenda";
import { loadPlans } from "@/lib/plans/queries";
import { TIME_ZONE } from "@/lib/scheduling/time";
import { homePlans } from "@/lib/ux/homePlans";
import { locale, t } from "@/services/i18n";
import { useAuthed } from "@/services/session";
import { getHomeProfile } from "@/services/home";
import { programmerRappels } from "@/services/notifications";
import { useLoad, useReloadOnFocus } from "@/services/use-load";
import { space } from "@/theme/colors";
import { strong, type } from "@/theme/tokens";
import { usePalette } from "@/theme/use-palette";

/** Raccourci de l'accueil : une icône dans un rond et un mot, toute la tuile se touche. */
function Shortcut({ icon, label, href }: { icon: IconName; label: string; href: Href }) {
  const c = usePalette();
  return (
    <View style={{ flex: 1 }}>
      <Card onPress={() => router.push(href)} accessibilityLabel={label} style={styles.shortcut}>
        <View style={[styles.shortcutIcon, { backgroundColor: c.accent }]}>
          <Icon name={icon} size={20} color={c.accentText} />
        </View>
        <Text numberOfLines={2} style={[type.footnote, strong, { color: c.text, textAlign: "center" }]}>
          {label}
        </Text>
      </Card>
    </View>
  );
}

/** Accueil : bonjour, raccourcis, plans qui attendent ma réponse, mes prochains plans. */
export default function Accueil() {
  const { supabase, userId } = useAuthed();
  const { data, error, refreshing, refresh, reload, age } = useLoad(async () => {
    const [profile, plans] = await Promise.all([
      getHomeProfile(supabase, userId),
      loadPlans(supabase, userId, new Date(), { locale }),
    ]);
    if (!plans.ok) throw new Error(plans.error);
    void programmerRappels(plans.views);
    return { profile, onboarded: profile.onboarded, plans: homePlans(plans.views) };
  }, userId, "accueil");
  // Retour sur l'accueil (bienvenue, un groupe, un autre onglet) : on relit les plans et l'état
  // du profil, sauf à la première ouverture et si on vient de les lire.
  useReloadOnFocus(reload, age, 5_000);

  const today = dayLabelFr(formatInTimeZone(new Date(), TIME_ZONE, "yyyy-MM-dd"));
  const nothing = data && data.plans.awaiting.length + data.plans.upcoming.length === 0;

  return (
    <Screen
      title={t.home.hello(data?.profile.displayName || undefined)}
      subtitle={today.charAt(0).toUpperCase() + today.slice(1)}
      refreshing={refreshing}
      onRefresh={refresh}
    >
      <ErrorText>{error}</ErrorText>
      {!data && !error ? <Loading /> : null}
      {data?.onboarded === false ? (
        <Card tone="accent">
          <Body bold>Termine ta configuration</Body>
          <Muted>
            Choisis ton lieu « maison » et ton moyen de transport : sans eux, les moments proposés ne
            tiennent pas compte de tes trajets.
          </Muted>
          <Button label="Commencer (3 questions)" onPress={() => router.push("/bienvenue")} />
        </Card>
      ) : null}

      <Row nowrap gap={space.md} align="stretch">
        <Shortcut icon="sparkles" label={t.home.findMoment} href="/groupes" />
        <Shortcut icon="calendar" label={t.schedule.title} href="/horaire" />
        <Shortcut icon="study" label="Étude" href="/etude" />
      </Row>

      {data && data.plans.awaiting.length > 0 ? (
        <Section>
          <View style={{ gap: 2 }}>
            <Heading>{t.home.plans.awaiting(data.plans.awaiting.length)}</Heading>
            <Muted>{t.home.plans.awaitingHint}</Muted>
          </View>
          {data.plans.awaiting.map((p) => <PlanCard key={p.id} plan={p} onChanged={() => void reload()} />)}
        </Section>
      ) : null}

      {data && data.plans.upcoming.length > 0 ? (
        <Section>
          <Heading action={{ label: data.plans.moreUpcoming > 0 ? `Tout voir (${data.plans.upcoming.length + data.plans.moreUpcoming})` : "Tout voir", onPress: () => router.push("/plans") }}>
            {t.home.plans.upcoming}
          </Heading>
          {data.plans.upcoming.map((p) => <PlanCard key={p.id} plan={p} onChanged={() => void reload()} />)}
        </Section>
      ) : null}

      {nothing ? (
        <EmptyState
          icon="calendar"
          title="Aucun plan pour l'instant"
          text="Ouvre un groupe, cherche quand vous pouvez vous voir, puis propose un moment."
          action={{ label: t.home.myGroups, icon: "group", onPress: () => router.push("/groupes") }}
        />
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  shortcut: { flex: 1, alignItems: "center", paddingVertical: space.md + 2, paddingHorizontal: space.sm, gap: space.sm },
  shortcutIcon: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
});
