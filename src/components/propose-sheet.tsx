/**
 * Formulaire « Proposer un moment » (feuille plein écran) : à partir d'une carte de
 * « Quand on peut se voir », ou libre. Mêmes règles et même fonction SQL que le site.
 */
import { formatInTimeZone } from "date-fns-tz";
import { useState } from "react";
import { ScrollView, View } from "react-native";

import { Sheet } from "@/components/sheet";
import { CLOCK_STEPS, Stepper } from "@/components/steppers";
import { Chip, ErrorText, Field, Footnote, Label, Notice, Row, Segmented } from "@/components/ui";
import { nextDays, type ProposeDraft, proposeMoment, type RepeatChoice, repeatOf, shiftStart } from "@/features/propose";
import { formatDuration } from "@/lib/i18n/format";
import { PLAN_DURATIONS } from "@/lib/plans/validation";
import { TIME_ZONE } from "@/lib/scheduling/time";
import { formatClockFr, parseClock } from "@/lib/scheduling/weeklyBlocks";
import { locale, t } from "@/services/i18n";
import { useAuthed } from "@/services/session";
import { space } from "@/theme/colors";

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
    <Sheet title={tp.title} confirmLabel={busy ? tp.sending : tp.send} busy={busy} onConfirm={() => void send()} onClose={onClose}>
      {form.fromSlot ? <Notice tone="info">{tp.slotFound(form.fromSlot)}</Notice> : null}
      <ErrorText>{error}</ErrorText>

      <Field label={tp.what} placeholder={tp.whatPlaceholder} value={form.title} onChangeText={(v) => set({ title: v })} maxLength={80} />

      <View style={{ gap: space.sm }}>
        <Label>{tp.day}</Label>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: space.sm }}>
          {days.map((d) => (
            <Chip key={d.day} label={d.label} selected={form.date === d.day} onPress={() => set({ date: d.day })} />
          ))}
        </ScrollView>
      </View>

      <Stepper
        label={tp.start}
        value={formatClockFr(startMin)}
        steps={CLOCK_STEPS}
        onShift={(by) => set({ start: shiftStart(form.start, by / 15) })}
      />

      <View style={{ gap: space.sm }}>
        <Label>{tp.duration}</Label>
        <Row>
          {[...new Set([form.durationMinutes, ...PLAN_DURATIONS.slice(0, 6)])]
            .sort((a, b) => a - b)
            .map((d) => (
              <Chip key={d} label={formatDuration(d, locale)} selected={form.durationMinutes === d} onPress={() => set({ durationMinutes: d })} />
            ))}
        </Row>
      </View>

      <View style={{ gap: space.sm }}>
        <Label>{tp.repeat}</Label>
        <Row>
          {(["none", "day1", "week1"] as const).map((r) => (
            <Chip key={r} label={tp.repeatChoices[r]} selected={repeat === r} onPress={() => setRepeat(r)} />
          ))}
        </Row>
      </View>

      <View style={{ gap: space.sm }}>
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
      </View>

      <View style={{ gap: space.sm }}>
        <Label>{tp.who}</Label>
        <Segmented
          accessibilityLabel={tp.who}
          options={[{ value: "all", label: tp.wholeGroup }, { value: "some", label: tp.somePeople }]}
          value={everyone ? "all" : "some"}
          onChange={(v) => set({ inviteeIds: v === "all" ? null : others.map((m) => m.userId) })}
        />
        {!everyone ? (
          <Row>
            {others.map((m) => (
              <Chip key={m.userId} label={m.displayName} selected={chosen.includes(m.userId)} onPress={() => toggle(m.userId)} />
            ))}
          </Row>
        ) : null}
        <Footnote>{tp.whoHint}</Footnote>
      </View>
    </Sheet>
  );
}
