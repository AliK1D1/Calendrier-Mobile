import { useState } from "react";
import { ActionSheetIOS, Alert, Platform } from "react-native";

import { AddressSearch } from "@/components/address-search";
import { ListGroup, ListRow } from "@/components/list";
import { Reveal } from "@/components/motion";
import { Toggle } from "@/components/toggle";
import { Badge, Button, Card, EmptyState, ErrorText, Field, Fill, Heading, Label, Loading, Notice, Row, Screen, Section } from "@/components/ui";
import { addPlace, deletePlace, renamePlace, setHome } from "@/features/settings";
import type { GeocodeResult } from "@/lib/geocoding/nominatim";
import { getMyPlaces, getMyProfile } from "@/lib/profile";
import { t } from "@/services/i18n";
import { useAuthed } from "@/services/session";
import { useLoad } from "@/services/use-load";
import { usePalette } from "@/theme/use-palette";

const tl = t.places;

/** Mes lieux : ajouter (recherche d'adresse), renommer, choisir la maison, supprimer. */
export default function Lieux() {
  const { supabase, userId } = useAuthed();
  const c = usePalette();
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

  /** Toucher un lieu : choisir comme maison, renommer ou supprimer. */
  function onPlace(p: { id: string; name: string }, isHome: boolean) {
    const actions: { text: string; destructive?: boolean; run: () => void }[] = [];
    if (!isHome) actions.push({ text: tl.setHome, run: () => void run(setHome(supabase, userId, p.id), tl.isHome(p.name)) });
    actions.push({ text: tl.rename, run: () => setRenaming({ id: p.id, name: p.name }) });
    actions.push({ text: "Supprimer", destructive: true, run: () => confirmDelete(p.id, p.name, isHome) });
    if (Platform.OS === "ios") {
      const options = [...actions.map((a) => a.text), "Annuler"];
      ActionSheetIOS.showActionSheetWithOptions(
        { title: p.name, options, cancelButtonIndex: options.length - 1, destructiveButtonIndex: actions.length - 1, tintColor: c.primary },
        (index) => actions[index]?.run(),
      );
      return;
    }
    Alert.alert(p.name, undefined, [
      ...actions.map((a) => ({ text: a.text, onPress: a.run, style: a.destructive ? ("destructive" as const) : ("default" as const) })),
      { text: "Fermer", style: "cancel" as const },
    ]);
  }

  return (
    <Screen edges={[]} subtitle={tl.intro}>
      <Notice>{flash}</Notice>
      <ErrorText>{actionError}</ErrorText>
      <ErrorText>{error}</ErrorText>
      {!data && !error ? <Loading /> : null}
      {data && data.places.length === 0 ? <EmptyState icon="pin" title={tl.none} /> : null}
      {data && data.places.length > 0 ? (
        <ListGroup footer="Touche un lieu pour le choisir comme maison, le renommer ou le supprimer.">
          {data.places.map((p) => {
            const isHome = p.id === data.homeId;
            return (
              <ListRow
                key={p.id}
                icon={isHome ? "home" : "pin"}
                title={p.name}
                trailing={isHome ? <Badge tone="primary">{tl.home}</Badge> : undefined}
                chevron
                onPress={() => onPlace(p, isHome)}
                accessibilityHint="Choisir comme maison, renommer ou supprimer"
              />
            );
          })}
        </ListGroup>
      ) : null}

      {renaming ? (
        <Reveal>
        <Card>
          <Field label={tl.newName} value={renaming.name} onChangeText={(v) => setRenaming({ id: renaming.id, name: v })} maxLength={100} autoFocus />
          <Row nowrap>
            <Fill>
              <Button size="small" label="Annuler" variant="secondary" onPress={() => setRenaming(null)} />
            </Fill>
            <Fill>
              <Button size="small" label="Enregistrer" busy={busy} disabled={busy || !renaming.name.trim()} onPress={() => void run(renamePlace(supabase, userId, renaming.id, renaming.name), tl.renamed).then((ok) => ok && setRenaming(null))} />
            </Fill>
          </Row>
        </Card>
        </Reveal>
      ) : null}

      <Section>
        <Heading>{tl.addTitle}</Heading>
        <Card>
          <AddressSearch label={tl.searchLabel} selected={picked} onSelect={(r) => { setPicked(r); setName(r.name); }} />
          {picked ? (
            <>
              <Field label={tl.placeName} value={name} onChangeText={setName} maxLength={100} />
              <Row nowrap>
                <Fill>
                  <Label>{tl.myHome}</Label>
                </Fill>
                <Toggle value={asHome} onValueChange={setAsHome} accessibilityLabel={tl.myHome} />
              </Row>
              <Button label={tl.savePlace} busy={busy} disabled={busy} onPress={() => void save()} />
            </>
          ) : null}
        </Card>
      </Section>
    </Screen>
  );
}
