/**
 * « Quand on peut se voir » sur le téléphone : même calcul que le site (`searchGroupMeetups`,
 * fonctions pures copiées), lu avec la session de la personne connectée (RLS). Trajets
 * estimés (distance × détour) : les vraies durées par API restent sur le serveur du site.
 */
import { useState } from "react";
import { View } from "react-native";

import { DateTile } from "@/components/date-tile";
import { Appear } from "@/components/motion";
import { Body, Button, Card, Chip, ErrorText, Fill, Footnote, Heading, Label, Meta, Muted, Notice, Row, Section, Segmented } from "@/components/ui";
import { dayOfInstant } from "@/features/display";
import { formatDuration } from "@/lib/i18n/format";
import {
  MEETUP_DURATIONS,
  type MeetupSearchView,
  type ProposalView,
  searchGroupMeetups,
  validateMeetupSearch,
} from "@/lib/meetups/search";
import { supabaseMeetupStore } from "@/lib/meetups/supabaseStore";
import { MEETUP_PERIODS, type MeetupPeriod } from "@/lib/scheduling/period";
import { EstimatedTravelProvider } from "@/lib/scheduling/travel";
import { locale, t } from "@/services/i18n";
import { useAuthed } from "@/services/session";
import { space } from "@/theme/colors";

const tm = t.meetups;
const travel = new EstimatedTravelProvider();

/** Propositions montrées avant « Voir les N propositions ». */
const FIRST_CARDS = 5;

export function MeetupFinder({
  groupId,
  members,
  onPropose,
}: {
  groupId: string;
  members: { userId: string; displayName: string }[];
  onPropose: (p: ProposalView, participantIds: string[]) => void;
}) {
  const { supabase, userId } = useAuthed();
  const [chosen, setChosen] = useState<string[]>(() => members.map((m) => m.userId));
  const [period, setPeriod] = useState<MeetupPeriod>("this-week");
  const [duration, setDuration] = useState<number>(60);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<MeetupSearchView | null>(null);
  const [showAll, setShowAll] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  function toggle(id: string) {
    setChosen((list) => (list.includes(id) ? list.filter((x) => x !== id) : [...list, id]));
  }

  async function search(durationMinutes = duration, label: string | null = null) {
    const input = validateMeetupSearch({
      groupId,
      participantIds: chosen,
      period,
      durationMinutes,
      bufferMinutes: 5,
    });
    if (!input.ok) {
      setError(input.error);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const r = await searchGroupMeetups(supabaseMeetupStore(supabase), input.value, {
        userId,
        now: new Date(),
        travel,
        locale,
      });
      if (!r.ok) setError(r.error);
      else {
        setResult(r.value);
        setShowAll(false);
        setNote(label);
      }
    } catch (e) {
      console.error("Moments :", e);
      setError("Le calcul n'a pas fonctionné. Réessaie.");
    } finally {
      setBusy(false);
    }
  }

  const cards = result ? (showAll ? result.inPerson : result.inPerson.slice(0, FIRST_CARDS)) : [];

  return (
    <View style={{ gap: space.md }}>
      <Card>
        <Muted>{tm.help}</Muted>
        <View style={{ gap: space.sm }}>
          <Label>{tm.who}</Label>
          <Row>
            {members.map((m) => (
              <Chip
                key={m.userId}
                label={m.userId === userId ? `${m.displayName}${tm.you}` : m.displayName}
                selected={chosen.includes(m.userId)}
                onPress={() => toggle(m.userId)}
              />
            ))}
          </Row>
        </View>
        <View style={{ gap: space.sm }}>
          <Label>{tm.period}</Label>
          <Segmented
            accessibilityLabel={tm.period}
            options={MEETUP_PERIODS.map((p) => ({ value: p, label: tm.periods[p] }))}
            value={period}
            onChange={setPeriod}
          />
        </View>
        <View style={{ gap: space.sm }}>
          <Label>{tm.atLeast}</Label>
          <Row>
            {MEETUP_DURATIONS.map((d) => (
              <Chip key={d} label={formatDuration(d, locale)} selected={duration === d} onPress={() => setDuration(d)} />
            ))}
          </Row>
        </View>
        <ErrorText>{error}</ErrorText>
        <Button
          icon="sparkles"
          label={busy ? tm.computing : tm.find}
          busy={busy}
          disabled={busy || chosen.length < 2}
          onPress={() => void search()}
        />
        {chosen.length < 2 ? <Footnote center>{tm.pickTwo}</Footnote> : null}
      </Card>

      {result ? (
        <>
          {note ? <Notice tone="info">{tm.withCompromise(note)}</Notice> : null}
          {result.excluded.length > 0 ? (
            <Meta icon="info">{tm.excluded(result.excluded.map((x) => `${x.name} (${x.reason})`).join(", "))}</Meta>
          ) : null}
          {result.hiddenPlaceBlocks.length > 0 ? (
            <Meta icon="lock">
              {`${tm.hiddenBefore}${result.hiddenPlaceBlocks.map((h) => tm.hiddenItem(h.name, h.count)).join(", ")}${tm.hiddenAfter}`}
            </Meta>
          ) : null}
          {result.inPerson.length > 0 ? (
            <Heading>{`${tm.inPersonCount(result.inPerson.length)}${result.calls.length ? tm.callCount(result.calls.length) : ""}`}</Heading>
          ) : result.almost.length === 0 ? (
            <Notice tone="info">
              {result.calls[0]
                ? tm.nothingWithCall(result.calls[0].dayLabel, result.calls[0].timeLabel)
                : tm.nothing}
            </Notice>
          ) : null}

          {cards.map((p, i) => (
            <ProposalCard key={p.key} index={i} p={p} onPropose={() => onPropose(p, chosen)} />
          ))}
          {!showAll && result.inPerson.length > FIRST_CARDS ? (
            <Button label={tm.seeAll(result.inPerson.length)} variant="secondary" onPress={() => setShowAll(true)} />
          ) : null}

          {result.almost.length > 0 ? (
            <Section>
              <View style={{ gap: 2 }}>
                <Heading>{tm.whyNot}</Heading>
                <Muted>{tm.almostIntro}</Muted>
              </View>
              {result.almost.map((a, i) => (
                <Appear key={a.key} index={i}>
                <Card>
                  <Row nowrap align="flex-start" gap={space.md}>
                    <DateTile day={dayOfInstant(a.start)} dimmed />
                    <Fill>
                      <View style={{ gap: 3 }}>
                        <Body bold>{a.timeLabel}</Body>
                        <Meta icon="pin" accessibilityLabel={`${a.dayLabel}, ${a.placeName}`}>{a.placeName}</Meta>
                        <Meta icon="info">{a.sentence}</Meta>
                      </View>
                    </Fill>
                  </Row>
                  {a.compromises.length === 0 ? <Muted>{tm.noCompromise}</Muted> : null}
                  {a.compromises.map((c, i) =>
                    c.kind === "shorten" ? (
                      <Button
                        key={c.label}
                        size="small"
                        label={`${c.label}${i === 0 ? tm.simplest : ""}`}
                        variant="secondary"
                        disabled={busy}
                        onPress={() => void search(c.durationMinutes, c.label)}
                      />
                    ) : (
                      <Muted key={c.label}>{`• ${c.label}${i === 0 ? tm.simplest : ""}`}</Muted>
                    ),
                  )}
                </Card>
                </Appear>
              ))}
            </Section>
          ) : null}

          {result.calls.length > 0 ? (
            <Section>
              <Heading>{result.inPerson.length > 0 ? tm.otherDaysCall : tm.possibleCalls}</Heading>
              {result.calls.map((p, i) => (
                <ProposalCard key={p.key} index={i} p={p} onPropose={() => onPropose(p, chosen)} />
              ))}
            </Section>
          ) : null}
          <Footnote>Trajets estimés d&apos;après la distance. Le site utilise les vrais temps de trajet quand ils sont disponibles.</Footnote>
        </>
      ) : null}
    </View>
  );
}

/** Un moment trouvé : la date en étiquette, l'heure, le lieu, les trajets, et « Proposer ». */
function ProposalCard({ p, onPropose, index }: { p: ProposalView; onPropose: () => void; index: number }) {
  return (
    <Appear index={index}>
    <Card>
      <Row nowrap align="flex-start" gap={space.md}>
        <DateTile day={dayOfInstant(p.start)} />
        <Fill>
          <View style={{ gap: 3 }}>
            <Body bold>{p.timeLabel}</Body>
            <Meta icon={p.kind === "call" ? "call" : "pin"} accessibilityLabel={`${p.dayLabel}, ${p.kind === "call" ? tm.callOrVideo : (p.placeName ?? t.plans.placeTbd)}`}>
              {p.kind === "call" ? tm.callOrVideo : (p.placeName ?? t.plans.placeTbd)}
            </Meta>
            {p.travel.length > 0 ? (
              <Meta icon="travel">
                {p.travel
                  .map((x) => `${x.name} ${x.to} min${x.from !== x.to ? tm.back(x.from) : ""}`)
                  .join(", ")}
              </Meta>
            ) : null}
          </View>
        </Fill>
      </Row>
      <Button size="small" label={tm.propose} onPress={onPropose} />
    </Card>
    </Appear>
  );
}
