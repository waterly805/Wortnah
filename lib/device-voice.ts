export type DeviceVoicePreference = "auto" | "female" | "male";

export type DeviceVoice = {
  name: string;
  lang: string;
  default?: boolean;
  localService?: boolean;
};

const FEMALE_NAMES = /(anna|katja|helena|marlene|petra|vicki|victoria|amelie|seraphina|sophie|female)/i;
const MALE_NAMES = /(markus|martin|conrad|hans|stefan|thomas|daniel|male)/i;
const NATURAL_VOICE_HINTS = /(enhanced|premium|natural|neural|google|microsoft|siri)/i;
const ROBOTIC_VOICE_HINTS = /(espeak|compact|mbrola|festival)/i;

function normalizeLocale(locale: string) {
  return locale.replace("_", "-").toLocaleLowerCase();
}

export function selectNaturalDeviceVoice<T extends DeviceVoice>(
  voices: T[],
  locale: string,
  preference: DeviceVoicePreference,
): T | undefined {
  const requestedLocale = normalizeLocale(locale);
  const requestedLanguage = requestedLocale.split("-")[0];
  const preferredPattern = preference === "female" ? FEMALE_NAMES : preference === "male" ? MALE_NAMES : null;
  const candidates = voices.filter((voice) => normalizeLocale(voice.lang).split("-")[0] === requestedLanguage);

  return candidates
    .map((voice, index) => {
      const voiceLocale = normalizeLocale(voice.lang);
      let score = voiceLocale === requestedLocale ? 100 : 60;
      if (preferredPattern?.test(voice.name)) score += 35;
      if (NATURAL_VOICE_HINTS.test(voice.name)) score += 25;
      if (voice.default) score += 8;
      if (voice.localService === false) score += 4;
      if (ROBOTIC_VOICE_HINTS.test(voice.name)) score -= 80;
      return { voice, score, index };
    })
    .sort((left, right) => right.score - left.score || left.index - right.index)[0]?.voice;
}
