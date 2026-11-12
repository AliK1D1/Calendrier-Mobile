/**
 * Textes de l'app : les mêmes messages que le site (src/lib/i18n/messages), en français pour
 * l'instant. L'anglais viendra avec le choix de langue dans le Profil.
 */
import type { Locale } from "@/lib/i18n/config";
import { getMessages } from "@/lib/i18n/messages";

export const locale: Locale = "fr";
export const t = getMessages(locale);
