//! Small JSON stores for the cards this fork added — the water log, the to-do
//! list and the Fiverr inbox log.
//!
//! `notes.rs` and `reminders.rs` again, with one difference: the shape belongs
//! to the frontend. Rust keeps no typed copy, because nothing native ever reads
//! a sip or a task, and a second definition here would be one more thing to keep
//! in step for no reader. What Rust does own is *which* files exist — the name
//! is matched against a fixed list, so a webview call can never be turned into a
//! write somewhere else on disk.

use std::fs;
use std::path::PathBuf;
use tauri::{AppHandle, Manager};

const STORES: &[&str] = &["water", "todos", "fiverr"];

fn store_path(app: &AppHandle, name: &str) -> Result<PathBuf, String> {
    if !STORES.contains(&name) {
        return Err(format!("unknown store {name:?}"));
    }
    let dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("no app data dir: {e}"))?;
    fs::create_dir_all(&dir).map_err(|e| format!("could not create {dir:?}: {e}"))?;
    Ok(dir.join(format!("{name}.json")))
}

/// The stored value, or `null` when there is none yet (or it does not parse —
/// the card starts empty rather than refusing to open over one bad file).
#[tauri::command]
pub fn read_store(app: AppHandle, name: String) -> Result<serde_json::Value, String> {
    let path = store_path(&app, &name)?;
    if !path.exists() {
        return Ok(serde_json::Value::Null);
    }
    let raw = fs::read_to_string(&path).map_err(|e| format!("could not read {path:?}: {e}"))?;
    Ok(serde_json::from_str(raw.trim_start_matches('\u{feff}')).unwrap_or(serde_json::Value::Null))
}

/// Written whole, through a temp file and a rename, so a crash mid-write leaves
/// the previous file rather than half of a new one.
#[tauri::command]
pub fn write_store(app: AppHandle, name: String, value: serde_json::Value) -> Result<(), String> {
    let path = store_path(&app, &name)?;
    let payload = serde_json::to_string_pretty(&value).map_err(|e| e.to_string())?;
    let tmp = path.with_extension("json.tmp");
    fs::write(&tmp, payload).map_err(|e| format!("could not write {tmp:?}: {e}"))?;
    fs::rename(&tmp, &path).map_err(|e| format!("could not replace {path:?}: {e}"))?;
    Ok(())
}
