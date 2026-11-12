import { Link, router } from "expo-router";
import { useState } from "react";
import { Pressable, View } from "react-native";

import { Badge, Body, Button, Card, ErrorText, Field, Heading, Loading, Muted, Row, Screen } from "@/components/ui";
import { createGroup, joinGroup } from "@/features/actions";
import { getMyGroups } from "@/lib/groups/queries";
import { t } from "@/services/i18n";
import { useAuthed } from "@/services/session";
import { useLoad } from "@/services/use-load";
import { space } from "@/theme/colors";

const tg = t.groups;

/** Mes groupes, créer un groupe, rejoindre avec un lien ou un code. */
export default function Groupes() {
  const { supabase, userId } = useAuthed();
  const { data, error, refreshing, refresh } = useLoad(() => getMyGroups(supabase, userId), userId);
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
    router.push({ pathname: "/groupe/[id]", params: { id: r.id } });
  }

  async function onJoin() {
    setBusy("join");
    const r = await joinGroup(supabase, code);
    setBusy(null);
    if (!r.ok) return setFormError({ join: r.error });
    setCode("");
    setFormError({});
    router.push({ pathname: "/groupe/[id]", params: { id: r.id } });
  }

  return (
    <Screen title={tg.title} refreshing={refreshing} onRefresh={refresh}>
      <ErrorText>{error}</ErrorText>
      {!data && !error ? <Loading /> : null}
      {data && data.length === 0 ? <Muted>{tg.none}</Muted> : null}
      {data?.map((g) => (
        <Link key={g.id} href={{ pathname: "/groupe/[id]", params: { id: g.id } }} asChild>
          <Pressable accessibilityRole="link">
            <Card>
              <Body bold>{g.name}</Body>
              <Row>
                <Muted>{tg.members(g.memberCount)}</Muted>
                {g.role === "admin" ? <Badge>{tg.admin}</Badge> : null}
              </Row>
            </Card>
          </Pressable>
        </Link>
      ))}

      <Heading>{tg.createTitle}</Heading>
      <Card>
        <Muted>{tg.createHint}</Muted>
        <Field label={tg.nameLabel} placeholder={tg.namePlaceholder} value={name} onChangeText={setName} maxLength={60} />
        <ErrorText>{formError.create}</ErrorText>
        <Button label={busy === "create" ? tg.creating : tg.create} busy={busy === "create"} disabled={busy !== null || !name.trim()} onPress={() => void onCreate()} />
      </Card>

      <Heading>{tg.inviteTitle}</Heading>
      <Card>
        <Muted>{tg.inviteHint}</Muted>
        <View style={{ gap: space.sm }}>
          <Field label={tg.codeLabel} value={code} onChangeText={setCode} autoCapitalize="none" autoCorrect={false} />
          <ErrorText>{formError.join}</ErrorText>
          <Button label={tg.continue} variant="secondary" busy={busy === "join"} disabled={busy !== null || !code.trim()} onPress={() => void onJoin()} />
        </View>
      </Card>
    </Screen>
  );
}
