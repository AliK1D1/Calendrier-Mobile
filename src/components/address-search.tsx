import { useState } from "react";
import { Pressable, View } from "react-native";

import { Icon } from "@/components/icon";
import { Body, Button, ErrorText, Field, Fill, Footnote, Muted } from "@/components/ui";
import { searchAddress } from "@/features/geocode";
import type { GeocodeResult } from "@/lib/geocoding/nominatim";
import { t } from "@/services/i18n";
import { space } from "@/theme/colors";
import { ANDROID, shape } from "@/theme/tokens";
import { usePalette } from "@/theme/use-palette";

const ts = t.places.search;

/** Recherche d'adresse (OpenStreetMap) : on tape, on touche « Chercher », on choisit. */
export function AddressSearch({
  label,
  placeholder,
  selected,
  onSelect,
}: {
  label: string;
  placeholder?: string;
  selected: GeocodeResult | null;
  onSelect: (r: GeocodeResult) => void;
}) {
  const c = usePalette();
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<GeocodeResult[] | null>(null);

  async function search() {
    setBusy(true);
    setError(null);
    const r = await searchAddress(query);
    setBusy(false);
    if (!r.ok) return setError(r.error);
    setResults(r.results);
    if (r.results.length === 0) setError(ts.noResult);
  }

  return (
    <View style={{ gap: space.sm }}>
      <Field
        label={label}
        placeholder={placeholder ?? ts.placeholder}
        value={query}
        onChangeText={setQuery}
        returnKeyType="search"
        onSubmitEditing={() => void search()}
      />
      <Button icon="search" label={busy ? ts.searching : ts.button} variant="secondary" busy={busy} disabled={busy || !query.trim()} onPress={() => void search()} />
      <ErrorText>{error}</ErrorText>
      {results?.map((r) => {
        const on = selected?.id === r.id;
        return (
          <Pressable
            key={r.id}
            accessibilityRole="radio"
            accessibilityState={{ selected: on }}
            onPress={() => onSelect(r)}
            android_ripple={{ color: c.border }}
            style={({ pressed }) => ({
              flexDirection: "row",
              alignItems: "center",
              gap: space.md,
              borderWidth: 2,
              borderColor: on ? c.primary : "transparent",
              borderRadius: shape.tile,
              padding: space.md,
              backgroundColor: c.accent,
              opacity: pressed && !ANDROID ? 0.6 : 1,
            })}
          >
            <Icon name={on ? "checkCircle" : "pin"} size={20} color={on ? c.primary : c.muted} />
            <Fill>
              <Body bold>{r.name}</Body>
              <Muted>{[r.kind, r.address].filter(Boolean).join(" · ")}</Muted>
            </Fill>
          </Pressable>
        );
      })}
      {results && results.length > 0 ? <Footnote>{ts.credit}</Footnote> : null}
    </View>
  );
}
