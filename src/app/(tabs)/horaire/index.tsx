import { formatInTimeZone } from "date-fns-tz";
import { router, Stack } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { useState } from "react";
import { ActionSheetIOS, Alert, Platform, Pressable, StyleSheet, Text, View } from "react-native";

import { BlockSheet } from "@/components/block-sheet";
import { icons } from "@/components/icons";
import { ListGroup, ListRow } from "@/components/list";
import { Swap } from "@/components/motion";
import { type SwipeAction, SwipeRow } from "@/components/swipe";
import { Tip } from "@/components/tip";
import { useToast } from "@/components/toast";
import { Badge, Button, EmptyState, ErrorText, Heading, IconButton, Loading, Screen, Section } from "@/components/ui";
import { defaultDay, weekRangeLabel } from "@/features/display";
import { couleurJour, jourDeSemaine } from "@/features/apparence";
import { type AgendaItem, dayLabelFr, mondayOf, weekAgenda } from "@/features/agenda";
import { type BlockDraft, deleteBlock, editBlockDraft, isEditableSource, newBlockDraft, setOccurrence } from "@/features/blocks";
import { toggled, withoutHidden } from "@/features/undo";
import { toBlockSpec } from "@/lib/db/convert";
import { getMyBusyBlocks, getMyPlaces, getMyProfile } from "@/lib/profile";
import { formatClockFr, isRecurring, suggestSession, WEEKDAY_SHORT, weekdayOf } from "@/lib/scheduling/weeklyBlocks";
import { TIME_ZONE } from "@/lib/scheduling/time";
import { t } from "@/services/i18n";
import { hapticSelect } from "@/services/haptics";
import { useAuthed } from "@/services/session";
import { SITE_URL } from "@/services/site";
import { useLoad, useReloadOnFocus } from "@/services/use-load";
import { space } from "@/theme/colors";
import { ANDROID, shape, strong, type } from "@/theme/tokens";
import { usePalette, useScheme } from "@/theme/use-palette";

const tb = t.schedule.block;

const SOURCE_LABEL: Record<string, string> = {
  meetup: "Plan de groupe",
  study: "Étude",
  ics: "Importé",
  image: "Importé",
  outlook: "Outlook",
  subscription: "Calendrier abonné",
};

/**
 * Mon horaire, une semaine à la fois : une bande des 7 jours (un point de couleur les jours
 * occupés), puis le détail du jour choisi. Ajouter, modifier, supprimer, annuler une fois.
 */
export default function Horaire() {
  const { supabase, userId } = useAuthed();
  const c = usePalette();
  const scheme = useScheme();
  const [offset, setOffset] = useState(0);
  // Jour choisi dans la bande ; `null` = aujourd'hui (ou le lundi d'une autre semaine).
  const [picked, setPicked] = useState<string | null>(null);
  const [draft, setDraft] = useState<BlockDraft | null>(null);
  // Blocs supprimés dont « Annuler » est encore proposé : cachés en attendant.
  const [hidden, setHidden] = useState<ReadonlySet<string>>(new Set());
  const toast = useToast();
  const [actionError, setActionError] = useState<string | null>(null);
  const { data, error, refreshing, refresh, reload, age } = useLoad(async () => {
    const [rows, places, profile] = await Promise.all([
      getMyBusyBlocks(supabase, userId),
      getMyPlaces(supabase, userId),
      getMyProfile(supabase, userId),
    ]);
    return { rows, places, homeId: profile?.home_place_id ?? null };
  }, userId, "horaire");

  // Retour de l'écran Étude (séances acceptées) : on relit l'horaire, mais pas à la première
  // ouverture (le chargement initial vient de partir).
  useReloadOnFocus(reload, age, 2_000);

  const today = formatInTimeZone(new Date(), TIME_ZONE, "yyyy-MM-dd");
  const days = data ? weekAgenda(withoutHidden(data.rows, hidden, (r) => r.id), mondayOf(today, offset), today) : null;
  const monday = mondayOf(today, offset);
  const selected = days ? (days.find((d) => d.day === picked)?.day ?? defaultDay(days.map((d) => d.day), today)) : today;
  const shown = days?.find((d) => d.day === selected) ?? null;
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
    toast.show(message);
    setActionError(null);
    void reload();
  }

  /** Supprime un bloc après quelques secondes, sauf si on touche « Annuler ». */
  function removeBlock(id: string, title: string) {
    setDraft(null);
    setHidden((h) => toggled(h, id, true));
    toast.later(
      tb.deleted(title),
      () =>
        void (async () => {
          const r = await deleteBlock(supabase, userId, id);
          if (!r.ok) setActionError(r.error);
          await reload();
          setHidden((h) => toggled(h, id, false));
        })(),
      () => setHidden((h) => toggled(h, id, false)),
    );
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
    setActionError(null);
    void reload();
    // Annulé une fois : « Annuler » le rétablit tout de suite.
    if (skip) toast.show(tb.skipped(item.title, dayLabelFr(day)), () => void occurrence(item, day, false));
    else toast.show(t.schedule.restored(item.title, dayLabelFr(day)));
  }

  /** Actions qu'on voit en glissant un bloc vers la gauche. */
  function swipeActions(item: AgendaItem, day: string): SwipeAction[] {
    const b = item.block;
    if (!isEditableSource(b.source)) return [];
    const out: SwipeAction[] = [];
    if (isRecurring(b)) {
      if (item.skipped) out.push({ label: "Rétablir", icon: "undo", color: c.success, onPress: () => void occurrence(item, day, false) });
      else if (day >= today) out.push({ label: "Cette fois", icon: "skip", color: c.warning, onPress: () => void occurrence(item, day, true) });
    }
    out.push({ label: "Supprimer", icon: "trash", color: c.danger, onPress: () => removeBlock(b.id, item.title) });
    return out;
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
  const addHere = () => newBlock(selected);
  const openSite = () => void WebBrowser.openBrowserAsync(`${SITE_URL}/horaire`);
  const goWeek = (next: number) => {
    setOffset(next);
    setPicked(null);
  };
  const shownLabel = shown ? shown.label.charAt(0).toUpperCase() + shown.label.slice(1) : "";

  return (
    <>
      {native ? (
        // Barre d'outils native : « + » pour ajouter un bloc, Étude, et un menu pour le reste.
        <Stack.Toolbar placement="right">
          <Stack.Toolbar.Button icon={icons.add} accessibilityLabel={tb.newTitle} disabled={!data} onPress={addHere} />
          <Stack.Toolbar.Button icon={icons.study} accessibilityLabel="Étude" onPress={() => router.push("/etude")} />
          <Stack.Toolbar.Menu icon={icons.more} accessibilityLabel="Plus d'actions">
            <Stack.Toolbar.MenuAction icon={icons.today} disabled={offset === 0} onPress={() => goWeek(0)}>
              Revenir à cette semaine
            </Stack.Toolbar.MenuAction>
            <Stack.Toolbar.MenuAction icon={icons.web} onPress={openSite}>
              Ouvrir l&apos;horaire sur le site
            </Stack.Toolbar.MenuAction>
          </Stack.Toolbar.Menu>
        </Stack.Toolbar>
      ) : null}
      <Screen title={t.schedule.title} refreshing={refreshing} onRefresh={refresh}>
        <View style={[styles.week, { backgroundColor: c.card }]}>
          <View style={styles.weekBar}>
            <IconButton icon="chevronLeft" label="Semaine d'avant" onPress={() => goWeek(offset - 1)} />
            <View style={styles.weekTitle}>
              <Text accessibilityRole="header" style={[type.headline, { color: c.text }]}>
                {offset === 0 ? "Cette semaine" : weekRangeLabel(monday)}
              </Text>
              {offset === 0 ? (
                <Text style={[type.footnote, { color: c.muted }]}>{weekRangeLabel(monday)}</Text>
              ) : (
                <Pressable accessibilityRole="button" hitSlop={10} onPress={() => goWeek(0)}>
                  <Text style={[type.footnote, strong, { color: c.primary }]}>Revenir à cette semaine</Text>
                </Pressable>
              )}
            </View>
            <IconButton icon="chevron" label="Semaine d'après" onPress={() => goWeek(offset + 1)} />
          </View>
          <View accessibilityRole="tablist" style={styles.strip}>
            {(days ?? []).map((d) => {
              const on = d.day === selected;
              const count = d.items.filter((i) => !i.skipped).length;
              return (
                <Pressable
                  key={d.day}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: on }}
                  accessibilityLabel={`${d.label}${d.isToday ? ", aujourd'hui" : ""}, ${count === 0 ? "libre" : `${count} bloc${count > 1 ? "s" : ""}`}`}
                  onPress={() => {
                    if (!on) hapticSelect();
                    setPicked(d.day);
                  }}
                  android_ripple={{ color: c.border, borderless: true, radius: 28 }}
                  style={({ pressed }) => [styles.day, { opacity: pressed && !ANDROID ? 0.5 : 1 }]}
                >
                  <Text allowFontScaling={false} style={[type.caption, { color: d.isToday ? c.primary : c.muted }, d.isToday ? strong : null]}>
                    {WEEKDAY_SHORT[weekdayOf(d.day)].slice(0, 3)}
                  </Text>
                  <View style={[styles.dayNumber, on ? { backgroundColor: c.primary } : null]}>
                    <Text
                      allowFontScaling={false}
                      style={[type.headline, { color: on ? c.primaryText : d.isToday ? c.primary : c.text }]}
                    >
                      {Number(d.day.slice(8))}
                    </Text>
                  </View>
                  {/* Couleur propre à chaque jour, comme la grille de l'horaire du site. */}
                  <View style={[styles.dot, { backgroundColor: count > 0 ? couleurJour(jourDeSemaine(d.day), scheme) : "transparent" }]} />
                </Pressable>
              );
            })}
          </View>
        </View>

        <ErrorText>{actionError}</ErrorText>
        <ErrorText>{error}</ErrorText>
        {!days && !error ? <Loading /> : null}

        <Tip id="swipeBlock" when={!!shown && shown.items.some((i) => isEditableSource(i.block.source))} />
        {shown ? (
          // Autre jour ou autre semaine : le détail arrive en fondu.
          <Swap key={shown.day}>
          <Section>
            <Heading action={{ label: "Ajouter", onPress: addHere }}>{shownLabel}</Heading>
            {shown.items.length === 0 ? (
              <EmptyState
                icon="calendar"
                title="Libre toute la journée"
                text={shown.isToday ? "Rien à ton horaire aujourd'hui." : "Rien à ton horaire ce jour-là."}
                action={{ label: tb.newTitle, icon: "add", onPress: addHere }}
              />
            ) : (
              <View style={[styles.agenda, { backgroundColor: c.card }]}>
                {shown.items.map((i, index) => {
                  const bar =
                    i.source === "meetup" ? c.primary : i.source === "study" ? c.success : couleurJour(jourDeSemaine(shown.day), scheme);
                  return (
                    <SwipeRow key={i.id} trailing={swipeActions(i, shown.day)}>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`${i.title}, ${i.timeLabel}${i.skipped ? ", annulé cette fois-ci" : ""}`}
                      accessibilityHint="Modifier ou annuler cette fois-ci. Glisser vers la gauche pour plus d'actions."
                      onPress={() => onItem(i, shown.day)}
                      android_ripple={{ color: c.border }}
                      style={({ pressed }) => [
                        styles.item,
                        { backgroundColor: c.card },
                        index > 0 ? { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: c.border } : null,
                        { opacity: pressed && !ANDROID ? 0.5 : 1 },
                      ]}
                    >
                      <View style={styles.times}>
                        <Text style={[type.subhead, strong, styles.clock, { color: i.skipped ? c.muted : c.text }]}>
                          {formatClockFr(i.block.startMinute)}
                        </Text>
                        <Text style={[type.footnote, styles.clock, { color: c.muted }]}>{formatClockFr(i.block.endMinute)}</Text>
                      </View>
                      <View style={[styles.bar, { backgroundColor: bar, opacity: i.skipped ? 0.35 : 1 }]} />
                      <View style={styles.itemText}>
                        <Text
                          style={[type.headline, { color: i.skipped ? c.muted : c.text }, i.skipped ? { textDecorationLine: "line-through" } : null]}
                        >
                          {i.title}
                        </Text>
                        {i.skipped ? (
                          <Text style={[type.footnote, { color: c.muted }]}>Annulé cette fois-ci</Text>
                        ) : i.source && SOURCE_LABEL[i.source] ? (
                          <Badge>{SOURCE_LABEL[i.source]}</Badge>
                        ) : null}
                      </View>
                    </Pressable>
                    </SwipeRow>
                  );
                })}
              </View>
            )}
          </Section>
          </Swap>
        ) : null}

        <ListGroup footer="Importer un .ics, les calendriers abonnés et les disponibilités ponctuelles se gèrent sur le site.">
          <ListRow icon="study" iconColor={c.success} title="Étude" subtitle="Planifier mes séances avant un examen" onPress={() => router.push("/etude")} />
          <ListRow icon="external" title="Ouvrir l'horaire sur le site" onPress={openSite} chevron={false} />
        </ListGroup>
        {!native ? <Button label={`+ ${tb.newTitle}`} disabled={!data} onPress={addHere} /> : null}
      </Screen>
      {draft && data ? (
        <BlockSheet
          draft={draft}
          places={otherPlaces}
          homeName={homeName}
          today={today}
          onClose={() => setDraft(null)}
          onSaved={done}
          onDelete={removeBlock}
        />
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  week: { borderRadius: shape.card, paddingVertical: space.sm, paddingHorizontal: space.xs, gap: space.xs },
  weekBar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  weekTitle: { flex: 1, alignItems: "center", gap: 1 },
  strip: { flexDirection: "row" },
  day: { flex: 1, alignItems: "center", gap: 3, paddingVertical: space.xs, minHeight: 64 },
  dayNumber: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  dot: { width: 6, height: 6, borderRadius: 3 },
  agenda: { borderRadius: shape.card, overflow: "hidden" },
  item: { flexDirection: "row", alignItems: "stretch", gap: space.md, paddingHorizontal: space.lg, paddingVertical: space.md, minHeight: 60 },
  times: { width: 64, justifyContent: "center", gap: 1 },
  clock: { fontVariant: ["tabular-nums"] },
  bar: { width: 4, borderRadius: 2 },
  itemText: { flex: 1, minWidth: 0, justifyContent: "center", gap: 3 },
});
