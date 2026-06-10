import { activeCopyLocale, type AppCopyLocale } from "../config/appMode";
import { enCopy, type AppCopy } from "./en";
import { koCopy } from "./ko";

export type { AppCopy };
export type CopyKeyLocale = AppCopyLocale;

export const copyCatalog = {
  ko: koCopy,
  en: enCopy,
} satisfies Record<AppCopyLocale, AppCopy>;

export const appCopy = copyCatalog[activeCopyLocale];

export { enCopy, koCopy };
