/**
 * Formulaire « Nouveau bloc » / « Modifier le bloc » (feuille plein écran). Mêmes règles que
 * le site (validateBlockForm) ; heures par pas de 15 min, dates par semaine.
 */
import { useState } from "react";
import { Alert, ScrollView, View } from "react-native";

import { Sheet } from "@/components/sheet";
import { CLOCK_STEPS, Stepper } from "@/components/steppers";
import { Button, Chip, ErrorText, Field, Footnote, Label, Row, Segmented } from "@/components/ui";
import { addBlocks, type BlockDraft, deleteBlock, shiftClock, shiftWeeks, updateBlock } from "@/features/blocks";
import { nextDays } from "@/features/propose";
import { dayLabelFr } from "@/features/agenda";
import { formatClockFr, parseClock, WEEKDAY_SHORT, WEEKDAYS, type Weekday } from "@/lib/scheduling/weeklyBlocks";
import { t } from "@/services/i18n";
import { useAuthed } from "@/services/session";
import { space } from "@/theme/colors";

const tb = t.schedule.block;

/** Début et fin de session : par semaine. */
const WEEK_STEPS = [{ label: "1 sem.", by: 1 }] as const;

export function BlockSheet({
  draft,
  places,
  homeName,
  today,
  onClose,
  onSaved,
}: {
  draft: BlockDraft;
  /** Mes lieux (sans la maison, qui est « nul »). */
  places: { id: string; name: string }[];
  homeName: string | null;
  today: string;
  onClose: () => void;
  onSaved: (message: string) => void;
}) {
  const { supabase, userId } = useAuthed();
  const [d, setD] = useState<BlockDraft>(draft);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const editing = d.id !== undefined;
  const set = (patch: Partial<BlockDraft>) => setD((prev) => ({ ...prev, ...patch }));
  const days = nextDays(today, 21);
  if (!days.some((x) => x.day === d.date)) days.unshift({ day: d.date, label: dayLabelFr(d.date) });

  function toggleDay(w: Weekday) {
    if (editing) return set({ weekdays: [w] });
    const list = d.weekdays.includes(w) ? d.weekdays.filter((x) => x !== w) : [...d.weekdays, w];
    set({ weekdays: list.sort() });
  }

  async function save() {
    setBusy(true);
    setError(null);
    const r = editing ? await updateBlock(supabase, userId, d) : await addBlocks(supabase, userId, d);
    setBusy(false);
    if (!r.ok) return setError(r.error);
    const title = d.title.trim();
    onSaved(editing ? tb.edited(title) : tb.added(title, d.kind === "weekly" ? d.weekdays.length : 1));
  }

  function remove() {
    if (!d.id) return;
    const id = d.id;
    Alert.alert(tb.confirmDelete(d.kind, d.title), undefined, [
      { text: "Garder", style: "cancel" },
      {
        text: "Supprimer",
        style: "destructive",
        onPress: async () => {
          setBusy(true);
          const r = await deleteBlock(supabase, userId, id);
          setBusy(false);
          if (!r.ok) setError(r.error);
          else onSaved(tb.deleted(d.title));
        },
      },
    ]);
  }

  const kinds = d.kind === "custom" ? (["weekly", "once", "custom"] as const) : (["weekly", "once"] as const);

  return (
    <Sheet
      title={editing ? tb.editTitle : tb.newTitle}
      confirmLabel="Enregistrer"
      busy={busy}
      onConfirm={() => void save()}
      onClose={onClose}
    >
      <ErrorText>{error}</ErrorText>
      <Field label={tb.title} placeholder={tb.titlePlaceholder} value={d.title} onChangeText={(v) => set({ title: v })} maxLength={100} />

      <View style={{ gap: space.sm }}>
        <Label>{tb.place}</Label>
        <Row>
          <Chip label={homeName ? tb.homeNamed(homeName) : tb.home} selected={d.placeId === null} onPress={() => set({ placeId: null })} />
          {places.map((p) => (
            <Chip key={p.id} label={p.name} selected={d.placeId === p.id} onPress={() => set({ placeId: p.id })} />
          ))}
        </Row>
      </View>

      <Stepper label={tb.start} value={formatClockFr(parseClock(d.start) ?? 0)} steps={CLOCK_STEPS} onShift={(m) => set({ start: shiftClock(d.start, m, 0, 24 * 60 - 15) })} />
      <Stepper label={tb.end} value={formatClockFr(parseClock(d.end) ?? 0)} steps={CLOCK_STEPS} onShift={(m) => set({ end: shiftClock(d.end, m, 15, 24 * 60) })} />

      <View style={{ gap: space.sm }}>
        <Label>{tb.repeat}</Label>
        <Segmented
          accessibilityLabel={tb.repeat}
          options={kinds.map((k) => ({ value: k, label: tb.kinds[k] }))}
          value={d.kind}
          onChange={(k) => set({ kind: k })}
        />
        {d.kind === "custom" ? (
          <Footnote>Cette répétition personnalisée se modifie sur le site. Ici, tu peux changer le titre, le lieu et les heures.</Footnote>
        ) : null}
      </View>

      {d.kind === "once" ? (
        <View style={{ gap: space.sm }}>
          <Label>{tb.day}</Label>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: space.sm }}>
            {days.map((x) => (
              <Chip key={x.day} label={x.label} selected={d.date === x.day} onPress={() => set({ date: x.day })} />
            ))}
          </ScrollView>
        </View>
      ) : null}

      {d.kind === "weekly" ? (
        <>
          <View style={{ gap: space.sm }}>
            <Label>{editing ? tb.days : tb.daysAll}</Label>
            <Row>
              {WEEKDAYS.map((w) => (
                <Chip key={w} label={WEEKDAY_SHORT[w]} selected={d.weekdays.includes(w)} onPress={() => toggleDay(w)} />
              ))}
            </Row>
          </View>
          <Stepper label={tb.sessionStart} value={dayLabelFr(d.sessionStart)} steps={WEEK_STEPS} onShift={(n) => set({ sessionStart: shiftWeeks(d.sessionStart, n) })} />
          <View style={{ gap: space.sm }}>
            <Stepper label={tb.sessionEnd} value={dayLabelFr(d.sessionEnd)} steps={WEEK_STEPS} onShift={(n) => set({ sessionEnd: shiftWeeks(d.sessionEnd, n) })} />
            <Footnote>{tb.sessionHint}</Footnote>
          </View>
        </>
      ) : null}

      {editing ? <Button icon="trash" label="Supprimer le bloc" variant="danger" disabled={busy} onPress={remove} /> : null}
    </Sheet>
  );
}
