import {
  BUILTIN_THEME_PREFERENCES,
  CUSTOM_VAR_NAME_RE,
  CUSTOM_VAR_VALUE_RE,
  CUSTOM_VARS_MAX,
  DEFAULT_THEME_PREFERENCE,
  SYSTEM_LIGHT_MEDIA_QUERY,
  THEME_SAFE_MODE_QUERY_RE,
  THEME_STORAGE_KEY,
} from "@/lib/theme/themePreference";
import {
  GRADIENT_STOPS_MIN,
  HEADER_GRADIENT_STOPS_MAX,
  HEX_COLOR_RE,
} from "@/lib/theme/customTheme";
import {
  SEASONAL_THEME_ENDS_AT,
  SEASONAL_THEME_ID,
  SEASONAL_THEME_NAME,
  SEASONAL_THEME_STARTS_AT,
  SEASONAL_THEME_STORAGE_KEY,
} from "@/lib/theme/seasonalTheme";

const builtinModeCheck = BUILTIN_THEME_PREFERENCES.map(
  (mode) => `p.mode===${JSON.stringify(mode)}`,
).join("||");

/**
 * Inlined in `<head>` before paint to apply the stored theme without a flash. Self-contained ES5 that
 * cannot import anything; it must behave like `parseStoredThemeState` + `applyResolvedTheme` (covered
 * by its test). Custom variables pass the same strict regexes and `?tema=seguro` ignores them. On any
 * error the server's dark theme stays. An active seasonal theme (`readSeasonalThemeActive`) wins over
 * the stored one, which stays untouched underneath.
 */
export const THEME_BOOTSTRAP_SCRIPT = [
  "(function(){try{",
  `var d=document.documentElement,safe=/${THEME_SAFE_MODE_QUERY_RE.source}/.test(location.search),n=Date.now();`,
  `if(!safe&&n>=${SEASONAL_THEME_STARTS_AT}&&n<${SEASONAL_THEME_ENDS_AT}){var z=true;`,
  `try{var sv=JSON.parse(localStorage.getItem(${JSON.stringify(SEASONAL_THEME_STORAGE_KEY)}));if(sv&&sv.id===${JSON.stringify(SEASONAL_THEME_ID)}&&sv.enabled===false)z=false;}catch(e){}`,
  `if(z){d.setAttribute("data-theme","dark");d.classList.toggle("dark",true);d.style.colorScheme="dark";d.setAttribute("data-seasonal-theme",${JSON.stringify(SEASONAL_THEME_NAME)});d.setAttribute("data-theme-custom","true");d.setAttribute("data-theme-header-background","true");return;}}`,
  `var m=${JSON.stringify(DEFAULT_THEME_PREFERENCE)},c=null;`,
  `var raw=localStorage.getItem(${JSON.stringify(THEME_STORAGE_KEY)});`,
  "if(raw){var p=JSON.parse(raw);",
  `if(p&&(${builtinModeCheck}))m=p.mode;`,
  'else if(p&&p.mode==="custom"&&p.custom&&(p.custom.base==="dark"||p.custom.base==="light")&&p.custom.vars&&typeof p.custom.vars==="object"){m="custom";c=p.custom;}}',
  `var r=m==="system"?(matchMedia(${JSON.stringify(SYSTEM_LIGHT_MEDIA_QUERY)}).matches?"light":"dark"):m==="custom"?c.base:m;`,
  'd.setAttribute("data-theme",r);d.classList.toggle("dark",r==="dark");d.style.colorScheme=r;',
  'if(c&&!safe)d.setAttribute("data-theme-custom","true");',
  "if(c&&!safe){var k=Object.keys(c.vars);",
  `if(k.length<=${CUSTOM_VARS_MAX})for(var i=0;i<k.length;i++){var v=c.vars[k[i]];`,
  `if(/${CUSTOM_VAR_NAME_RE.source}/.test(k[i])&&typeof v==="string"&&/${CUSTOM_VAR_VALUE_RE.source}/.test(v))d.style.setProperty("--"+k[i],v);}}`,
  'if(c&&!safe&&c.headerBackground&&typeof c.headerBackground==="object"){var h=c.headerBackground,s=null;',
  `if(h.kind==="solid"&&typeof h.color==="string"&&/${HEX_COLOR_RE.source}/.test(h.color))s=h.color;`,
  `else if(h.kind==="gradient"&&Array.isArray(h.stops)&&h.stops.length>=${GRADIENT_STOPS_MIN}&&h.stops.length<=${HEADER_GRADIENT_STOPS_MAX}){`,
  "var a=[],prev=-1,ok=true;for(var j=0;j<h.stops.length;j++){var x=h.stops[j];",
  `if(!x||typeof x!=="object"||typeof x.color!=="string"||!/${HEX_COLOR_RE.source}/.test(x.color)||typeof x.pos!=="number"||x.pos%1!==0||x.pos<0||x.pos>100||x.pos<prev){ok=false;break;}prev=x.pos;a.push(x.color+" "+x.pos+"%");}`,
  'if(ok&&h.type==="linear"&&typeof h.angleDeg==="number"&&h.angleDeg%1===0&&h.angleDeg>=0&&h.angleDeg<=359)s="linear-gradient("+h.angleDeg+"deg, "+a.join(", ")+")";',
  'else if(ok&&h.type==="radial")s="radial-gradient(circle at center, "+a.join(", ")+")";}',
  'if(s){d.style.setProperty("--theme-header-background",s);d.setAttribute("data-theme-header-background","true");}}',
  "}catch(e){}})();",
].join("");
