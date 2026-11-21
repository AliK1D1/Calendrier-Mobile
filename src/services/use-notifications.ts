/**
 * Branché une fois dans la mise en page racine, quand on est connecté :
 * - réinscrit ce téléphone aux notifications poussées (si la personne les a activées) ;
 * - toucher une notification ouvre l'écran prévu (Plans), seulement parmi les écrans permis.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import * as Notifications from "expo-notifications";
import { router } from "expo-router";
import { useEffect, useRef } from "react";

import { routeDeNotification } from "@/features/notifications";

import { rafraichirPush } from "./notifications";

export function useNotifications(supabase: SupabaseClient | null, userId: string | null): void {
  useEffect(() => {
    if (supabase && userId) void rafraichirPush(supabase);
  }, [supabase, userId]);

  const reponse = Notifications.useLastNotificationResponse();
  const traitee = useRef<string | null>(null);
  useEffect(() => {
    if (!userId || !reponse || reponse.actionIdentifier !== Notifications.DEFAULT_ACTION_IDENTIFIER) return;
    const id = reponse.notification.request.identifier;
    if (traitee.current === id) return;
    traitee.current = id;
    const route = routeDeNotification(reponse.notification.request.content.data);
    if (route) router.push(route);
    void Notifications.clearLastNotificationResponseAsync();
  }, [reponse, userId]);
}
