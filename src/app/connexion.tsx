import { Link } from "expo-router";
import { useState } from "react";
import { KeyboardAvoidingView, Platform, View } from "react-native";

import { Body, Button, Card, ErrorText, Field, Muted, Screen, Title } from "@/components/ui";
import { loginErrorCode, normalizeEmail, validateLogin } from "@/features/auth";
import { t } from "@/services/i18n";
import { useSession } from "@/services/session";
import { space } from "@/theme/colors";
import { usePalette } from "@/theme/use-palette";

/** Connexion par courriel + mot de passe : le même compte que sur le site. */
export default function Connexion() {
  const { supabase } = useSession();
  const c = usePalette();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(supabase ? null : t.auth.errors.config);
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (!supabase) return;
    const mail = normalizeEmail(email);
    const invalid = validateLogin(mail, password);
    if (invalid) {
      setError(t.auth.errors[invalid] ?? t.auth.errors.echec);
      return;
    }
    setBusy(true);
    setError(null);
    const { error: err } = await supabase.auth.signInWithPassword({ email: mail, password });
    setBusy(false);
    // Réussite : la session change et l'app passe aux onglets toute seule.
    if (err) setError(t.auth.errors[loginErrorCode(err)] ?? t.auth.errors.echec);
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <Screen>
        <View style={{ gap: space.xs, marginTop: space.xl }}>
          <Body bold>Freecrew</Body>
          <Title>{t.auth.title}</Title>
          <Muted>{t.auth.description}</Muted>
        </View>
        <Card>
          <Field
            label={t.auth.email}
            placeholder={t.auth.emailPlaceholder}
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            textContentType="emailAddress"
            inputMode="email"
          />
          <Field
            label={t.auth.password}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoComplete="current-password"
            textContentType="password"
            onSubmitEditing={() => void submit()}
            returnKeyType="go"
          />
          <ErrorText>{error}</ErrorText>
          <Button label={t.auth.signIn} onPress={() => void submit()} busy={busy} disabled={!supabase} />
        </Card>
        <View style={{ flexDirection: "row", gap: space.sm, flexWrap: "wrap", alignItems: "center" }}>
          <Muted>{t.auth.noAccount}</Muted>
          <Link href="/inscription" style={{ color: c.primary, fontSize: 15, fontWeight: "600" }}>
            {t.auth.createAccount}
          </Link>
        </View>
      </Screen>
    </KeyboardAvoidingView>
  );
}
