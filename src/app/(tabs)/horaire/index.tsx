import { formatInTimeZone } from "date-fns-tz";
import { router, Stack, useFocusEffect } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { useCallback, useState } from "react";
import { ActionSheetIOS, Alert, Platform, Pressable, View } from "react-native";

import { BlockSheet } from "@/components/block-sheet";
import { icons } from "@/components/icons";
import { Badge, Body, Button, Card, ErrorText, Loading, Muted, Row, Screen } from "@/components/ui";
import { type AgendaItem, dayLabelFr, mondayOf, weekAgenda } from "@/features/agenda";
import { type BlockDraft, editBlockDraft, isEditableSource, newBlockDraft, setOccurrence } from "@/features/blocks";
import { toBlockSpec } from "@/lib/db/convert";
import { getMyBusyBlocks, getMyPlaces, getMyProfile } from "@/lib/profile";
import { isRecurring, suggestSession } from "@/lib/scheduling/weeklyBlocks";
import { TIME_ZONE } from "@/lib/scheduling/time";
import { t } from "@/services/i18n";
import { useAuthed } from "@/services/session";
import { SITE_URL } from "@/services/site";
import { useLoad } from "@/services/use-load";
import { space } from "@/theme/colors";
import { usePalette } from "@/theme/use-palette";

const tb = t.schedule.block;

const SOURCE_LABEL: Record<string, string> = {
  meetup: "Plan de groupe",
  study: "Étude",
  ics: "Importé",
  image: "Importé",
  outlook: "Outlook",
  subscription: "Calendrier abonné",
};

/** Mon horaire, une semaine à la fois : ajouter, modifier, supprimer, annuler une fois. */
export default function Horaire() {
  const { supabase, userId } = useAuthed();
  const c = usePalette();
  const [offset, setOffset] = useState(0);
  const [draft, setDraft] = useState<BlockDraft | null>(null);
  const [flash, setFlash] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const { data, error, refreshing, refresh, reload } = useLoad(async () => {
    const [rows, places, profile] = await Promise.all([
      getMyBusyBlocks(supabase, userId),
      getMyPlaces(supabase, userId),
      getMyProfile(supabase, userId),
    ]);
    return { rows, places, homeId: profile?.home_place_id ?? null };
  }, userId);

  // Retour de l'écran Étude (séances acceptées) : on relit l'horaire.
  useFocusEffect(
    useCallback(() => {
      void reload();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []),
  );

  const today = formatInTimeZone(new Date(), TIME_ZONE, "yyyy-MM-dd");
  const days = data ? weekAgenda(data.rows, mondayOf(today, offset), today) : null;
  const total = days?.reduce((n, d) => n + d.items.length, 0) ?? 0;
  const homeName = data?.places.find((p) => p.id === data.homeId)?.name ?? null;
  // La maison est « nulle » dans un bloc : on ne la propose pas deux fois.
  const otherPlaces = data ? data.places.filter((p) => p.id !== data.homeId) : [];
  const session = data
    ? suggestSession(
        data.rows.filter((r) => r.source !== "subscription").map((r) => toBlockSpec(r)),
        today,
      )
    : { from: today, to: today };

  function done(message: string) {
    setDraft(null);
    setFlash(message);
    setActionError(null);
    void reload();
  }

  function newBlock(day: string) {
    // Le lieu le plus utilisé de mon horaire (souvent le cégep), sinon mon premier lieu.
    const counts = new Map<string, number>();
    for (const r of data?.rows ?? []) if (r.place_id) counts.set(r.place_id, (counts.get(r.place_id) ?? 0) + 1);
    const best = [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
    const place = otherPlaces.find((p) => p.id === best)?.id ?? otherPlaces[0]?.id ?? null;
    setDraft(newBlockDraft(day >= today ? day : today, session, place));
  }

  async function occurrence(item: AgendaItem, day: string, skip: boolean) {
    const r = await setOccurrence(supabase, userId, item.block.id, day, skip, today);
    if (!r.ok) return setActionError(r.error);
    done(skip ? tb.skipped(item.title, dayLabelFr(day)) : t.schedule.restored(item.title, dayLabelFr(day)));
  }

  function onItem(item: AgendaItem, day: string) {
    const b = item.block;
    if (!isEditableSource(b.source)) {
      Alert.alert(item.title, b.source === "meetup" ? "Un plan de groupe se gère dans l'onglet Plans." : "Ce bloc se gère sur le site.");
      return;
    }
    const actions: { text: string; destructive?: boolean; run: () => void }[] = [
      { text: tb.editTitle, run: () => setDraft(editBlockDraft(b, day, session)) },
    ];
    if (isRecurring(b)) {
      if (item.skipped) actions.push({ text: "Rétablir cette fois-ci", run: () => void occurrence(item, day, false) });
      else if (day >= today) actions.push({ text: tb.skipOnce(dayLabelFr(day)), destructive: true, run: () => void occurrence(item, day, true) });
    }
    const message = `${dayLabelFr(day)}, ${item.timeLabel}${isRecurring(b) && !item.skipped ? `\n${tb.skipHint}` : ""}`;
    if (Platform.OS === "ios") {
      // iPhone : feuille d'actions d'Apple, qui monte du bas de l'écran.
      const options = [...actions.map((a) => a.text), "Annuler"];
      const destructive = actions.findIndex((a) => a.destructive);
      ActionSheetIOS.showActionSheetWithOptions(
        {
          title: item.title,
          message,
          options,
          cancelButtonIndex: options.length - 1,
          destructiveButtonIndex: destructive >= 0 ? destructive : undefined,
          tintColor: c.primary,
        },
        (index) => actions[index]?.run(),
      );
      return;
    }
    // Android : boîte de dialogue Material.
    Alert.alert(item.title, message, [
      ...actions.map((a) => ({ text: a.text, onPress: a.run })),
      { text: "Fermer", style: "cancel" as const },
    ]);
  }

  const native = Platform.OS !== "web";
  const addFirst = () => newBlock(days?.[0]?.day ?? today);
  const openSite = () => void WebBrowser.openBrowserAsync(`${SITE_URL}/horaire`);

  return (
    <>
      {native ? (
        // Barre d'outils native : « + » pour ajouter un bloc, et un menu pour le reste.
        <Stack.Toolbar placement="right">
          <Stack.Toolbar.Button icon={icons.add} accessibilityLabel={tb.newTitle} disabled={!data} onPress={addFirst} />
          <Stack.Toolbar.Menu icon={icons.more} accessibilityLabel="Plus d'actions">
            <Stack.Toolbar.MenuAction icon={icons.study} onPress={() => router.push("/etude")}>
              Étude
            </Stack.Toolbar.MenuAction>
            <Stack.Toolbar.MenuAction icon={icons.today} disabled={offset === 0} onPress={() => setOffset(0)}>
              Revenir à cette semaine
            </Stack.Toolbar.MenuAction>
            <Stack.Toolbar.MenuAction icon={icons.web} onPress={openSite}>
              Ouvrir l&apos;horaire sur le site
            </Stack.Toolbar.MenuAction>
          </Stack.Toolbar.Menu>
        </Stack.Toolbar>
      ) : null}
      <Screen title={t.schedule.title} refreshing={refreshing} onRefresh={refresh}>
        <Row>
          <View style={{ flex: 1 }}>
            <Button label="‹ Semaine d'avant" variant="secondary" onPress={() => setOffset((o) => o - 1)} />
          </View>
          <View style={{ flex: 1 }}>
            <Button label="Semaine d'après ›" variant="secondary" onPress={() => setOffset((o) => o + 1)} />
          </View>
        </Row>
        {offset !== 0 ? <Button label="Revenir à cette semaine" variant="secondary" onPress={() => setOffset(0)} /> : null}
        {native ? null : (
          <Row>
            <View style={{ flex: 1 }}>
              <Button label={`+ ${tb.newTitle}`} disabled={!data} onPress={addFirst} />
            </View>
            <View style={{ flex: 1 }}>
              <Button label="Étude" variant="secondary" onPress={() => router.push("/etude")} />
            </View>
          </Row>
        )}
        {flash ? <Body bold>{flash}</Body> : null}
        <ErrorText>{actionError}</ErrorText>
        <ErrorText>{error}</ErrorText>
        {!days && !error ? <Loading /> : null}
        {days && total === 0 ? <Muted>Rien à ton horaire cette semaine.</Muted> : null}
        {days?.map((d) => (
          <Card key={d.day} style={d.isToday ? { borderColor: c.primary, borderWidth: 2 } : undefined}>
            <Row>
              <Body bold>{d.label.charAt(0).toUpperCase() + d.label.slice(1)}</Body>
              {d.isToday ? <Badge>Aujourd&apos;hui</Badge> : null}
            </Row>
            {d.items.length === 0 ? <Muted>Libre toute la journée</Muted> : null}
            {d.items.map((i) => (
              <Pressable
                key={i.id}
                accessibilityRole="button"
                accessibilityHint="Modifier ou annuler cette fois-ci"
                onPress={() => onItem(i, d.day)}
                style={({ pressed }) => ({
                  flexDirection: "row",
                  gap: space.md,
                  alignItems: "baseline",
                  minHeight: 44,
                  paddingVertical: space.xs,
                  opacity: pressed ? 0.6 : i.skipped ? 0.55 : 1,
                })}
              >
                <Muted>{i.timeLabel}</Muted>
                <View style={{ flex: 1 }}>
                  <Body>{i.skipped ? `${i.title} (annulé cette fois-ci)` : i.title}</Body>
                  {i.source && SOURCE_LABEL[i.source] ? <Muted>{SOURCE_LABEL[i.source]}</Muted> : null}
                </View>
              </Pressable>
            ))}
            <Pressable accessibilityRole="button" onPress={() => newBlock(d.day)} style={{ minHeight: 44, justifyContent: "center" }}>
              <Muted>+ Ajouter ce jour-là</Muted>
            </Pressable>
          </Card>
        ))}
        <Muted>Importer un .ics, les calendriers abonnés et les disponibilités ponctuelles se gèrent sur le site.</Muted>
        <Button label="Ouvrir l'horaire sur le site" variant="secondary" onPress={openSite} />
      </Screen>
      {draft && data ? (
        <BlockSheet
          draft={draft}
          places={otherPlaces}
          homeName={homeName}
          today={today}
          onClose={() => setDraft(null)}
          onSaved={done}
        />
      ) : null}
    </>
  );
}
