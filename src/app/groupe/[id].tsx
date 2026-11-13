import { Stack, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Platform, Share } from "react-native";

import { Avatar, AvatarStack } from "@/components/avatar";
import { icons } from "@/components/icons";
import { ListGroup, ListRow } from "@/components/list";

import { FreeNow } from "@/components/free-now";
import { MeetupFinder } from "@/components/meetup-finder";
import { PlaceMap } from "@/components/place-map";
import { ProposeSheet } from "@/components/propose-sheet";

import { PlanCard } from "@/components/plan-card";
import { Badge, Body, Button, Card, EmptyState, ErrorText, Fill, Heading, Loading, Muted, Notice, Row, Screen, Section } from "@/components/ui";
import { getGroupDetail } from "@/lib/groups/queries";
import { inviteUrl } from "@/lib/groups/validation";
import type { ProposalView } from "@/lib/meetups/search";
import { defaultFreeSlot } from "@/lib/plans/validation";
import { loadPlans } from "@/lib/plans/queries";
import { locale, t } from "@/services/i18n";
import { useAuthed } from "@/services/session";
import { SITE_URL } from "@/services/site";
import { useLoad } from "@/services/use-load";
import { draftFromFreeNow, draftFromProposal, type ProposeDraft } from "@/features/propose";
import type { FreeNowMatchView } from "@/lib/meetups/freeNow";
import { space } from "@/theme/colors";

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
  }, `${userId}:${id}`, "groupe");

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

  function proposeFromFreeNow(m: FreeNowMatchView) {
    if (!group) return;
    setExtraPlace(m.placeId && m.placeName ? { id: m.placeId, name: m.placeName } : null);
    setDraft(
      draftFromFreeNow(m, {
        groupId: group.id,
        userId,
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

  const share = () => {
    if (group && link) void Share.share({ message: `${tg.shareText(group.name)} : ${link}` });
  };

  const alone = group ? group.members.length <= 1 : false;
  const memberNames = group ? group.members.map((m) => m.displayName) : [];

  return (
    <>
      <Stack.Screen options={{ title: group?.name ?? "Groupe" }} />
      {Platform.OS !== "web" && group ? (
        // Barre d'outils native : partager l'invitation et proposer un moment.
        <Stack.Toolbar placement="right">
          <Stack.Toolbar.Button icon={icons.share} accessibilityLabel={tg.share} onPress={share} />
          <Stack.Toolbar.Button icon={icons.add} accessibilityLabel={tg.proposeMoment} onPress={proposeFree} />
        </Stack.Toolbar>
      ) : null}
      <Screen edges={[]} refreshing={refreshing} onRefresh={refresh}>
        <ErrorText>{error}</ErrorText>
        {!data && !error ? <Loading /> : null}
        {data && !group ? (
          <EmptyState icon="group" title="Groupe introuvable" text="Ce groupe n'existe plus, ou tu n'en fais plus partie." />
        ) : null}
        {group && link ? (
          <>
            {alone ? (
              <Card tone="accent">
                <Body bold>{tg.inviteFirst}</Body>
                <Muted>{tg.aloneHint}</Muted>
                <Button icon="share" label={tg.share} onPress={share} />
              </Card>
            ) : (
              <Card>
                <Row nowrap gap={space.md}>
                  <AvatarStack names={memberNames} size={32} />
                  <Fill>
                    <Body bold>{tg.members(group.members.length)}</Body>
                  </Fill>
                  <Button size="small" variant="secondary" icon="personAdd" label={tg.sections.invite} onPress={share} />
                </Row>
              </Card>
            )}

            <Notice>{flash}</Notice>

            <Section>
              <Heading action={{ label: tg.proposeMoment, onPress: proposeFree }}>{tg.groupPlans}</Heading>
              {data.plans.length === 0 ? (
                <Muted>
                  {alone
                    ? "Aucun plan à venir. Tu peux déjà proposer un moment : tes amis le verront en arrivant."
                    : `Aucun plan à venir. Cherche un moment ci-dessous, ou touche « ${tg.proposeMoment} ».`}
                </Muted>
              ) : null}
              {data.plans.map((p, i) => <PlanCard key={p.id} index={i} plan={p} onChanged={() => void reload()} />)}
            </Section>

            {!alone ? (
              <Section>
                <Heading>{t.meetups.title}</Heading>
                <FreeNow groupId={group.id} onPropose={proposeFromFreeNow} />
                <MeetupFinder groupId={group.id} members={group.members} onPropose={proposeFromSlot} />
              </Section>
            ) : null}

            {Platform.OS === "ios" && group.favorites.length > 0 ? (
              <Section>
                <Heading>{tg.favoritesTitle}</Heading>
                <PlaceMap points={group.favorites.map((f) => ({ id: f.id, lat: f.lat, lng: f.lng, label: f.name }))} />
              </Section>
            ) : null}

            <ListGroup header={`${tg.sections.members} (${group.members.length})`}>
              {group.members.map((m) => (
                <ListRow
                  key={m.userId}
                  leading={<Avatar name={m.displayName} size={36} />}
                  title={m.userId === userId ? `${m.displayName}${tg.you}` : m.displayName}
                  trailing={m.role === "admin" ? <Badge>{tg.admin}</Badge> : undefined}
                />
              ))}
            </ListGroup>

            <ListGroup header={tg.inviteLink} footer={tg.inviteBody}>
              <ListRow icon="link" title={tg.share} subtitle={link} onPress={share} />
            </ListGroup>
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
