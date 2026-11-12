import Constants from "expo-constants";
import { router } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { useState } from "react";
import { View } from "react-native";

import { AppearanceCard } from "@/components/appearance-card";
import { Toggle } from "@/components/toggle";

import { Body, Button, Card, Chip, ErrorText, Field, Heading, Label, Loading, Muted, Row, Screen } from "@/components/ui";
import { shiftClock } from "@/features/blocks";
import { savePrivacy, saveOutingLimits, saveProfile, saveQuietHours } from "@/features/settings";
import { TRAVEL_MODE_LABELS, TRAVEL_MODES } from "@/lib/places/validation";
import { outingLimitsFromDb } from "@/lib/scheduling/outingLimits";
import { quietHoursFromDb } from "@/lib/scheduling/quietHours";
import { formatClock, formatClockFr, parseClock } from "@/lib/scheduling/weeklyBlocks";
import { getMyOutingLimits, getMyPrivacy, getMyProfile, getMyQuietHours } from "@/lib/profile";
import { t } from "@/services/i18n";
import { useAuthed, useSession } from "@/services/session";
import { SITE_URL } from "@/services/site";
import { useLoad } from "@/services/use-load";
import { space } from "@/theme/colors";

type Saved = { ok: true } | { ok: false; error: string };

/** Message sous un formulaire : enregistré, ou l'erreur. */
function useSave() {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  async function run(p: Promise<Saved>, okText: string) {
    setBusy(true);
    const r = await p;
    setBusy(false);
    setMsg(r.ok ? { ok: true, text: okText } : { ok: false, text: r.error });
  }
  return { busy, msg, run };
}

function Message({ msg }: { msg: { ok: boolean; text: string } | null }) {
  if (!msg) return null;
  if (!msg.ok) return <ErrorText>{msg.text}</ErrorText>;
  return <Body bold>{`✓ ${msg.text}`}</Body>;
}

/** Heure facultative : « Pas de limite » ou une heure réglée par pas de 30 min. */
function OptionalClock({ label, value, fallback, onChange }: { label: string; value: string; fallback: string; onChange: (v: string) => void }) {
  return (
    <View style={{ gap: space.xs }}>
      <Label>{label}</Label>
      <Row>
        <Chip label="Pas de limite" selected={value === ""} onPress={() => onChange("")} />
        <Chip label={value ? formatClockFr(parseClock(value) ?? 0) : "Choisir une heure"} selected={value !== ""} onPress={() => onChange(value || fallback)} />
      </Row>
      {value ? (
        <Row>
          <Button label="− 30 min" variant="secondary" onPress={() => onChange(shiftClock(value, -30, 30, 23 * 60 + 30))} />
          <Button label="+ 30 min" variant="secondary" onPress={() => onChange(shiftClock(value, 30, 30, 23 * 60 + 30))} />
        </Row>
      ) : null}
    </View>
  );
}

const PER_DAY = [1, 2, 3, 4, 5];
const PER_WEEK = [1, 2, 3, 4, 5, 7, 10, 14];

/** Mon compte : nom et transport, lieux, heures où je ne sors pas, confidentialité, sorties. */
export default function Profil() {
  const { supabase, userId } = useAuthed();
  const { session } = useSession();
  const { data, error } = useLoad(async () => {
    const [profile, quiet, hide, limits] = await Promise.all([
      getMyProfile(supabase, userId),
      getMyQuietHours(supabase, userId).catch(() => null),
      getMyPrivacy(supabase, userId).catch(() => null),
      getMyOutingLimits(supabase, userId).catch(() => null),
    ]);
    return { profile, quiet, hide, limits };
  }, userId);

  if (!data) {
    return (
      <Screen title={t.common.nav.profile}>
        <ErrorText>{error}</ErrorText>
        {!error ? <Loading /> : null}
      </Screen>
    );
  }
  return <ProfileForms key={userId} data={data} email={session?.user.email ?? null} supabaseSignOut={() => supabase.auth.signOut()} />;
}

function ProfileForms({
  data,
  email,
  supabaseSignOut,
}: {
  data: {
    profile: Awaited<ReturnType<typeof getMyProfile>>;
    quiet: Awaited<ReturnType<typeof getMyQuietHours>> | null;
    hide: boolean | null;
    limits: Awaited<ReturnType<typeof getMyOutingLimits>> | null;
  };
  email: string | null;
  supabaseSignOut: () => Promise<unknown>;
}) {
  const { supabase, userId } = useAuthed();
  const q = data.quiet ? quietHoursFromDb(data.quiet.unavailable_before, data.quiet.unavailable_after) : { before: null, after: null };
  const l = data.limits ? outingLimitsFromDb(data.limits.max_outings_per_day, data.limits.max_outings_per_week) : { perDay: null, perWeek: null };

  const [name, setName] = useState(data.profile?.display_name ?? "");
  const [mode, setMode] = useState<string>(data.profile?.travel_mode ?? "transit");
  const [before, setBefore] = useState(q.before === null ? "" : formatClock(q.before));
  const [after, setAfter] = useState(q.after === null ? "" : formatClock(q.after));
  const [hide, setHide] = useState(data.hide ?? true);
  const [perDay, setPerDay] = useState<number | null>(l.perDay);
  const [perWeek, setPerWeek] = useState<number | null>(l.perWeek);
  const p = useSave();
  const qh = useSave();
  const pv = useSave();
  const ol = useSave();
  const [signingOut, setSigningOut] = useState(false);

  return (
    <Screen title={t.common.nav.profile}>
      <Card>
        <Muted>{t.home.signedInAs}</Muted>
        <Body bold>{data.profile?.display_name || t.home.user}</Body>
        {email ? <Muted>{email}</Muted> : null}
      </Card>

      <Heading>Mon profil</Heading>
      <Card>
        <Field label="Ton nom (vu par tes amis)" value={name} onChangeText={setName} maxLength={60} autoComplete="nickname" />
        <Label>Mode de transport</Label>
        <Row>
          {TRAVEL_MODES.map((m) => (
            <Chip key={m} label={TRAVEL_MODE_LABELS[m]} selected={mode === m} onPress={() => setMode(m)} />
          ))}
        </Row>
        <Message msg={p.msg} />
        <Button label={p.busy ? "Enregistrement…" : "Enregistrer"} busy={p.busy} disabled={p.busy} onPress={() => void p.run(saveProfile(supabase, userId, { displayName: name, travelMode: mode }), "Profil enregistré.")} />
      </Card>

      <Button label="Mes lieux (maison, cégep, travail…)" variant="secondary" onPress={() => router.push("/lieux")} />

      <Heading>Heures où je ne sors pas</Heading>
      <Card>
        <Muted>Aucun moment ne te sera proposé en dehors de ces heures.</Muted>
        <OptionalClock label="Je ne sors pas avant" value={before} fallback="09:00" onChange={setBefore} />
        <OptionalClock label="Je ne sors pas après" value={after} fallback="22:00" onChange={setAfter} />
        <Message msg={qh.msg} />
        <Button label={qh.busy ? "Enregistrement…" : "Enregistrer ces heures"} busy={qh.busy} disabled={qh.busy} onPress={() => void qh.run(saveQuietHours(supabase, userId, { before, after }), "Heures enregistrées.")} />
      </Card>

      <Heading>{t.plans.outingLimit.title}</Heading>
      <Card>
        <Muted>{t.plans.outingLimit.description}</Muted>
        <Label>{t.plans.outingLimit.perDay}</Label>
        <Row>
          <Chip label={t.plans.outingLimit.none} selected={perDay === null} onPress={() => setPerDay(null)} />
          {PER_DAY.map((n) => <Chip key={n} label={String(n)} selected={perDay === n} onPress={() => setPerDay(n)} />)}
        </Row>
        <Label>{t.plans.outingLimit.perWeek}</Label>
        <Row>
          <Chip label={t.plans.outingLimit.none} selected={perWeek === null} onPress={() => setPerWeek(null)} />
          {PER_WEEK.map((n) => <Chip key={n} label={String(n)} selected={perWeek === n} onPress={() => setPerWeek(n)} />)}
        </Row>
        <Message msg={ol.msg} />
        <Button label={t.plans.outingLimit.save} busy={ol.busy} disabled={ol.busy || data.limits === null} onPress={() => void ol.run(saveOutingLimits(supabase, userId, { perDay, perWeek }), t.plans.outingLimit.saved)} />
        {data.limits === null ? <Muted>{t.plans.outingLimit.outdated}</Muted> : null}
      </Card>

      <Heading>Confidentialité</Heading>
      <Card>
        <Row>
          <View style={{ flex: 1 }}>
            <Body>Les membres de mes groupes voient « Occupé » au lieu du titre de mes cours</Body>
          </View>
          <Toggle value={hide} onValueChange={setHide} accessibilityLabel="Masquer le titre de mes cours" />
        </Row>
        <Message msg={pv.msg} />
        <Button label={pv.busy ? "Enregistrement…" : "Enregistrer"} variant="secondary" busy={pv.busy} disabled={pv.busy} onPress={() => void pv.run(savePrivacy(supabase, userId, hide), "Réglage enregistré.")} />
      </Card>

      <Heading>Apparence</Heading>
      <AppearanceCard />

      <Card>
        <Body bold>Sur le site seulement</Body>
        <Muted>Langue, Outlook, calendriers abonnés et préférences d&apos;étude se règlent sur le site. Ils s&apos;appliquent aussi à l&apos;app.</Muted>
        <Button label="Ouvrir mon profil sur le site" variant="secondary" onPress={() => void WebBrowser.openBrowserAsync(`${SITE_URL}/profil`)} />
      </Card>

      <Button
        label={t.home.signOut}
        variant="danger"
        busy={signingOut}
        onPress={() => {
          setSigningOut(true);
          // La session change : l'app revient toute seule à l'écran de connexion.
          void supabaseSignOut().finally(() => setSigningOut(false));
        }}
      />
      <Muted>{`Freecrew ${Constants.expoConfig?.version ?? ""}`}</Muted>
    </Screen>
  );
}
