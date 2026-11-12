import { router } from "expo-router";
import { useState } from "react";
import { KeyboardAvoidingView, Platform } from "react-native";

import { Button, Card, ErrorText, Field, Footnote, Screen } from "@/components/ui";
import { space } from "@/theme/colors";
import { normalizeEmail } from "@/features/auth";
import { normalizeUsername, passwordProblems, signUpErrorCode, validateSignup } from "@/lib/auth/signup";
import { t } from "@/services/i18n";
import { useSession } from "@/services/session";

const ts = t.auth.signup;

/** Création de compte : mêmes règles que le site (nom d'utilisateur, mot de passe 8+ Aa1). */
export default function Inscription() {
  const { supabase } = useSession();
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(supabase ? null : ts.errors.config);
  const [busy, setBusy] = useState(false);

  const missing = password ? passwordProblems(password).filter((p) => p !== "long") : [];

  async function submit() {
    if (!supabase) return;
    const input = {
      email: normalizeEmail(email),
      username: normalizeUsername(username),
      password,
      confirm,
    };
    const invalid = validateSignup(input);
    if (invalid) {
      setError(ts.errors[invalid] ?? ts.errors.echec);
      return;
    }
    setBusy(true);
    setError(null);
    const { data, error: err } = await supabase.auth.signUp({
      email: input.email,
      password,
      options: { data: { username: input.username } },
    });
    setBusy(false);
    if (err) {
      setError(ts.errors[signUpErrorCode(err)] ?? ts.errors.echec);
      return;
    }
    if (!data.session) {
      // « Confirm email » encore activé dans Supabase (voir le README du site).
      if (data.user && data.user.identities?.length === 0) setError(ts.errors.existe);
      else setError(t.auth.createdConfirm);
      return;
    }
    // Session créée : l'app passe aux onglets toute seule.
    if (router.canGoBack()) router.back();
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <Screen edges={[]} subtitle={ts.description}>
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
          />
          <Field
            label={ts.username}
            hint={ts.usernameHint}
            value={username}
            onChangeText={setUsername}
            autoCapitalize="none"
            autoComplete="username-new"
            autoCorrect={false}
            textContentType="username"
          />
          <Field
            label={ts.password}
            hint={ts.passwordHint}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoComplete="new-password"
            textContentType="newPassword"
          />
          {missing.length > 0 ? (
            <Footnote>{`Il manque : ${missing.map((p) => ts.rules[p]).join(", ")}.`}</Footnote>
          ) : null}
          <Field
            label={ts.confirm}
            value={confirm}
            onChangeText={setConfirm}
            secureTextEntry
            autoComplete="new-password"
            textContentType="newPassword"
            onSubmitEditing={() => void submit()}
          />
          <ErrorText>{error}</ErrorText>
          <Button label={ts.submit} onPress={() => void submit()} busy={busy} disabled={!supabase} />
        </Card>
      </Screen>
    </KeyboardAvoidingView>
  );
}
