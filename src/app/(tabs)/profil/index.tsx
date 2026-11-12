import Constants from "expo-constants";
import { router } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { useState } from "react";
import { Text, View } from "react-native";

import { AppearanceCard } from "@/components/appearance-card";
import { Avatar } from "@/components/avatar";
import { ListGroup, ListRow } from "@/components/list";
import { NotificationsCard } from "@/components/notifications-card";
import { Stepper } from "@/components/steppers";
import { Toggle } from "@/components/toggle";
import { Button, Card, Chip, ErrorText, Field, Footnote, Heading, Label, Loading, Muted, Notice, Row, Screen, Section, Segmented } from "@/components/ui";
import { shiftClock } from "@/features/blocks";
import { savePrivacy, saveOutingLimits, saveProfile, saveQuietHours } from "@/features/settings";
import { TRAVEL_MODE_LABELS, TRAVEL_MODES } from "@/lib/places/validation";
import { outingLimitsFromDb } from "@/lib/scheduling/outingLimits";
import { quietHoursFromDb } from "@/lib/scheduling/quietHours";
import { formatClock, formatClockFr, parseClock } from "@/lib/scheduling/weeklyBlocks";
import { getMyOutingLimits, getMyPrivacy, getMyProfile, getMyQuietHours } from "@/lib/profile";
import { t } from "@/services/i18n";
import { useAuthed, useSession } from "@/services/session";
import { oublierCeTelephone } from "@/services/notifications";
import { SITE_URL } from "@/services/site";
import { useLoad } from "@/services/use-load";
import { space } from "@/theme/colors";
import { type } from "@/theme/tokens";
import { usePalette } from "@/theme/use-palette";

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
  return <Notice>{msg.text}</Notice>;
}

const HALF_HOUR = [{ label: "30", by: 30 }] as const;

/** Heure facultative : « Pas de limite » ou une heure réglée par pas de 30 min. */
function OptionalClock({ label, value, fallback, onChange }: { label: string; value: string; fallback: string; onChange: (v: string) => void }) {
  return (
    <View style={{ gap: space.sm }}>
      <Label>{label}</Label>
      <Segmented
        accessibilityLabel={label}
        options={[{ value: "none", label: "Pas de limite" }, { value: "set", label: value ? formatClockFr(parseClock(value) ?? 0) : "Choisir une heure" }]}
        value={value === "" ? "none" : "set"}
        onChange={(v) => onChange(v === "none" ? "" : value || fallback)}
      />
      {value ? (
        <Stepper label={label} hideLabel value={formatClockFr(parseClock(value) ?? 0)} steps={HALF_HOUR} onShift={(m) => onChange(shiftClock(value, m, 30, 23 * 60 + 30))} />
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
  return <ProfileForms key={userId} data={data} email={session?.user.email ?? null} supabaseSignOut={() => oublierCeTelephone(supabase).then(() => supabase.auth.signOut())} />;
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
  const c = usePalette();
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
  const shownName = data.profile?.display_name || t.home.user;

  // Confidentialité : l'interrupteur enregistre tout de suite (et revient en arrière si ça échoue).
  function changeHide(next: boolean) {
    setHide(next);
    void pv.run(
      savePrivacy(supabase, userId, next).then((r) => {
        if (!r.ok) setHide(!next);
        return r;
      }),
      "Réglage enregistré.",
    );
  }

  return (
    <Screen title={t.common.nav.profile}>
      <View style={{ alignItems: "center", gap: space.xs }}>
        <Avatar name={shownName} size={76} />
        <Text accessibilityRole="header" style={[type.title, { color: c.text, marginTop: space.sm, textAlign: "center" }]}>
          {shownName}
        </Text>
        {email ? <Muted>{email}</Muted> : null}
      </View>

      <Section>
        <Heading>Mon profil</Heading>
        <Card style={{ gap: space.md }}>
          <Field label="Ton nom (vu par tes amis)" value={name} onChangeText={setName} maxLength={60} autoComplete="nickname" />
          <View style={{ gap: space.sm }}>
            <Label>Mode de transport</Label>
            <Row>
              {TRAVEL_MODES.map((m) => (
                <Chip key={m} label={TRAVEL_MODE_LABELS[m]} selected={mode === m} onPress={() => setMode(m)} />
              ))}
            </Row>
          </View>
          <Message msg={p.msg} />
          <Button label={p.busy ? "Enregistrement…" : "Enregistrer"} busy={p.busy} disabled={p.busy} onPress={() => void p.run(saveProfile(supabase, userId, { displayName: name, travelMode: mode }), "Profil enregistré.")} />
        </Card>
      </Section>

      <ListGroup>
        <ListRow icon="pin" title="Mes lieux" subtitle="Maison, cégep, travail…" onPress={() => router.push("/lieux")} />
        <ListRow icon="study" iconColor={c.success} title="Étude" subtitle="Examens, travaux et séances" onPress={() => router.push("/etude")} />
      </ListGroup>

      <Section>
        <View style={{ gap: 2 }}>
          <Heading>Heures où je ne sors pas</Heading>
          <Muted>Aucun moment ne te sera proposé en dehors de ces heures.</Muted>
        </View>
        <Card style={{ gap: space.lg }}>
          <OptionalClock label="Je ne sors pas avant" value={before} fallback="09:00" onChange={setBefore} />
          <OptionalClock label="Je ne sors pas après" value={after} fallback="22:00" onChange={setAfter} />
          <Message msg={qh.msg} />
          <Button label={qh.busy ? "Enregistrement…" : "Enregistrer ces heures"} busy={qh.busy} disabled={qh.busy} onPress={() => void qh.run(saveQuietHours(supabase, userId, { before, after }), "Heures enregistrées.")} />
        </Card>
      </Section>

      <Section>
        <View style={{ gap: 2 }}>
          <Heading>{t.plans.outingLimit.title}</Heading>
          <Muted>{t.plans.outingLimit.description}</Muted>
        </View>
        <Card style={{ gap: space.md }}>
          <View style={{ gap: space.sm }}>
            <Label>{t.plans.outingLimit.perDay}</Label>
            <Row>
              <Chip label={t.plans.outingLimit.none} selected={perDay === null} onPress={() => setPerDay(null)} />
              {PER_DAY.map((n) => <Chip key={n} label={String(n)} selected={perDay === n} onPress={() => setPerDay(n)} />)}
            </Row>
          </View>
          <View style={{ gap: space.sm }}>
            <Label>{t.plans.outingLimit.perWeek}</Label>
            <Row>
              <Chip label={t.plans.outingLimit.none} selected={perWeek === null} onPress={() => setPerWeek(null)} />
              {PER_WEEK.map((n) => <Chip key={n} label={String(n)} selected={perWeek === n} onPress={() => setPerWeek(n)} />)}
            </Row>
          </View>
          <Message msg={ol.msg} />
          <Button label={t.plans.outingLimit.save} busy={ol.busy} disabled={ol.busy || data.limits === null} onPress={() => void ol.run(saveOutingLimits(supabase, userId, { perDay, perWeek }), t.plans.outingLimit.saved)} />
          {data.limits === null ? <Footnote>{t.plans.outingLimit.outdated}</Footnote> : null}
        </Card>
      </Section>

      <Section>
        <ListGroup header="Confidentialité" footer="Activé : les membres de tes groupes voient « Occupé » au lieu du titre de tes cours.">
          <ListRow
            icon="lock"
            title="Masquer le titre de mes cours"
            trailing={<Toggle value={hide} onValueChange={changeHide} accessibilityLabel="Masquer le titre de mes cours" />}
          />
        </ListGroup>
        <Message msg={pv.msg} />
      </Section>

      <NotificationsCard />

      <Section>
        <Heading>Apparence</Heading>
        <AppearanceCard />
      </Section>

      <ListGroup footer="Langue, Outlook, calendriers abonnés et préférences d'étude se règlent sur le site. Ils s'appliquent aussi à l'app.">
        <ListRow icon="external" title="Ouvrir mon profil sur le site" chevron={false} onPress={() => void WebBrowser.openBrowserAsync(`${SITE_URL}/profil`)} />
      </ListGroup>

      <ListGroup>
        <ListRow
          icon="signOut"
          destructive
          title={signingOut ? "Déconnexion…" : t.home.signOut}
          onPress={() => {
            if (signingOut) return;
            setSigningOut(true);
            // La session change : l'app revient toute seule à l'écran de connexion.
            void supabaseSignOut().finally(() => setSigningOut(false));
          }}
        />
      </ListGroup>
      <Footnote center>{`Freecrew ${Constants.expoConfig?.version ?? ""}`}</Footnote>
    </Screen>
  );
}
