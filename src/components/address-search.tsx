import { useState } from "react";
import { Pressable, View } from "react-native";

import { Body, Button, ErrorText, Field, Muted } from "@/components/ui";
import { searchAddress } from "@/features/geocode";
import type { GeocodeResult } from "@/lib/geocoding/nominatim";
import { t } from "@/services/i18n";
import { radius, space } from "@/theme/colors";
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
      <Button label={busy ? ts.searching : ts.button} variant="secondary" busy={busy} disabled={busy} onPress={() => void search()} />
      <ErrorText>{error}</ErrorText>
      {results?.map((r) => {
        const on = selected?.id === r.id;
        return (
          <Pressable
            key={r.id}
            accessibilityRole="radio"
            accessibilityState={{ selected: on }}
            onPress={() => onSelect(r)}
            style={{
              borderWidth: on ? 2 : 1,
              borderColor: on ? c.primary : c.border,
              borderRadius: radius.md,
              padding: space.md,
              gap: 2,
              backgroundColor: c.card,
            }}
          >
            <Body bold>{on ? `✓ ${r.name}` : r.name}</Body>
            {r.kind ? <Muted>{r.kind}</Muted> : null}
            <Muted>{r.address}</Muted>
          </Pressable>
        );
      })}
      {results && results.length > 0 ? <Muted>{ts.credit}</Muted> : null}
    </View>
  );
}
