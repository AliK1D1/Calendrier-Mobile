import { Link, router } from "expo-router";
import { useState } from "react";
import { Pressable } from "react-native";

import { Avatar } from "@/components/avatar";
import { ListGroup, ListRow } from "@/components/list";
import { Appear, Reveal } from "@/components/motion";
import { Badge, Button, Card, EmptyState, ErrorText, Field, Loading, Muted, Screen, Section } from "@/components/ui";
import { createGroup, joinGroup } from "@/features/actions";
import { getMyGroups } from "@/lib/groups/queries";
import { t } from "@/services/i18n";
import { useAuthed } from "@/services/session";
import { useLoad } from "@/services/use-load";
import { ANDROID } from "@/theme/tokens";
import { usePalette } from "@/theme/use-palette";

const tg = t.groups;

/** Mes groupes, créer un groupe, rejoindre avec un lien ou un code. */
export default function Groupes() {
  const { supabase, userId } = useAuthed();
  const c = usePalette();
  const { data, error, refreshing, refresh } = useLoad(() => getMyGroups(supabase, userId), userId, "groupes");
  // Les deux formulaires sont repliés : la liste des groupes passe en premier.
  const [open, setOpen] = useState<"create" | "join" | null>(null);
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState<"create" | "join" | null>(null);
  const [formError, setFormError] = useState<{ create?: string; join?: string }>({});

  async function onCreate() {
    setBusy("create");
    const r = await createGroup(supabase, name);
    setBusy(null);
    if (!r.ok) return setFormError({ create: r.error });
    setName("");
    setFormError({});
    setOpen(null);
    router.push({ pathname: "/groupe/[id]", params: { id: r.id } });
  }

  async function onJoin() {
    setBusy("join");
    const r = await joinGroup(supabase, code);
    setBusy(null);
    if (!r.ok) return setFormError({ join: r.error });
    setCode("");
    setFormError({});
    setOpen(null);
    router.push({ pathname: "/groupe/[id]", params: { id: r.id } });
  }

  const toggle = (which: "create" | "join") => setOpen((o) => (o === which ? null : which));

  return (
    <Screen title={tg.title} refreshing={refreshing} onRefresh={refresh}>
      <ErrorText>{error}</ErrorText>
      {!data && !error ? <Loading kind="list" /> : null}
      {data && data.length === 0 ? (
        <EmptyState
          icon="group"
          title={tg.none}
          text="Crée un groupe et envoie le lien à tes amis, ou rejoins le leur avec une invitation."
        />
      ) : null}
      {data && data.length > 0 ? (
        <Appear>
        <ListGroup>
          {data.map((g) => (
            // iPhone : appui long = aperçu du groupe (« Peek and Pop ») ; toucher l'ouvre.
            <Link key={g.id} href={{ pathname: "/groupe/[id]", params: { id: g.id } }} asChild>
              <Link.Trigger>
                <Pressable
                  accessibilityRole="link"
                  android_ripple={{ color: c.border }}
                  style={({ pressed }) => ({ opacity: pressed && !ANDROID ? 0.5 : 1 })}
                >
                  <ListRow
                    leading={<Avatar name={g.name} size={44} />}
                    title={g.name}
                    subtitle={tg.members(g.memberCount)}
                    trailing={g.role === "admin" ? <Badge>{tg.admin}</Badge> : undefined}
                    chevron
                  />
                </Pressable>
              </Link.Trigger>
              <Link.Preview />
            </Link>
          ))}
        </ListGroup>
        </Appear>
      ) : null}

      <Section>
        <ListGroup>
          <ListRow icon="add" title={tg.createTitle} onPress={() => toggle("create")} chevron={false} />
          <ListRow icon="link" title={tg.inviteTitle} onPress={() => toggle("join")} chevron={false} />
        </ListGroup>
        {open === "create" ? (
          <Reveal key="create">
          <Card>
            <Field label={tg.nameLabel} placeholder={tg.namePlaceholder} value={name} onChangeText={setName} maxLength={60} autoFocus returnKeyType="done" onSubmitEditing={() => (name.trim() ? void onCreate() : undefined)} />
            <Muted>{tg.createHint}</Muted>
            <ErrorText>{formError.create}</ErrorText>
            <Button label={busy === "create" ? tg.creating : tg.create} busy={busy === "create"} disabled={busy !== null || !name.trim()} onPress={() => void onCreate()} />
          </Card>
          </Reveal>
        ) : null}
        {open === "join" ? (
          <Reveal key="join">
          <Card>
            <Field label={tg.codeLabel} value={code} onChangeText={setCode} autoCapitalize="none" autoCorrect={false} autoFocus returnKeyType="go" onSubmitEditing={() => (code.trim() ? void onJoin() : undefined)} />
            <Muted>{tg.inviteHint}</Muted>
            <ErrorText>{formError.join}</ErrorText>
            <Button label={tg.continue} busy={busy === "join"} disabled={busy !== null || !code.trim()} onPress={() => void onJoin()} />
          </Card>
          </Reveal>
        ) : null}
      </Section>
    </Screen>
  );
}
