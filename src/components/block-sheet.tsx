/**
 * Formulaire « Nouveau bloc » / « Modifier le bloc » (feuille plein écran). Mêmes règles que
 * le site (validateBlockForm) ; heures par pas de 15 min, dates par semaine.
 */
import { useState } from "react";
import { Alert, Modal, ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Body, Button, Chip, ErrorText, Field, Heading, Label, Muted, Row } from "@/components/ui";
import { addBlocks, type BlockDraft, deleteBlock, shiftClock, shiftWeeks, updateBlock } from "@/features/blocks";
import { nextDays } from "@/features/propose";
import { dayLabelFr } from "@/features/agenda";
import { formatClockFr, parseClock, WEEKDAY_SHORT, WEEKDAYS, type Weekday } from "@/lib/scheduling/weeklyBlocks";
import { t } from "@/services/i18n";
import { useAuthed } from "@/services/session";
import { space } from "@/theme/colors";
import { usePalette } from "@/theme/use-palette";

const tb = t.schedule.block;

function Stepper({ label, value, onShift }: { label: string; value: string; onShift: (minutes: number) => void }) {
  return (
    <View style={{ gap: space.xs }}>
      <Label>{label}</Label>
      <Row>
        <Button label="− 1 h" variant="secondary" onPress={() => onShift(-60)} />
        <Button label="− 15" variant="secondary" onPress={() => onShift(-15)} />
        <View style={{ minWidth: 76, alignItems: "center" }}>
          <Body bold>{formatClockFr(parseClock(value) ?? 0)}</Body>
        </View>
        <Button label="+ 15" variant="secondary" onPress={() => onShift(15)} />
        <Button label="+ 1 h" variant="secondary" onPress={() => onShift(60)} />
      </Row>
    </View>
  );
}

function DateStepper({ label, value, onChange }: { label: string; value: string; onChange: (day: string) => void }) {
  return (
    <View style={{ gap: space.xs }}>
      <Label>{label}</Label>
      <Row>
        <Button label="− 1 sem." variant="secondary" onPress={() => onChange(shiftWeeks(value, -1))} />
        <View style={{ flex: 1, alignItems: "center" }}>
          <Body bold>{dayLabelFr(value)}</Body>
        </View>
        <Button label="+ 1 sem." variant="secondary" onPress={() => onChange(shiftWeeks(value, 1))} />
      </Row>
    </View>
  );
}

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
  const c = usePalette();
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
    <Modal visible animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={{ flex: 1, backgroundColor: c.background }}>
        <ScrollView contentContainerStyle={{ padding: space.lg, gap: space.md }} keyboardShouldPersistTaps="handled">
          <Heading>{editing ? tb.editTitle : tb.newTitle}</Heading>
          <Field label={tb.title} placeholder={tb.titlePlaceholder} value={d.title} onChangeText={(v) => set({ title: v })} maxLength={100} />

          <Label>{tb.place}</Label>
          <Row>
            <Chip label={homeName ? tb.homeNamed(homeName) : tb.home} selected={d.placeId === null} onPress={() => set({ placeId: null })} />
            {places.map((p) => (
              <Chip key={p.id} label={p.name} selected={d.placeId === p.id} onPress={() => set({ placeId: p.id })} />
            ))}
          </Row>

          <Stepper label={tb.start} value={d.start} onShift={(m) => set({ start: shiftClock(d.start, m, 0, 24 * 60 - 15) })} />
          <Stepper label={tb.end} value={d.end} onShift={(m) => set({ end: shiftClock(d.end, m, 15, 24 * 60) })} />

          <Label>{tb.repeat}</Label>
          <Row>
            {kinds.map((k) => (
              <Chip key={k} label={tb.kinds[k]} selected={d.kind === k} onPress={() => set({ kind: k })} />
            ))}
          </Row>
          {d.kind === "custom" ? (
            <Muted>Cette répétition personnalisée se modifie sur le site. Ici, tu peux changer le titre, le lieu et les heures.</Muted>
          ) : null}

          {d.kind === "once" ? (
            <>
              <Label>{tb.day}</Label>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: space.sm }}>
                {days.map((x) => (
                  <Chip key={x.day} label={x.label} selected={d.date === x.day} onPress={() => set({ date: x.day })} />
                ))}
              </ScrollView>
            </>
          ) : null}

          {d.kind === "weekly" ? (
            <>
              <Label>{editing ? tb.days : tb.daysAll}</Label>
              <Row>
                {WEEKDAYS.map((w) => (
                  <Chip key={w} label={WEEKDAY_SHORT[w]} selected={d.weekdays.includes(w)} onPress={() => toggleDay(w)} />
                ))}
              </Row>
              <DateStepper label={tb.sessionStart} value={d.sessionStart} onChange={(v) => set({ sessionStart: v })} />
              <DateStepper label={tb.sessionEnd} value={d.sessionEnd} onChange={(v) => set({ sessionEnd: v })} />
              <Muted>{tb.sessionHint}</Muted>
            </>
          ) : null}

          <ErrorText>{error}</ErrorText>
          <Button label="Enregistrer" busy={busy} disabled={busy} onPress={() => void save()} />
          {editing ? <Button label="Supprimer le bloc" variant="danger" disabled={busy} onPress={remove} /> : null}
          <Button label="Annuler" variant="secondary" disabled={busy} onPress={onClose} />
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}
