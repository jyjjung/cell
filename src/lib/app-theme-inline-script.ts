import {
  APP_THEME_LIST,
  APP_THEME_STORAGE_KEY,
  DEFAULT_APP_THEME_ID,
  LEGACY_THEME_ALIASES,
  getAppThemeTokens,
  type ColorPaletteTokens,
} from './app-themes';
import { TOKEN_CSS_MAP } from './apply-color-palette';

type ThemePack = Record<string, ColorPaletteTokens>;

function themePacks(): ThemePack {
  const packs: ThemePack = {};
  for (const theme of APP_THEME_LIST) {
    packs[`${theme.id}:light`] = getAppThemeTokens(theme.id, false);
    packs[`${theme.id}:dark`] = getAppThemeTokens(theme.id, true);
  }
  return packs;
}

/**
 * Blocking script: apply stored appearance before React hydrates so Replay
 * does not treat the palette CSS-var write as a hydration mismatch.
 */
export function getAppThemeInlineScript(): string {
  const packs = JSON.stringify(themePacks());
  const cssMap = JSON.stringify(TOKEN_CSS_MAP);
  const known = JSON.stringify(
    Object.fromEntries(APP_THEME_LIST.map((t) => [t.id, t.id])),
  );
  const aliases = JSON.stringify(LEGACY_THEME_ALIASES);
  return `(function(){try{
var packs=${packs};
var cssMap=${cssMap};
var known=${known};
var aliases=${aliases};
var storedTheme=localStorage.getItem(${JSON.stringify(APP_THEME_STORAGE_KEY)})||${JSON.stringify(DEFAULT_APP_THEME_ID)};
var id=known[storedTheme]?storedTheme:(aliases[storedTheme]||${JSON.stringify(DEFAULT_APP_THEME_ID)});
var mode=localStorage.getItem('theme')||'system';
var isDark=mode==='dark'||(mode==='system'&&window.matchMedia('(prefers-color-scheme: dark)').matches);
var root=document.documentElement;
if(isDark)root.classList.add('dark');else root.classList.remove('dark');
root.style.colorScheme=isDark?'dark':'light';
if(id===${JSON.stringify(DEFAULT_APP_THEME_ID)}&&isDark)return;
var tokens=packs[id+(isDark?':dark':':light')];
if(!tokens)return;
root.setAttribute('data-app-theme',id);
root.setAttribute('data-app-theme-mode',isDark?'dark':'light');
root.setAttribute('data-palette',id);
for(var key in cssMap){if(tokens[key]!=null)root.style.setProperty(cssMap[key],tokens[key]);}
}catch(e){}})();`.replace(/\s+/g, ' ');
}
