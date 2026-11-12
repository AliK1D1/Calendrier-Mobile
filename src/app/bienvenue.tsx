import { router } from "expo-router";
import { useState } from "react";
import { Text, View } from "react-native";

import { AddressSearch } from "@/components/address-search";
import { Button, Card, Chip, ErrorText, Fill, Muted, Row, Screen } from "@/components/ui";
import { completeOnboarding, skipOnboarding } from "@/features/settings";
import type { GeocodeResult } from "@/lib/geocoding/nominatim";
import { TRAVEL_MODE_LABELS, TRAVEL_MODES } from "@/lib/places/validation";
import type { TravelMode } from "@/lib/scheduling/types";
import { t } from "@/services/i18n";
import { useAuthed } from "@/services/session";
import { space } from "@/theme/colors";
import { type } from "@/theme/tokens";
import { usePalette } from "@/theme/use-palette";

const to = t.onboarding;

/** Premier accueil : maison, cégep ou école (facultatif), mode de transport. */
export default function Bienvenue() {
  const { supabase } = useAuthed();
  const c = usePalette();
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
      <Card style={{ gap: space.md }}>
        {/* Avancement : une barre par question. */}
        <View accessible accessibilityLabel={to.stepOf(step + 1, 3)} style={{ flexDirection: "row", gap: space.xs + 2 }}>
          {[0, 1, 2].map((n) => (
            <View key={n} style={{ flex: 1, height: 5, borderRadius: 3, backgroundColor: n <= step ? c.primary : c.accent }} />
          ))}
        </View>
        <View style={{ gap: 2 }}>
          <Text style={[type.footnote, { color: c.muted }]}>{to.stepOf(step + 1, 3)}</Text>
          <Text accessibilityRole="header" style={[type.title, { color: c.text }]}>{to.steps[step]}</Text>
          <Muted>{to.stepHints[step]}</Muted>
        </View>
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
        <Row nowrap>
          {step > 0 ? (
            <Fill>
              <Button label={to.back} variant="secondary" disabled={busy} onPress={() => setStep(step - 1)} />
            </Fill>
          ) : null}
          <Fill>
            {step === 0 ? <Button label={to.continue} disabled={!home} onPress={() => setStep(1)} /> : null}
            {step === 1 ? <Button label={to.continue} disabled={!school} onPress={() => setStep(2)} /> : null}
            {step === 2 ? <Button label={to.finish} busy={busy} disabled={busy || !home} onPress={() => void finish()} /> : null}
          </Fill>
        </Row>
        {step === 1 ? (
          <Button label={to.noSchool} variant="plain" size="small" onPress={() => { setSchool(null); setStep(2); }} />
        ) : null}
      </Card>
      <Button label={to.later} variant="plain" size="small" disabled={busy} onPress={() => void later()} />
    </Screen>
  );
}
