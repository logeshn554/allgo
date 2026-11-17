/**
 * AllGo Supported Internationalization (i18n) Languages
 *
 * Launch languages: Tamil ('ta') and English ('en')
 * Next rollout: Hindi ('hi')
 */
export declare const SupportedLanguage: {
    readonly EN: "en";
    readonly TA: "ta";
    readonly HI: "hi";
};
export type SupportedLanguage = (typeof SupportedLanguage)[keyof typeof SupportedLanguage];
export declare const SupportedLanguages: {
    readonly EN: "en";
    readonly TA: "ta";
    readonly HI: "hi";
};
export type SupportedLanguageCode = 'en' | 'ta' | 'hi';
/**
 * Languages supported at Day-1 launch across Customer, Partner, and Merchant apps
 */
export declare const LAUNCH_LANGUAGES: readonly SupportedLanguageCode[];
/**
 * Scheduled next language additions
 */
export declare const NEXT_LANGUAGES: readonly SupportedLanguageCode[];
/**
 * All officially planned language codes
 */
export declare const ALL_SUPPORTED_LANGUAGES: readonly SupportedLanguageCode[];
export interface LanguageMeta {
    code: SupportedLanguageCode;
    name: string;
    nativeName: string;
    isRtl: boolean;
    isLaunchSupported: boolean;
}
export declare const LANGUAGE_REGISTRY: Record<SupportedLanguageCode, LanguageMeta>;
//# sourceMappingURL=languages.d.ts.map