import { Link } from "expo-router";
import { useRef, useState } from "react";
import { KeyboardAvoidingView, Platform, View } from "react-native";

import { BrandHeader } from "@/components/brand";
import { Button, Card, ErrorText, Field, Muted, Screen } from "@/components/ui";
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
  // Verrou immédiat : bloque un 2e appui (ou la touche « Envoyer » du clavier) avant le rendu.
  const sending = useRef(false);

  async function submit() {
    if (!supabase || sending.current) return;
    const mail = normalizeEmail(email);
    const invalid = validateLogin(mail, password);
    if (invalid) {
      setError(t.auth.errors[invalid] ?? t.auth.errors.echec);
      return;
    }
    sending.current = true;
    setBusy(true);
    setError(null);
    try {
      const { error: err } = await supabase.auth.signInWithPassword({ email: mail, password });
      // Réussite : la session change et l'app passe aux onglets toute seule.
      if (err) setError(t.auth.errors[loginErrorCode(err)] ?? t.auth.errors.echec);
    } catch {
      setError(t.auth.errors.echec);
    } finally {
      sending.current = false;
      setBusy(false);
    }
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <Screen edges={["top"]}>
        <BrandHeader title={t.auth.title} text={t.auth.description} />
        <Card style={{ gap: space.md }}>
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
        <View style={{ flexDirection: "row", gap: space.sm, flexWrap: "wrap", alignItems: "center", justifyContent: "center" }}>
          <Muted>{t.auth.noAccount}</Muted>
          <Link href="/inscription" style={{ color: c.primary, fontSize: 15, fontWeight: "600" }}>
            {t.auth.createAccount}
          </Link>
        </View>
      </Screen>
    </KeyboardAvoidingView>
  );
}
