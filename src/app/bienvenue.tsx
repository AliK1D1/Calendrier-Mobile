import { router } from "expo-router";
import { useState } from "react";

import { AddressSearch } from "@/components/address-search";
import { Body, Button, Card, Chip, ErrorText, Muted, Row, Screen } from "@/components/ui";
import { completeOnboarding, skipOnboarding } from "@/features/settings";
import type { GeocodeResult } from "@/lib/geocoding/nominatim";
import { TRAVEL_MODE_LABELS, TRAVEL_MODES } from "@/lib/places/validation";
import type { TravelMode } from "@/lib/scheduling/types";
import { t } from "@/services/i18n";
import { useAuthed } from "@/services/session";

const to = t.onboarding;

/** Premier accueil : maison, cégep ou école (facultatif), mode de transport. */
export default function Bienvenue() {
  const { supabase } = useAuthed();
  const [step, setStep] = useState(0);
  const [home, setHome] = useState<GeocodeResult | null>(null);
  const [school, setSchool] = useState<GeocodeResult | null>(null);
  const [mode, setMode] = useState<TravelMode>("transit");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function leave() {
    if (router.canGoBack()) router.back();
    else router.replace("/");
  }

  async function finish() {
    if (!home) return;
    setBusy(true);
    setError(null);
    const r = await completeOnboarding(supabase, {
      home: { name: to.homeDefaultName, lat: home.lat, lng: home.lng },
      school: school ? { name: school.name, lat: school.lat, lng: school.lng } : null,
      travelMode: mode,
    });
    setBusy(false);
    if (!r.ok) return setError(r.error);
    leave();
  }

  async function later() {
    setBusy(true);
    const r = await skipOnboarding(supabase);
    setBusy(false);
    if (!r.ok) return setError(r.error);
    leave();
  }

  return (
    <Screen edges={[]} subtitle={to.intro}>
      <Card>
        <Muted>{to.stepOf(step + 1, 3)}</Muted>
        <Body bold>{to.steps[step]}</Body>
        <Muted>{to.stepHints[step]}</Muted>
        {step === 0 ? (
          <AddressSearch label={to.homeLabel} placeholder={to.homePlaceholder} selected={home} onSelect={setHome} />
        ) : null}
        {step === 1 ? (
          <AddressSearch label={to.schoolLabel} placeholder={to.schoolPlaceholder} selected={school} onSelect={setSchool} />
        ) : null}
        {step === 2 ? (
          <Row>
            {TRAVEL_MODES.map((m) => (
              <Chip key={m} label={TRAVEL_MODE_LABELS[m]} selected={mode === m} onPress={() => setMode(m)} />
            ))}
          </Row>
        ) : null}
        <ErrorText>{error}</ErrorText>
        {step === 0 ? <Button label={to.continue} disabled={!home} onPress={() => setStep(1)} /> : null}
        {step === 1 ? (
          <>
            <Button label={to.continue} disabled={!school} onPress={() => setStep(2)} />
            <Button label={to.noSchool} variant="secondary" onPress={() => { setSchool(null); setStep(2); }} />
          </>
        ) : null}
        {step === 2 ? <Button label={to.finish} busy={busy} disabled={busy || !home} onPress={() => void finish()} /> : null}
        {step > 0 ? <Button label={to.back} variant="secondary" disabled={busy} onPress={() => setStep(step - 1)} /> : null}
      </Card>
      <Button label={to.later} variant="secondary" disabled={busy} onPress={() => void later()} />
    </Screen>
  );
}
