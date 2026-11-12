/**
 * Formulaire « Proposer un moment » (feuille plein écran) : à partir d'une carte de
 * « Quand on peut se voir », ou libre. Mêmes règles et même fonction SQL que le site.
 */
import { formatInTimeZone } from "date-fns-tz";
import { useState } from "react";
import { Modal, ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Body, Button, Chip, ErrorText, Field, Heading, Label, Muted, Row } from "@/components/ui";
import { nextDays, type ProposeDraft, proposeMoment, type RepeatChoice, repeatOf, shiftStart } from "@/features/propose";
import { formatDuration } from "@/lib/i18n/format";
import { PLAN_DURATIONS } from "@/lib/plans/validation";
import { TIME_ZONE } from "@/lib/scheduling/time";
import { formatClockFr, parseClock } from "@/lib/scheduling/weeklyBlocks";
import { locale, t } from "@/services/i18n";
import { useAuthed } from "@/services/session";
import { space } from "@/theme/colors";
import { usePalette } from "@/theme/use-palette";

const tp = t.plans.propose;

export function ProposeSheet({
  draft,
  members,
  places,
  onClose,
  onSent,
}: {
  draft: ProposeDraft;
  members: { userId: string; displayName: string }[];
  /** Lieux favoris du groupe (et le lieu de la carte choisie). */
  places: { id: string; name: string }[];
  onClose: () => void;
  onSent: (message: string) => void;
}) {
  const { supabase, userId } = useAuthed();
  const c = usePalette();
  const [form, setForm] = useState<ProposeDraft>(draft);
  const [repeat, setRepeat] = useState<RepeatChoice>("none");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const today = formatInTimeZone(new Date(), TIME_ZONE, "yyyy-MM-dd");
  const days = nextDays(today, 14);
  if (!days.some((d) => d.day === form.date)) days.unshift({ day: form.date, label: form.date });
  const others = members.filter((m) => m.userId !== userId);
  const everyone = form.inviteeIds === null;
  const chosen = form.inviteeIds ?? [];
  const set = (patch: Partial<ProposeDraft>) => setForm((f) => ({ ...f, ...patch }));

  function toggle(id: string) {
    const next = chosen.includes(id) ? chosen.filter((x) => x !== id) : [...chosen, id];
    set({ inviteeIds: next });
  }

  async function send() {
    if (!everyone && chosen.length === 0) {
      setError(tp.pickSomeone);
      return;
    }
    setBusy(true);
    setError(null);
    const r = await proposeMoment(supabase, { ...form, repeat: repeatOf(repeat) }, new Date());
    setBusy(false);
    if (!r.ok) return setError(r.error);
    const series = repeat !== "none";
    onSent(everyone ? tp.sentAll(series) : tp.sentSome(series, chosen.length));
  }

  const startMin = parseClock(form.start) ?? 0;

  return (
    <Modal visible animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={{ flex: 1, backgroundColor: c.background }}>
        <ScrollView contentContainerStyle={{ padding: space.lg, gap: space.md }} keyboardShouldPersistTaps="handled">
          <Heading>{tp.title}</Heading>
          {form.fromSlot ? <Muted>{tp.slotFound(form.fromSlot)}</Muted> : null}

          <Field label={tp.what} placeholder={tp.whatPlaceholder} value={form.title} onChangeText={(v) => set({ title: v })} maxLength={80} />

          <Label>{tp.day}</Label>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: space.sm }}>
            {days.map((d) => (
              <Chip key={d.day} label={d.label} selected={form.date === d.day} onPress={() => set({ date: d.day })} />
            ))}
          </ScrollView>

          <Label>{tp.start}</Label>
          <Row>
            <Button label="− 1 h" variant="secondary" onPress={() => set({ start: shiftStart(form.start, -4) })} />
            <Button label="− 15" variant="secondary" onPress={() => set({ start: shiftStart(form.start, -1) })} />
            <View style={{ minWidth: 80, alignItems: "center" }}>
              <Body bold>{formatClockFr(startMin)}</Body>
            </View>
            <Button label="+ 15" variant="secondary" onPress={() => set({ start: shiftStart(form.start, 1) })} />
            <Button label="+ 1 h" variant="secondary" onPress={() => set({ start: shiftStart(form.start, 4) })} />
          </Row>

          <Label>{tp.duration}</Label>
          <Row>
            {[...new Set([form.durationMinutes, ...PLAN_DURATIONS.slice(0, 6)])]
              .sort((a, b) => a - b)
              .map((d) => (
                <Chip key={d} label={formatDuration(d, locale)} selected={form.durationMinutes === d} onPress={() => set({ durationMinutes: d })} />
              ))}
          </Row>

          <Label>{tp.repeat}</Label>
          <Row>
            {(["none", "day1", "week1"] as const).map((r) => (
              <Chip key={r} label={tp.repeatChoices[r]} selected={repeat === r} onPress={() => setRepeat(r)} />
            ))}
          </Row>

          <Label>{tp.where}</Label>
          <Row>
            {places.map((p) => (
              <Chip key={p.id} label={p.name} selected={form.placeId === p.id} onPress={() => set({ placeId: p.id })} />
            ))}
            <Chip label={tp.otherPlace} selected={form.placeId === null} onPress={() => set({ placeId: null })} />
          </Row>
          {form.placeId === null ? (
            <Field label={tp.freePlace} placeholder={tp.freePlacePlaceholder} value={form.location} onChangeText={(v) => set({ location: v })} maxLength={100} />
          ) : null}

          <Label>{tp.who}</Label>
          <Row>
            <Chip label={tp.wholeGroup} selected={everyone} onPress={() => set({ inviteeIds: null })} />
            <Chip label={tp.somePeople} selected={!everyone} onPress={() => set({ inviteeIds: others.map((m) => m.userId) })} />
          </Row>
          {!everyone ? (
            <Row>
              {others.map((m) => (
                <Chip key={m.userId} label={m.displayName} selected={chosen.includes(m.userId)} onPress={() => toggle(m.userId)} />
              ))}
            </Row>
          ) : null}
          <Muted>{tp.whoHint}</Muted>

          <ErrorText>{error}</ErrorText>
          <Button label={busy ? tp.sending : tp.send} busy={busy} onPress={() => void send()} />
          <Button label="Annuler" variant="secondary" disabled={busy} onPress={onClose} />
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}
