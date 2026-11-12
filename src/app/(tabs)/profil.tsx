import Constants from "expo-constants";
import * as WebBrowser from "expo-web-browser";
import { useState } from "react";

import { Body, Button, Card, ErrorText, Loading, Muted, Screen } from "@/components/ui";
import { getMyProfile } from "@/lib/profile";
import { t } from "@/services/i18n";
import { useAuthed, useSession } from "@/services/session";
import { SITE_URL } from "@/services/site";
import { useLoad } from "@/services/use-load";

/** Mon compte : qui est connecté, réglages (sur le site pour l'instant), déconnexion. */
export default function Profil() {
  const { supabase, userId } = useAuthed();
  const { session } = useSession();
  const { data, error } = useLoad(() => getMyProfile(supabase, userId), userId);
  const [busy, setBusy] = useState(false);

  async function signOut() {
    setBusy(true);
    // La session change : l'app revient toute seule à l'écran de connexion.
    await supabase.auth.signOut();
    setBusy(false);
  }

  return (
    <Screen title="Profil">
      <ErrorText>{error}</ErrorText>
      {!data && !error ? <Loading /> : null}
      <Card>
        <Muted>{t.home.signedInAs}</Muted>
        <Body bold>{data?.display_name || t.home.user}</Body>
        {session?.user.email ? <Muted>{session.user.email}</Muted> : null}
      </Card>
      <Card>
        <Body bold>Réglages</Body>
        <Muted>
          Lieux, moyen de transport, heures calmes, couleurs, Outlook et calendriers abonnés : pour
          l&apos;instant, ces réglages se font sur le site. Ils s&apos;appliquent aussi à l&apos;app.
        </Muted>
        <Button label="Ouvrir mon profil sur le site" variant="secondary" onPress={() => void WebBrowser.openBrowserAsync(`${SITE_URL}/profil`)} />
      </Card>
      <Button label={t.home.signOut} variant="danger" busy={busy} onPress={() => void signOut()} />
      <Muted>{`Freecrew ${Constants.expoConfig?.version ?? ""}`}</Muted>
    </Screen>
  );
}
