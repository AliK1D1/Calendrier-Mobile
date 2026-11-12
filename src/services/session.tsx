/**
 * Session de la personne connectée, partagée par toute l'app. Supabase garde la session sur
 * le téléphone ; on écoute ses changements (connexion, déconnexion, jeton rafraîchi).
 */
import type { Session, SupabaseClient } from "@supabase/supabase-js";
import { createContext, type ReactNode, useContext, useEffect, useState } from "react";

import { getSupabase } from "./supabase";

interface SessionState {
  /** `undefined` pendant la lecture de la session au démarrage. */
  session: Session | null | undefined;
  supabase: SupabaseClient | null;
}

const SessionContext = createContext<SessionState>({ session: undefined, supabase: null });

export function SessionProvider({ children }: { children: ReactNode }) {
  const supabase = getSupabase();
  const [session, setSession] = useState<Session | null | undefined>(
    supabase ? undefined : null,
  );

  useEffect(() => {
    if (!supabase) return;
    let alive = true;
    void supabase.auth.getSession().then(({ data }) => {
      if (alive) setSession(data.session);
    });
    const { data } = supabase.auth.onAuthStateChange((_event, next) => setSession(next));
    return () => {
      alive = false;
      data.subscription.unsubscribe();
    };
  }, [supabase]);

  return <SessionContext value={{ session, supabase }}>{children}</SessionContext>;
}

export function useSession(): SessionState {
  return useContext(SessionContext);
}

/** Client + identifiant de la personne connectée (écrans protégés seulement). */
export function useAuthed(): { supabase: SupabaseClient; userId: string } {
  const { session, supabase } = useSession();
  if (!supabase || !session) throw new Error("Écran protégé ouvert sans session.");
  return { supabase, userId: session.user.id };
}
