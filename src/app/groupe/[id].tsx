import { Stack, useLocalSearchParams } from "expo-router";
import { Share } from "react-native";

import { PlanCard } from "@/components/plan-card";
import { Badge, Body, Button, Card, ErrorText, Heading, Loading, Muted, Row, Screen } from "@/components/ui";
import { getGroupDetail } from "@/lib/groups/queries";
import { inviteUrl } from "@/lib/groups/validation";
import { loadPlans } from "@/lib/plans/queries";
import { locale, t } from "@/services/i18n";
import { useAuthed } from "@/services/session";
import { SITE_URL } from "@/services/site";
import { useLoad } from "@/services/use-load";

const tg = t.groups;

/** Un groupe : inviter, plans à venir, membres. La recherche de moments arrive à l'étape suivante. */
export default function Groupe() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { supabase, userId } = useAuthed();
  const { data, error, refreshing, refresh, reload } = useLoad(async () => {
    const [group, plans] = await Promise.all([
      getGroupDetail(supabase, id, userId),
      loadPlans(supabase, userId, new Date(), { groupId: id, locale }),
    ]);
    if (!plans.ok) throw new Error(plans.error);
    return { group, plans: plans.views.filter((p) => p.state === "upcoming") };
  }, `${userId}:${id}`);

  const group = data?.group;
  const link = group ? inviteUrl(SITE_URL, group.inviteCode) : null;

  return (
    <>
      <Stack.Screen options={{ title: group?.name ?? "Groupe" }} />
      <Screen edges={[]} refreshing={refreshing} onRefresh={refresh}>
        <ErrorText>{error}</ErrorText>
        {!data && !error ? <Loading /> : null}
        {data && !group ? <Muted>Ce groupe n&apos;existe plus, ou tu n&apos;en fais plus partie.</Muted> : null}
        {group && link ? (
          <>
            <Card>
              <Body bold>{group.members.length <= 1 ? tg.inviteFirst : tg.inviteFriends}</Body>
              <Muted>{tg.inviteBody}</Muted>
              <Muted>{link}</Muted>
              <Button
                label={tg.share}
                onPress={() => void Share.share({ message: `${tg.shareText(group.name)} : ${link}` })}
              />
            </Card>

            <Heading>{tg.groupPlans}</Heading>
            {data.plans.length === 0 ? <Muted>Aucun plan à venir.</Muted> : null}
            {data.plans.map((p) => <PlanCard key={p.id} plan={p} onChanged={() => void reload()} />)}

            <Heading>{`${tg.sections.members} (${group.members.length})`}</Heading>
            <Card>
              {group.members.map((m) => (
                <Row key={m.userId}>
                  <Body>{m.userId === userId ? `${m.displayName} (toi)` : m.displayName}</Body>
                  {m.role === "admin" ? <Badge>{tg.admin}</Badge> : null}
                </Row>
              ))}
            </Card>
            <Muted>{group.members.length > 1 ? "Bientôt dans l'app : « Quand on peut se voir », trajets compris." : tg.aloneHint}</Muted>
          </>
        ) : null}
      </Screen>
    </>
  );
}
