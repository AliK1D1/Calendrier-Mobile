import { useState } from "react";
import { Alert, View } from "react-native";

import { AddressSearch } from "@/components/address-search";
import { Badge, Body, Button, Card, Chip, ErrorText, Field, Heading, Loading, Muted, Row, Screen } from "@/components/ui";
import { addPlace, deletePlace, renamePlace, setHome } from "@/features/settings";
import type { GeocodeResult } from "@/lib/geocoding/nominatim";
import { getMyPlaces, getMyProfile } from "@/lib/profile";
import { t } from "@/services/i18n";
import { useAuthed } from "@/services/session";
import { useLoad } from "@/services/use-load";
import { space } from "@/theme/colors";

const tl = t.places;

/** Mes lieux : ajouter (recherche d'adresse), renommer, choisir la maison, supprimer. */
export default function Lieux() {
  const { supabase, userId } = useAuthed();
  const { data, error, reload } = useLoad(async () => {
    const [places, profile] = await Promise.all([getMyPlaces(supabase, userId), getMyProfile(supabase, userId)]);
    return { places, homeId: profile?.home_place_id ?? null };
  }, userId);
  const [picked, setPicked] = useState<GeocodeResult | null>(null);
  const [name, setName] = useState("");
  const [asHome, setAsHome] = useState(false);
  const [renaming, setRenaming] = useState<{ id: string; name: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [flash, setFlash] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  async function run(p: Promise<{ ok: true } | { ok: false; error: string }>, message: string) {
    setBusy(true);
    setActionError(null);
    const r = await p;
    setBusy(false);
    if (!r.ok) {
      setActionError(r.error);
      return false;
    }
    setFlash(message);
    void reload();
    return true;
  }

  async function save() {
    if (!picked) return;
    const placeName = name.trim() || picked.name;
    const ok = await run(addPlace(supabase, userId, { name: placeName, lat: picked.lat, lng: picked.lng }, asHome), tl.saved(placeName));
    if (ok) {
      setPicked(null);
      setName("");
      setAsHome(false);
    }
  }

  function confirmDelete(id: string, placeName: string, isHome: boolean) {
    Alert.alert(tl.confirmDelete(placeName, isHome), undefined, [
      { text: "Garder", style: "cancel" },
      { text: "Supprimer", style: "destructive", onPress: () => void run(deletePlace(supabase, userId, id), tl.deleted) },
    ]);
  }

  return (
    <Screen edges={[]} subtitle={tl.intro}>
      {flash ? <Body bold>{flash}</Body> : null}
      <ErrorText>{actionError}</ErrorText>
      <ErrorText>{error}</ErrorText>
      {!data && !error ? <Loading /> : null}
      {data && data.places.length === 0 ? <Muted>{tl.none}</Muted> : null}
      {data?.places.map((p) => {
        const isHome = p.id === data.homeId;
        return (
          <Card key={p.id}>
            <Row>
              <Body bold>{p.name}</Body>
              {isHome ? <Badge>{tl.home}</Badge> : null}
            </Row>
            {renaming?.id === p.id ? (
              <View style={{ gap: space.sm }}>
                <Field label={tl.newName} value={renaming.name} onChangeText={(v) => setRenaming({ id: p.id, name: v })} maxLength={100} />
                <Row>
                  <Button label="Enregistrer" disabled={busy} onPress={() => void run(renamePlace(supabase, userId, p.id, renaming.name), tl.renamed).then((ok) => ok && setRenaming(null))} />
                  <Button label="Annuler" variant="secondary" onPress={() => setRenaming(null)} />
                </Row>
              </View>
            ) : (
              <Row>
                {!isHome ? <Button label={tl.setHome} variant="secondary" disabled={busy} onPress={() => void run(setHome(supabase, userId, p.id), tl.isHome(p.name))} /> : null}
                <Button label={tl.rename} variant="secondary" disabled={busy} onPress={() => setRenaming({ id: p.id, name: p.name })} />
                <Button label="Supprimer" variant="secondary" disabled={busy} onPress={() => confirmDelete(p.id, p.name, isHome)} />
              </Row>
            )}
          </Card>
        );
      })}

      <Heading>{tl.addTitle}</Heading>
      <Card>
        <AddressSearch label={tl.searchLabel} selected={picked} onSelect={(r) => { setPicked(r); setName(r.name); }} />
        {picked ? (
          <>
            <Field label={tl.placeName} value={name} onChangeText={setName} maxLength={100} />
            <Chip label={tl.myHome} selected={asHome} onPress={() => setAsHome(!asHome)} />
            <Button label={tl.savePlace} busy={busy} disabled={busy} onPress={() => void save()} />
          </>
        ) : null}
      </Card>
    </Screen>
  );
}
