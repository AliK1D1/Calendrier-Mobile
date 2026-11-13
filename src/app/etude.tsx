import { formatInTimeZone } from "date-fns-tz";
import { router } from "expo-router";
import { useState } from "react";
import { Alert, ScrollView, StyleSheet, View } from "react-native";

import { Toggle } from "@/components/toggle";

import { Appear, Reveal } from "@/components/motion";
import { CLOCK_STEPS, Stepper } from "@/components/steppers";
import { Badge, Body, Button, Card, Chip, Divider, EmptyState, ErrorText, Field, Fill, Footnote, Heading, IconButton, Label, Loading, Meta, Muted, Notice, Row, Screen, Section, Segmented } from "@/components/ui";
import { shiftClock } from "@/features/blocks";
import { nextDays } from "@/features/propose";
import {
  acceptSessions,
  addDeadline,
  deleteDeadline,
  loadOverview,
  planStudy,
  removeSession,
  replanConflicts,
  setMovable,
} from "@/features/study";
import { formatDuration } from "@/lib/i18n/format";
import type { StudyPlanView } from "@/lib/study/service";
import { TIME_ZONE } from "@/lib/scheduling/time";
import { formatClockFr, parseClock } from "@/lib/scheduling/weeklyBlocks";
import { locale, t } from "@/services/i18n";
import { useAuthed } from "@/services/session";
import { useLoad } from "@/services/use-load";
import { space } from "@/theme/colors";
import { usePalette } from "@/theme/use-palette";

const ts = t.study;

/** Étude : examens et travaux, séances proposées dans mes vrais moments libres. */
export default function Etude() {
  const { supabase, userId } = useAuthed();
  const c = usePalette();
  const { data, error, reload } = useLoad(async () => {
    const r = await loadOverview(supabase, userId, locale);
    if (!r.ok) throw new Error(r.error);
    return r.value;
  }, userId);
  const today = formatInTimeZone(new Date(), TIME_ZONE, "yyyy-MM-dd");

  const [plan, setPlan] = useState<StudyPlanView | null>(null);
  const [chosen, setChosen] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [flash, setFlash] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // Formulaire « Ajouter un examen ou un travail ».
  const [kind, setKind] = useState<"exam" | "assignment">("exam");
  const [course, setCourse] = useState("");
  const [date, setDate] = useState(nextDays(today, 8)[7].day);
  const [time, setTime] = useState("09:00");
  const [hours, setHours] = useState("");
  const [difficulty, setDifficulty] = useState<1 | 2 | 3>(2);

  async function act<T extends { ok: true }>(p: Promise<T | { ok: false; error: string }>, onOk: (r: T) => void) {
    setBusy(true);
    setActionError(null);
    try {
      const r = await p;
      if (r.ok) onOk(r);
      else setActionError(r.error);
    } catch (e) {
      console.error(e);
      setActionError("Le calcul n'a pas fonctionné. Réessaie.");
    } finally {
      setBusy(false);
    }
  }

  function showPlan(r: { ok: true; value: StudyPlanView }) {
    setPlan(r.value);
    setChosen(r.value.sessions.map((s) => s.key));
    setFlash(null);
  }

  function accept() {
    if (!plan) return;
    const list = plan.sessions.filter((s) => chosen.includes(s.key));
    if (list.length === 0) return;
    void act<{ ok: true; count: number }>(acceptSessions(supabase, userId, list, locale), (r) => {
      setPlan(null);
      setFlash(`${r.count} séance${r.count > 1 ? "s" : ""} ajoutée${r.count > 1 ? "s" : ""} à ton horaire.`);
      void reload();
    });
  }

  function add() {
    void act(addDeadline(supabase, userId, { kind, course, date, time, hours, difficulty }), () => {
      setFlash(ts.view.added(kind === "exam" ? ts.kinds.exam : ts.kinds.assignment));
      setCourse("");
      setHours("");
      void reload();
    });
  }

  const upcoming = data?.deadlines.filter((d) => !d.past) ?? [];

  return (
    <Screen edges={[]} subtitle={ts.intro}>
      <Notice>{flash}</Notice>
      <ErrorText>{actionError}</ErrorText>
      <ErrorText>{error}</ErrorText>
      {!data && !error ? <Loading /> : null}

      {data?.noHome ? (
        <Card tone="accent">
          <Meta icon="home" color={c.text}>{`${ts.view.noHomeBefore}${ts.view.noHomeLink}${ts.view.noHomeAfter}`}</Meta>
          <Button size="small" label={ts.view.noHomeLink} onPress={() => router.push("/lieux")} />
        </Card>
      ) : null}

      {data && data.conflicts.length > 0 ? (
        <Card>
          <Meta icon="alert" color={c.warning}>{ts.conflict.title(data.conflicts.length)}</Meta>
          <Muted>{ts.conflict.body(data.conflicts.length)}</Muted>
          {data.conflicts.map((x) => <Muted key={x.id}>{`• ${x.title} — ${x.label}`}</Muted>)}
          <Button label={busy ? ts.conflict.computing : ts.conflict.replan} busy={busy} disabled={busy} onPress={() => void act(replanConflicts(supabase, userId, locale), showPlan)} />
        </Card>
      ) : null}

      {data && !data.noHome && !plan ? (
        <Card>
          <Body bold>{ts.view.planTitle}</Body>
          <Muted>
            {upcoming.length === 0 ? ts.view.addFirst : "Rien n'est ajouté à ton horaire avant que tu acceptes."}
          </Muted>
          <Button icon="sparkles" label={busy ? "Calcul…" : ts.view.planTitle} busy={busy} disabled={busy || upcoming.length === 0} onPress={() => void act(planStudy(supabase, userId, locale), showPlan)} />
        </Card>
      ) : null}

      {plan ? (
        <Reveal>
        <Card style={{ borderColor: c.primary, borderWidth: 2 }}>
          <Body bold>{plan.mode === "plan" ? ts.panel.titlePlan : ts.panel.titleReplan}</Body>
          {plan.warnings.map((w) => <Meta key={w} icon="alert" color={c.warning}>{w}</Meta>)}
          {plan.sessions.length === 0 ? <Muted>{ts.panel.none}</Muted> : null}
          {plan.sessions.map((s, i) => (
            <View key={s.key} style={{ gap: space.sm }}>
              {i > 0 ? <Divider /> : null}
              <Row nowrap gap={space.md}>
                <Fill>
                  <Body>{s.title}</Body>
                  <Muted>{`${s.label} · ${s.placeName}`}</Muted>
                </Fill>
                <Toggle
                  value={chosen.includes(s.key)}
                  onValueChange={(v) => setChosen((list) => (v ? [...list, s.key] : list.filter((k) => k !== s.key)))}
                  accessibilityLabel={s.title}
                />
              </Row>
            </View>
          ))}
          {plan.sessions.length > 0 ? (
            <Button icon="check" label={`${ts.panel.accept} (${chosen.length})`} busy={busy} disabled={busy || chosen.length === 0} onPress={accept} />
          ) : null}
          <Button label={ts.panel.refuseAll} variant="plain" size="small" disabled={busy} onPress={() => setPlan(null)} />
        </Card>
        </Reveal>
      ) : null}

      <Section>
        <Heading>{ts.view.upcoming}</Heading>
        {data && upcoming.length === 0 ? <EmptyState icon="study" title={ts.view.noUpcoming} /> : null}
        {upcoming.map((d, i) => {
          const sessions = d.sessions.filter((s) => !s.past);
          return (
            <Appear key={d.id} index={i}>
            <Card>
              <Row>
                <Badge tone="primary">{ts.kinds[d.kind]}</Badge>
                <Badge>{ts.difficulty[d.difficulty]}</Badge>
              </Row>
              <View style={{ gap: 3 }}>
                <Body bold>{d.course}</Body>
                <Meta icon="calendar">{d.dueLabel}</Meta>
                <Meta icon="clock">
                  {`${ts.view.toPlan(formatDuration(d.requiredMinutes, locale))}${d.estimated ? ts.view.yourEstimate : ""} · ${ts.view.inSchedule(formatDuration(d.acceptedMinutes, locale))}`}
                </Meta>
              </View>
              {sessions.map((s) => (
                <View key={s.id} style={{ gap: space.sm }}>
                  <Divider />
                  <Row nowrap gap={space.sm}>
                    <Fill>
                      <Body>{s.label}</Body>
                      <Muted>{s.placeName}</Muted>
                    </Fill>
                    <Chip label={ts.view.movable} selected={s.movable} onPress={() => void act(setMovable(supabase, userId, s.id, !s.movable), () => { setFlash(s.movable ? ts.view.nowFixed : ts.view.nowMovable); void reload(); })} />
                    <IconButton icon="trash" label={ts.view.remove} disabled={busy} onPress={() => void act(removeSession(supabase, userId, s.id), () => { setFlash(ts.view.removed); void reload(); })} />
                  </Row>
                </View>
              ))}
              <Divider />
              <Button
                size="small"
                variant="danger"
                label={ts.view.delete}
                disabled={busy}
                onPress={() =>
                  Alert.alert(ts.view.deleteConfirm(d.course, d.sessions.length), undefined, [
                    { text: "Garder", style: "cancel" },
                    { text: ts.view.delete, style: "destructive", onPress: () => void act(deleteDeadline(supabase, userId, d.id), () => { setFlash(ts.view.deleted); void reload(); }) },
                  ])
                }
              />
            </Card>
            </Appear>
          );
        })}
      </Section>

      <Section>
        <Heading>{ts.view.addTitle}</Heading>
        <Card style={styles.form}>
          <Segmented
            accessibilityLabel={ts.form.type}
            options={[{ value: "exam", label: ts.form.exam }, { value: "assignment", label: ts.form.assignment }]}
            value={kind}
            onChange={setKind}
          />
          <Field label={ts.form.course} placeholder={ts.form.coursePlaceholder} value={course} onChangeText={setCourse} maxLength={80} />
          <View style={{ gap: space.sm }}>
            <Label>{kind === "exam" ? ts.form.examDate : ts.form.dueDate}</Label>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: space.sm }}>
              {nextDays(today, 60).map((x) => (
                <Chip key={x.day} label={x.label} selected={date === x.day} onPress={() => setDate(x.day)} />
              ))}
            </ScrollView>
          </View>
          <Stepper label={ts.form.time} value={formatClockFr(parseClock(time) ?? 0)} steps={CLOCK_STEPS} onShift={(m) => setTime(shiftClock(time, m, 0, 23 * 60 + 45))} />
          <Field label={ts.form.hours} placeholder={ts.form.hoursPlaceholder} hint={ts.form.hoursHelp} value={hours} onChangeText={setHours} keyboardType="decimal-pad" />
          <View style={{ gap: space.sm }}>
            <Label>{ts.form.difficulty}</Label>
            <Segmented
              accessibilityLabel={ts.form.difficulty}
              options={([1, 2, 3] as const).map((n) => ({ value: String(n) as "1" | "2" | "3", label: ts.difficulty[n] }))}
              value={String(difficulty) as "1" | "2" | "3"}
              onChange={(v) => setDifficulty(Number(v) as 1 | 2 | 3)}
            />
          </View>
          <Button label={busy ? ts.form.saving : ts.form.add} busy={busy} disabled={busy || !course.trim()} onPress={add} />
          {!course.trim() ? <Footnote center>Écris le nom du cours pour pouvoir l&apos;ajouter.</Footnote> : null}
        </Card>
      </Section>
    </Screen>
  );
}

const styles = StyleSheet.create({
  form: { gap: space.lg },
});
