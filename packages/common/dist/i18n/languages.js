/**
 * AllGo Supported Internationalization (i18n) Languages
 *
 * Launch languages: Tamil ('ta') and English ('en')
 * Next rollout: Hindi ('hi')
 */
export const SupportedLanguage = {
    EN: 'en',
    TA: 'ta',
    HI: 'hi',
};
export const SupportedLanguages = {
    EN: 'en',
    TA: 'ta',
    HI: 'hi',
};
/**
 * Languages supported at Day-1 launch across Customer, Partner, and Merchant apps
 */
export const LAUNCH_LANGUAGES = ['en', 'ta'];
/**
 * Scheduled next language additions
 */
export const NEXT_LANGUAGES = ['hi'];
/**
 * All officially planned language codes
 */
export const ALL_SUPPORTED_LANGUAGES = ['en', 'ta', 'hi'];
export const LANGUAGE_REGISTRY = {
    en: {
        code: 'en',
        name: 'English',
        nativeName: 'English',
        isRtl: false,
        isLaunchSupported: true,
    },
    ta: {
        code: 'ta',
        name: 'Tamil',
        nativeName: 'தமிழ்',
        isRtl: false,
        isLaunchSupported: true,
    },
    hi: {
        code: 'hi',
        name: 'Hindi',
        nativeName: 'हिन्दी',
        isRtl: false,
        isLaunchSupported: false,
    },
};
//# sourceMappingURL=languages.js.map