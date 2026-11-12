import { Stack, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Share } from "react-native";

import { MeetupFinder } from "@/components/meetup-finder";
import { ProposeSheet } from "@/components/propose-sheet";

import { PlanCard } from "@/components/plan-card";
import { Badge, Body, Button, Card, ErrorText, Heading, Loading, Muted, Row, Screen } from "@/components/ui";
import { getGroupDetail } from "@/lib/groups/queries";
import { inviteUrl } from "@/lib/groups/validation";
import type { ProposalView } from "@/lib/meetups/search";
import { defaultFreeSlot } from "@/lib/plans/validation";
import { loadPlans } from "@/lib/plans/queries";
import { locale, t } from "@/services/i18n";
import { useAuthed } from "@/services/session";
import { SITE_URL } from "@/services/site";
import { useLoad } from "@/services/use-load";
import { draftFromProposal, type ProposeDraft } from "@/features/propose";

const tg = t.groups;

/** Un groupe : inviter, plans à venir, « Quand on peut se voir », proposer un moment, membres. */
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
  const [draft, setDraft] = useState<ProposeDraft | null>(null);
  const [extraPlace, setExtraPlace] = useState<{ id: string; name: string } | null>(null);
  const [flash, setFlash] = useState<string | null>(null);

  const places = group ? group.favorites.map((f) => ({ id: f.id, name: f.name })) : [];
  if (extraPlace && !places.some((p) => p.id === extraPlace.id)) places.unshift(extraPlace);

  function proposeFromSlot(p: ProposalView, participantIds: string[]) {
    if (!group) return;
    setExtraPlace(p.placeId && p.placeName ? { id: p.placeId, name: p.placeName } : null);
    setDraft(
      draftFromProposal(p, {
        groupId: group.id,
        memberIds: group.members.map((m) => m.userId),
        participantIds,
        defaultTitle: t.plans.defaultTitle,
        callTitle: tg.callTitle,
        callLocation: tg.callLocation,
      }),
    );
  }

  function proposeFree() {
    if (!group) return;
    setExtraPlace(null);
    setDraft({
      groupId: group.id,
      title: t.plans.defaultTitle,
      ...defaultFreeSlot(new Date()),
      durationMinutes: 120,
      placeId: group.favorites[0]?.id ?? null,
      location: "",
      inviteeIds: null,
      repeat: null,
    });
  }

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
            {flash ? <Body bold>{flash}</Body> : null}
            {data.plans.length === 0 ? <Muted>{tg.noPlans}</Muted> : null}
            {data.plans.map((p) => <PlanCard key={p.id} plan={p} onChanged={() => void reload()} />)}
            <Button label={tg.proposeMoment} variant="secondary" onPress={proposeFree} />

            {group.members.length > 1 ? (
              <>
                <Heading>{t.meetups.title}</Heading>
                <MeetupFinder groupId={group.id} members={group.members} onPropose={proposeFromSlot} />
              </>
            ) : null}

            <Heading>{`${tg.sections.members} (${group.members.length})`}</Heading>
            <Card>
              {group.members.map((m) => (
                <Row key={m.userId}>
                  <Body>{m.userId === userId ? `${m.displayName} (toi)` : m.displayName}</Body>
                  {m.role === "admin" ? <Badge>{tg.admin}</Badge> : null}
                </Row>
              ))}
            </Card>
            {group.members.length <= 1 ? <Muted>{tg.aloneHint}</Muted> : null}
          </>
        ) : null}
      </Screen>
      {draft && group ? (
        <ProposeSheet
          draft={draft}
          members={group.members}
          places={places}
          onClose={() => setDraft(null)}
          onSent={(message) => {
            setDraft(null);
            setFlash(message);
            void reload();
          }}
        />
      ) : null}
    </>
  );
}
