class I18nManager {
    constructor() {
        // Default to system language or saved preference
        const savedLang = localStorage.getItem('app_lang');
        const sysLang = navigator.language === 'zh-CN' ? 'zh-CN' : 'en-US';
        this.currentLocale = savedLang || sysLang;
        this.dictionary = {};
    }

    async init() {
        await this.loadLocale(this.currentLocale);
    }

    async loadLocale(locale) {
        // Fallback checks
        if (!['zh-CN', 'en-US'].includes(locale)) locale = 'en-US';

        try {
            const resp = await fetch(`./locales/${locale}.json`);
            this.dictionary = await resp.json();
            this.currentLocale = locale;
            localStorage.setItem('app_lang', locale);
            document.documentElement.lang = locale.split('-')[0];
            
            this.translateDOM();
            
            // Dispatch event so other components (Web Components) can translate dynamic strings
            window.dispatchEvent(new CustomEvent('language-changed', { detail: { locale, dictionary: this.dictionary } }));
            return true;
        } catch (e) {
            console.error('Failed to load locale:', locale, e);
            return false;
        }
    }

    // Get translated string with optional interpolation
    t(key, params = {}) {
        let str = this.dictionary[key] || key;
        for (const [k, v] of Object.entries(params)) {
             str = str.replace(`{${k}}`, v);
        }
        return str;
    }

    // Translate statically tagged elements
    translateDOM(root = document) {
        // Support custom shadow roots
        const elements = root.querySelectorAll('[data-i18n]');
        elements.forEach(el => {
            const key = el.getAttribute('data-i18n');
            const translation = this.t(key);
            
            if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
                el.placeholder = translation;
            } else if (el.hasAttribute('title') && translation) {
                // If it's used as a tooltip/title
                el.title = translation;
            } else {
                // Determine if we need to preserve HTML inside, standard is textContent
                el.textContent = translation;
            }
        });
    }
}

// Instantiate globally
window.i18n = new I18nManager();
