# Global I18n & Translation Standards (SSOT)

> [!IMPORTANT]
> **READ BEFORE CONTRIBUTING.**
> To maintain the integrity of the Smart BLE ecosystem across 5 GUI platforms (Flutter, UniApp, iOS, Android, Tauri) and the Official Documentation Website, all language operations **MUST STRICTLY OBEY** the Single Source of Truth protocols detailed in this document.

---

## 1. Official Website Documentation (VitePress)

Our official website enforces a rigid **Chinese-Draft-First** mapping rule to prevent 404 dead links when overseas users switch languages.

### The "Phantom Mapping" Rule
The root directory `docs/` represents the `zh-CN` Source of Truth. The `docs/en/` directory is the `en-US` proxy.

When you contribute a new Markdown API guide or architecture document:
1. **Author the original `zh-CN` version**: Place your file in `.docs/YOUR_FILE.md`.
2. **Mandatory English Phantom Copy**: Before making a Pull Request, you **MUST** create the exact same file path in `docs/en/YOUR_FILE.md`.
3. **WIP Warning Injection**: If you do not have time to professionally translate the page to English, you must inject the following snippet at the top of the English file, followed directly by copying the original Chinese text underneath it:
```markdown
> [!NOTE]
> English translation is currently work-in-progress. Displaying the original Chinese text for now.
```
*Purpose:* This guarantees the UI language dropdown in VitePress NEVER triggers a fatal 404 route error for overseas readers.

### Sidebar Synchronization
If you modify the array inside `themeConfig.sidebar` in `docs/.vitepress/config.mjs`, you *must* manually cascade that change into the `locales.en.themeConfig.sidebar` object. They must maintain **1:1 structural parity** at all times.

---

## 2. Frontend Applications (Cross-Platform UI Strings)

With UI clients existing in Dart (Flutter), Vue (UniApp), HTML/JS (Tauri), and Swift/Kotlin (Native Mobile), writing hardcoded strings inside views is universally **BANNED**.

### Core Dictionary (Single Source of Truth)
Every single text string rendered in any application belongs in the Central Meta Dictionary:
- `core/assets-generator/meta/i18n_zh-CN.json`
- `core/assets-generator/meta/i18n_en-US.json`

### Generation Pipeline
No developer is permitted to manually edit the `AppLocalizations`, `vue-i18n` scripts, or localized `.strings` files. 

When you add a new translation key to the JSON files above, you must run the automated script payload housed inside `core/assets-generator`. The script will output perfectly typed bindings and automatically distribute them to `apps/flutter/...`, `apps/uniapp/...`, and `apps/desktop/...`.

*Failure to comply with the SSOT generator rule will result in the immediate closure of your Pull Request.*
