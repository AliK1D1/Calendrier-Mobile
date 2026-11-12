import { formatInTimeZone } from "date-fns-tz";
import * as WebBrowser from "expo-web-browser";
import { useState } from "react";
import { View } from "react-native";

import { Badge, Body, Button, Card, ErrorText, Loading, Muted, Row, Screen } from "@/components/ui";
import { mondayOf, weekAgenda } from "@/features/agenda";
import { getMyBusyBlocks } from "@/lib/profile";
import { TIME_ZONE } from "@/lib/scheduling/time";
import { useAuthed } from "@/services/session";
import { SITE_URL } from "@/services/site";
import { useLoad } from "@/services/use-load";
import { space } from "@/theme/colors";
import { usePalette } from "@/theme/use-palette";

const SOURCE_LABEL: Record<string, string> = {
  meetup: "Plan de groupe",
  study: "Étude",
  ics: "Importé",
  outlook: "Outlook",
};

/** Mon horaire, une semaine à la fois, en liste. La modification reste sur le site pour l'instant. */
export default function Horaire() {
  const { supabase, userId } = useAuthed();
  const c = usePalette();
  const [offset, setOffset] = useState(0);
  const { data, error, refreshing, refresh } = useLoad(() => getMyBusyBlocks(supabase, userId), userId);

  const today = formatInTimeZone(new Date(), TIME_ZONE, "yyyy-MM-dd");
  const days = data ? weekAgenda(data, mondayOf(today, offset), today) : null;
  const total = days?.reduce((n, d) => n + d.items.length, 0) ?? 0;

  return (
    <Screen title="Mon horaire" refreshing={refreshing} onRefresh={refresh}>
      <Row>
        <View style={{ flex: 1 }}>
          <Button label="‹ Semaine d'avant" variant="secondary" onPress={() => setOffset((o) => o - 1)} />
        </View>
        <View style={{ flex: 1 }}>
          <Button label="Semaine d'après ›" variant="secondary" onPress={() => setOffset((o) => o + 1)} />
        </View>
      </Row>
      {offset !== 0 ? <Button label="Revenir à cette semaine" variant="secondary" onPress={() => setOffset(0)} /> : null}
      <ErrorText>{error}</ErrorText>
      {!days && !error ? <Loading /> : null}
      {days && total === 0 ? <Muted>Rien à ton horaire cette semaine.</Muted> : null}
      {days?.map((d) => (
        <Card key={d.day} style={d.isToday ? { borderColor: c.primary, borderWidth: 2 } : undefined}>
          <Row>
            <Body bold>{d.label.charAt(0).toUpperCase() + d.label.slice(1)}</Body>
            {d.isToday ? <Badge>Aujourd&apos;hui</Badge> : null}
          </Row>
          {d.items.length === 0 ? <Muted>Libre toute la journée</Muted> : null}
          {d.items.map((i) => (
            <View key={i.id} style={{ flexDirection: "row", gap: space.md, alignItems: "baseline" }}>
              <Muted>{i.timeLabel}</Muted>
              <View style={{ flex: 1 }}>
                <Body>{i.title}</Body>
                {i.source && SOURCE_LABEL[i.source] ? <Muted>{SOURCE_LABEL[i.source]}</Muted> : null}
              </View>
            </View>
          ))}
        </Card>
      ))}
      <Muted>Pour ajouter ou modifier des cours, importer un .ics ou planifier ton étude, utilise le site (bientôt dans l&apos;app).</Muted>
      <Button label="Modifier sur le site" variant="secondary" onPress={() => void WebBrowser.openBrowserAsync(`${SITE_URL}/horaire`)} />
    </Screen>
  );
}
