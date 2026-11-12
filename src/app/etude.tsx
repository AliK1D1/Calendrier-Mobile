import { formatInTimeZone } from "date-fns-tz";
import { router } from "expo-router";
import { useState } from "react";
import { Alert, ScrollView, View } from "react-native";

import { Toggle } from "@/components/toggle";

import { Badge, Body, Button, Card, Chip, ErrorText, Field, Heading, Label, Loading, Muted, Row, Screen } from "@/components/ui";
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
      {flash ? <Body bold>{flash}</Body> : null}
      <ErrorText>{actionError}</ErrorText>
      <ErrorText>{error}</ErrorText>
      {!data && !error ? <Loading /> : null}

      {data?.noHome ? (
        <Card>
          <Muted>{`${ts.view.noHomeBefore}${ts.view.noHomeLink}${ts.view.noHomeAfter}`}</Muted>
          <Button label={ts.view.noHomeLink} variant="secondary" onPress={() => router.push("/lieux")} />
        </Card>
      ) : null}

      {data && data.conflicts.length > 0 ? (
        <Card>
          <Body bold>{ts.conflict.title(data.conflicts.length)}</Body>
          <Muted>{ts.conflict.body(data.conflicts.length)}</Muted>
          {data.conflicts.map((x) => <Muted key={x.id}>{`• ${x.title} — ${x.label}`}</Muted>)}
          <Button label={busy ? ts.conflict.computing : ts.conflict.replan} busy={busy} disabled={busy} onPress={() => void act(replanConflicts(supabase, userId, locale), showPlan)} />
        </Card>
      ) : null}

      {data && !data.noHome ? (
        <Card>
          <Body bold>{ts.view.planTitle}</Body>
          <Muted>Rien n&apos;est ajouté à ton horaire avant que tu acceptes.</Muted>
          <Button label={busy && !plan ? "Calcul…" : ts.view.planTitle} busy={busy} disabled={busy || upcoming.length === 0} onPress={() => void act(planStudy(supabase, userId, locale), showPlan)} />
          {upcoming.length === 0 ? <Muted>{ts.view.addFirst}</Muted> : null}
        </Card>
      ) : null}

      {plan ? (
        <Card style={{ borderColor: c.primary, borderWidth: 2 }}>
          <Body bold>{plan.mode === "plan" ? ts.panel.titlePlan : ts.panel.titleReplan}</Body>
          {plan.warnings.map((w) => <Muted key={w}>{w}</Muted>)}
          {plan.sessions.length === 0 ? <Muted>{ts.panel.none}</Muted> : null}
          {plan.sessions.map((s) => (
            <Row key={s.key}>
              <Toggle
                value={chosen.includes(s.key)}
                onValueChange={(v) => setChosen((list) => (v ? [...list, s.key] : list.filter((k) => k !== s.key)))}
                accessibilityLabel={s.title}
              />
              <View style={{ flex: 1 }}>
                <Body>{s.title}</Body>
                <Muted>{`${s.label} · ${s.placeName}`}</Muted>
              </View>
            </Row>
          ))}
          {plan.sessions.length > 0 ? (
            <Button label={`${ts.panel.accept} (${chosen.length})`} busy={busy} disabled={busy || chosen.length === 0} onPress={accept} />
          ) : null}
          <Button label={ts.panel.refuseAll} variant="secondary" disabled={busy} onPress={() => setPlan(null)} />
        </Card>
      ) : null}

      <Heading>{ts.view.upcoming}</Heading>
      {data && upcoming.length === 0 ? <Muted>{ts.view.noUpcoming}</Muted> : null}
      {upcoming.map((d) => (
        <Card key={d.id}>
          <Row>
            <Badge>{ts.kinds[d.kind]}</Badge>
            <Badge>{ts.difficulty[d.difficulty]}</Badge>
          </Row>
          <Body bold>{d.course}</Body>
          <Muted>{d.dueLabel}</Muted>
          <Muted>{`${ts.view.toPlan(formatDuration(d.requiredMinutes, locale))}${d.estimated ? ts.view.yourEstimate : ""} · ${ts.view.inSchedule(formatDuration(d.acceptedMinutes, locale))}`}</Muted>
          {d.sessions.filter((s) => !s.past).map((s) => (
            <View key={s.id} style={{ gap: space.xs, paddingVertical: space.xs }}>
              <Body>{`${s.label} · ${s.placeName}`}</Body>
              <Row>
                <Chip label={ts.view.movable} selected={s.movable} onPress={() => void act(setMovable(supabase, userId, s.id, !s.movable), () => { setFlash(s.movable ? ts.view.nowFixed : ts.view.nowMovable); void reload(); })} />
                <Button label={ts.view.remove} variant="secondary" disabled={busy} onPress={() => void act(removeSession(supabase, userId, s.id), () => { setFlash(ts.view.removed); void reload(); })} />
              </Row>
            </View>
          ))}
          <Button
            label={ts.view.delete}
            variant="secondary"
            disabled={busy}
            onPress={() =>
              Alert.alert(ts.view.deleteConfirm(d.course, d.sessions.length), undefined, [
                { text: "Garder", style: "cancel" },
                { text: ts.view.delete, style: "destructive", onPress: () => void act(deleteDeadline(supabase, userId, d.id), () => { setFlash(ts.view.deleted); void reload(); }) },
              ])
            }
          />
        </Card>
      ))}

      <Heading>{ts.view.addTitle}</Heading>
      <Card>
        <Label>{ts.form.type}</Label>
        <Row>
          <Chip label={ts.form.exam} selected={kind === "exam"} onPress={() => setKind("exam")} />
          <Chip label={ts.form.assignment} selected={kind === "assignment"} onPress={() => setKind("assignment")} />
        </Row>
        <Field label={ts.form.course} placeholder={ts.form.coursePlaceholder} value={course} onChangeText={setCourse} maxLength={80} />
        <Label>{kind === "exam" ? ts.form.examDate : ts.form.dueDate}</Label>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: space.sm }}>
          {nextDays(today, 60).map((x) => (
            <Chip key={x.day} label={x.label} selected={date === x.day} onPress={() => setDate(x.day)} />
          ))}
        </ScrollView>
        <Label>{ts.form.time}</Label>
        <Row>
          <Button label="− 1 h" variant="secondary" onPress={() => setTime(shiftClock(time, -60, 0, 23 * 60 + 45))} />
          <Button label="− 15" variant="secondary" onPress={() => setTime(shiftClock(time, -15, 0, 23 * 60 + 45))} />
          <View style={{ minWidth: 76, alignItems: "center" }}>
            <Body bold>{formatClockFr(parseClock(time) ?? 0)}</Body>
          </View>
          <Button label="+ 15" variant="secondary" onPress={() => setTime(shiftClock(time, 15, 0, 23 * 60 + 45))} />
          <Button label="+ 1 h" variant="secondary" onPress={() => setTime(shiftClock(time, 60, 0, 23 * 60 + 45))} />
        </Row>
        <Field label={ts.form.hours} placeholder={ts.form.hoursPlaceholder} hint={ts.form.hoursHelp} value={hours} onChangeText={setHours} keyboardType="decimal-pad" />
        <Label>{ts.form.difficulty}</Label>
        <Row>
          {([1, 2, 3] as const).map((n) => (
            <Chip key={n} label={ts.difficulty[n]} selected={difficulty === n} onPress={() => setDifficulty(n)} />
          ))}
        </Row>
        <Button label={busy ? ts.form.saving : ts.form.add} busy={busy} disabled={busy || !course.trim()} onPress={add} />
      </Card>
    </Screen>
  );
}
