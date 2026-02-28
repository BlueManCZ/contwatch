import i18n from "i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import { initReactI18next } from "react-i18next";

import cs from "./locales/cs/translation.json";
import en from "./locales/en/translation.json";

i18n.use(LanguageDetector)
    .use(initReactI18next)
    .init({
        resources: {
            en: { translation: en },
            cs: { translation: cs },
        },
        fallbackLng: "en",
        interpolation: {
            escapeValue: false,
        },
    });

export default i18n;
