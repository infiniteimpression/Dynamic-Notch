//! Prayer times, from the Aladhan API.
//!
//! Built the way `weather.rs` is and for the same reasons: the request is made
//! here rather than with `fetch` in the webview so the app's external I/O sits
//! behind an `invoke` with a timeout and an honest user agent, and there is no
//! key to ship. The location is the weather place the user already chose — no
//! IP lookup, no Windows location prompt.
//!
//! One day's timings are cached per (date, place, method, school), so the card,
//! the pill and the alert all reading the same day costs one request.

use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::Mutex;
use std::time::Duration;

const TIMEOUT: Duration = Duration::from_secs(10);
const USER_AGENT: &str = concat!("Jhalak/", env!("CARGO_PKG_VERSION"), " (prayer times)");

#[derive(Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct PrayerDay {
    /// The day these are for, `YYYY-MM-DD` in the place's own calendar.
    pub date: String,
    /// "14 Jumada al-Ula 1448".
    pub hijri: String,
    /// In order: Fajr, Sunrise, Dhuhr, Asr, Maghrib, Isha. `HH:MM`, 24h, the
    /// place's local time.
    pub times: Vec<PrayerTime>,
}

#[derive(Serialize, Clone)]
pub struct PrayerTime {
    pub name: String,
    pub time: String,
}

#[derive(Deserialize)]
struct Response {
    data: Data,
}

#[derive(Deserialize)]
struct Data {
    timings: HashMap<String, String>,
    date: DateInfo,
}

#[derive(Deserialize)]
struct DateInfo {
    hijri: Hijri,
}

#[derive(Deserialize)]
struct Hijri {
    day: String,
    year: String,
    month: HijriMonth,
}

#[derive(Deserialize)]
struct HijriMonth {
    en: String,
}

static CACHE: Mutex<Option<(String, PrayerDay)>> = Mutex::new(None);

const ORDER: [&str; 6] = ["Fajr", "Sunrise", "Dhuhr", "Asr", "Maghrib", "Isha"];

/// Aladhan sometimes appends the zone — "05:12 (PKT)". Keep the clock only.
fn clean(raw: &str) -> String {
    raw.split_whitespace().next().unwrap_or("").to_string()
}

/// `date` is `YYYY-MM-DD` as the frontend sees today, so the day rolls over on
/// the user's clock rather than on whatever the server thinks the date is.
#[tauri::command]
pub async fn get_prayer_times(
    latitude: f64,
    longitude: f64,
    method: u32,
    school: u32,
    date: String,
) -> Result<PrayerDay, String> {
    let key = format!("{date}|{latitude:.4}|{longitude:.4}|{method}|{school}");
    if let Ok(cache) = CACHE.lock() {
        if let Some((cached_key, day)) = cache.as_ref() {
            if *cached_key == key {
                return Ok(day.clone());
            }
        }
    }

    let parts: Vec<&str> = date.split('-').collect();
    if parts.len() != 3 {
        return Err("bad date".into());
    }
    let url = format!(
        "https://api.aladhan.com/v1/timings/{}-{}-{}?latitude={latitude}&longitude={longitude}&method={method}&school={school}",
        parts[2], parts[1], parts[0]
    );

    let client = reqwest::Client::builder()
        .timeout(TIMEOUT)
        .user_agent(USER_AGENT)
        .build()
        .map_err(|e| e.to_string())?;
    let response = client.get(&url).send().await.map_err(|e| {
        if e.is_timeout() {
            "Prayer times took too long to load".to_string()
        } else {
            "Couldn't reach the prayer times service".to_string()
        }
    })?;
    if !response.status().is_success() {
        return Err(format!("Prayer times service said {}", response.status().as_u16()));
    }
    let body: Response = response
        .json()
        .await
        .map_err(|_| "Prayer times came back in a shape we don't understand".to_string())?;

    let times = ORDER
        .iter()
        .filter_map(|name| {
            body.data.timings.get(*name).map(|time| PrayerTime {
                name: (*name).to_string(),
                time: clean(time),
            })
        })
        .collect::<Vec<_>>();
    if times.len() != ORDER.len() {
        return Err("Prayer times were incomplete".into());
    }

    let hijri = &body.data.date.hijri;
    let day = PrayerDay {
        date,
        hijri: format!("{} {} {}", hijri.day, hijri.month.en, hijri.year),
        times,
    };

    if let Ok(mut cache) = CACHE.lock() {
        *cache = Some((key, day.clone()));
    }
    Ok(day)
}
