/**
 * The preferences this fork added on top of Crest, stored as one nested block
 * (`extras` in `settings.json`) and written whole by `set_extras`.
 *
 * Mirrors `Extras` in `settings.rs`. The two default sets have to agree: Rust's
 * is what a fresh `settings.json` gets, this one is what paints before the file
 * has been read.
 */
export interface Extras {
  mascot: boolean
  minimalNotch: boolean
  hideInFullscreen: boolean
  hudVolume: boolean
  hudBrightness: boolean
  hudCapsLock: boolean
  hudLanguage: boolean
  waterReminders: boolean
  waterGoalMl: number
  waterSipMl: number
  waterStartHour: number
  waterEndHour: number
  waterEveryMin: number
  prayerAlerts: boolean
  /** Aladhan calculation method id. 1 = University of Islamic Sciences, Karachi. */
  prayerMethod: number
  /** 0 = Shafi'i/standard Asr, 1 = Hanafi Asr. */
  prayerSchool: number
  fiverrAlerts: boolean
  fiverrSound: boolean
}

export const EXTRAS_DEFAULTS: Extras = {
  mascot: true,
  minimalNotch: false,
  hideInFullscreen: true,
  hudVolume: true,
  hudBrightness: true,
  hudCapsLock: true,
  hudLanguage: true,
  waterReminders: true,
  waterGoalMl: 2000,
  waterSipMl: 250,
  waterStartHour: 9,
  waterEndHour: 21,
  waterEveryMin: 60,
  prayerAlerts: true,
  prayerMethod: 1,
  prayerSchool: 1,
  fiverrAlerts: true,
  fiverrSound: true,
}

/** A pop-up reported by `hud.rs`. */
export type HudEvent =
  | { kind: 'volume'; level: number; muted: boolean }
  | { kind: 'brightness'; level: number }
  | { kind: 'capsLock'; on: boolean }
  | { kind: 'language'; locale: string }

/** The calculation methods worth offering, by Aladhan id. */
export const PRAYER_METHODS: { id: number; label: string }[] = [
  { id: 1, label: 'Karachi (University of Islamic Sciences)' },
  { id: 2, label: 'ISNA (North America)' },
  { id: 3, label: 'Muslim World League' },
  { id: 4, label: 'Umm al-Qura, Makkah' },
  { id: 5, label: 'Egyptian General Authority' },
  { id: 8, label: 'Gulf Region' },
  { id: 13, label: 'Diyanet, Turkey' },
  { id: 15, label: 'Moonsighting Committee' },
]
