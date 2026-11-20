import { Platform } from 'react-native';
import { Asset } from 'expo-asset';
import {
  PlusJakartaSans_400Regular,
  PlusJakartaSans_500Medium,
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold,
  PlusJakartaSans_800ExtraBold,
} from '@expo-google-fonts/plus-jakarta-sans';

// react-native-web gives every <Text>/<TextInput> without a fontFamily of
// its own the system stack ("-apple-system, ..."). We put our brand face in
// front of that stack wherever it appears, so the whole website uses Plus
// Jakarta Sans at the right weight for each fontWeight, while styles that
// name a font (Bricolage titles) keep theirs. Class names differ between
// dev and production builds, so we rewrite the rule text, not a selector.
const SYSTEM = '-apple-system';
const BRAND = `MagicSans,${SYSTEM}`;
const brandify = (css: string) => (css.includes(SYSTEM) && !css.includes('MagicSans') ? css.split(SYSTEM).join(BRAND) : css);

function patchStyleSheets(): void {
  for (const sheet of Array.from(document.styleSheets)) {
    let rules: CSSRuleList;
    try {
      rules = sheet.cssRules;
    } catch {
      continue;
    }
    for (const rule of Array.from(rules)) {
      const st = (rule as CSSStyleRule).style;
      if (st?.fontFamily?.includes(SYSTEM) && !st.fontFamily.includes('MagicSans')) {
        st.fontFamily = `MagicSans, ${st.fontFamily}`;
      }
    }
  }
  // Rules react-native-web adds later go through insertRule.
  const proto = CSSStyleSheet.prototype as CSSStyleSheet & { __mmBrand?: boolean };
  if (proto.__mmBrand) return;
  proto.__mmBrand = true;
  const insert = proto.insertRule;
  proto.insertRule = function (rule: string, index?: number) {
    return insert.call(this, brandify(rule), index);
  };
}

const FACES: [string, number][] = [
  ['100 400', PlusJakartaSans_400Regular],
  ['500', PlusJakartaSans_500Medium],
  ['600', PlusJakartaSans_600SemiBold],
  ['700', PlusJakartaSans_700Bold],
  ['800 900', PlusJakartaSans_800ExtraBold],
];

export function installWebBrandFont(): void {
  if (Platform.OS !== 'web' || typeof document === 'undefined') return;
  const id = 'magicmeat-brand-font';
  if (document.getElementById(id)) return;
  const faces = FACES.map(([weight, mod]) => {
    const uri = Asset.fromModule(mod).uri;
    return `@font-face{font-family:'MagicSans';font-style:normal;font-weight:${weight};font-display:swap;src:url("${uri}") format("truetype");}`;
  }).join('');
  const style = document.createElement('style');
  style.id = id;
  style.textContent = `${faces}
html{-webkit-font-smoothing:antialiased;-moz-osx-font-smoothing:grayscale;text-rendering:optimizeLegibility;}`;
  document.head.appendChild(style);
  patchStyleSheets();
}

// Install before the first render so even the first rules get the brand font.
installWebBrandFont();
