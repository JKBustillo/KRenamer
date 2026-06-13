use crate::rename::{build_names, RenamePlan};
use serde::Serialize;
use std::collections::{HashMap, HashSet};
use std::path::{Path, PathBuf};

/// Caracteres no permitidos en nombres de archivo de Windows.
const INVALID_FILENAME_CHARS: &[char] = &['\\', '/', ':', '*', '?', '"', '<', '>', '|'];

/// Una entrada de archivo lista para mostrar y, más adelante, renombrar.
/// Se serializa a TS como `{ path, name }` (ver `src/types/fileEntry.ts`).
#[derive(Serialize)]
pub struct FileEntry {
    /// Ruta absoluta del archivo en disco.
    pub path: String,
    /// Nombre del archivo con extensión (sin la carpeta).
    pub name: String,
}

/// Escanea las rutas dadas (carpetas o archivos sueltos) y devuelve los
/// archivos encontrados ordenados con orden natural por nombre
/// (`Pag_2` antes de `Pag_10`).
///
/// - Si una ruta es una carpeta, se listan sus archivos del primer nivel
///   (sin recursión en subcarpetas — fuera de scope del MVP).
/// - Si una ruta es un archivo, se incluye directamente.
/// - Las rutas inexistentes se ignoran.
#[tauri::command]
pub fn scan(paths: Vec<String>) -> Result<Vec<FileEntry>, String> {
    let mut entries: Vec<FileEntry> = Vec::new();

    for raw_path in &paths {
        let path = Path::new(raw_path);
        if path.is_dir() {
            let read_dir = std::fs::read_dir(path).map_err(|e| e.to_string())?;
            for dir_entry in read_dir {
                let dir_entry = dir_entry.map_err(|e| e.to_string())?;
                let entry_path = dir_entry.path();
                if entry_path.is_file() {
                    entries.push(to_file_entry(&entry_path)?);
                }
            }
        } else if path.is_file() {
            entries.push(to_file_entry(path)?);
        }
    }

    entries.sort_by(|a, b| natord::compare_ignore_case(&a.name, &b.name));
    Ok(entries)
}

/// Una fila de la tabla de preview: el nombre actual de un archivo, el nombre
/// nuevo propuesto, y banderas de validación. Se serializa a TS como
/// `{ path, currentName, newName, invalid, collision }` (ver
/// `src/types/previewRow.ts`).
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PreviewRow {
    /// Ruta absoluta actual del archivo.
    pub path: String,
    /// Nombre actual del archivo (con extensión).
    pub current_name: String,
    /// Nombre nuevo propuesto (con extensión).
    pub new_name: String,
    /// `true` si el nombre nuevo contiene caracteres inválidos para Windows.
    pub invalid: bool,
    /// `true` si el destino choca: dos archivos del set apuntan al mismo
    /// nombre, o el destino pisaría un archivo existente fuera del set.
    pub collision: bool,
}

/// Genera la tabla de preview (actual → nuevo) para las rutas dadas y el plan,
/// sin tocar disco (solo lectura: escanea y comprueba existencia de destinos).
///
/// Marca cada fila con `invalid` (nombre nuevo con caracteres prohibidos en
/// Windows) y `collision` (dos destinos iguales entre sí, o un destino que
/// pisaría un archivo existente que no forma parte del set seleccionado).
#[tauri::command]
pub fn preview(paths: Vec<String>, plan: RenamePlan) -> Result<Vec<PreviewRow>, String> {
    let entries = scan(paths)?;
    let new_names = build_names(&plan, &entries);
    let dest_paths: Vec<PathBuf> = entries
        .iter()
        .zip(&new_names)
        .map(|(entry, new_name)| dest_path_for(entry, new_name))
        .collect();

    // Rutas de origen normalizadas, para saber qué destinos caen "dentro del set".
    let source_keys: HashSet<String> = entries
        .iter()
        .map(|entry| normalize_key(Path::new(&entry.path)))
        .collect();

    // Cuántas veces aparece cada destino: >1 significa destinos duplicados.
    let mut dest_counts: HashMap<String, usize> = HashMap::new();
    for dest in &dest_paths {
        *dest_counts.entry(normalize_key(dest)).or_insert(0) += 1;
    }

    let mut rows = Vec::with_capacity(entries.len());
    for ((entry, new_name), dest) in entries.iter().zip(&new_names).zip(&dest_paths) {
        let dest_key = normalize_key(dest);
        let duplicate_target = dest_counts.get(&dest_key).copied().unwrap_or(0) > 1;
        let clobbers_external = dest.exists() && !source_keys.contains(&dest_key);

        rows.push(PreviewRow {
            path: entry.path.clone(),
            current_name: entry.name.clone(),
            new_name: new_name.clone(),
            invalid: has_invalid_chars(new_name),
            collision: duplicate_target || clobbers_external,
        });
    }

    Ok(rows)
}

/// Ruta de destino de un archivo: su misma carpeta con el nombre nuevo.
fn dest_path_for(entry: &FileEntry, new_name: &str) -> PathBuf {
    match Path::new(&entry.path).parent() {
        Some(parent) => parent.join(new_name),
        None => PathBuf::from(new_name),
    }
}

/// Clave de comparación de rutas, en minúsculas porque el FS de Windows es
/// case-insensitive (`Foo.JPG` y `foo.jpg` colisionan).
fn normalize_key(path: &Path) -> String {
    path.to_string_lossy().to_lowercase()
}

/// `true` si el nombre contiene algún caracter prohibido en Windows.
fn has_invalid_chars(name: &str) -> bool {
    name.chars().any(|c| INVALID_FILENAME_CHARS.contains(&c))
}

/// Construye un `FileEntry` a partir de una ruta a un archivo existente.
fn to_file_entry(path: &Path) -> Result<FileEntry, String> {
    let name = path
        .file_name()
        .ok_or_else(|| format!("Ruta sin nombre de archivo: {}", path.display()))?
        .to_string_lossy()
        .into_owned();
    let path_str = path.to_string_lossy().into_owned();
    Ok(FileEntry {
        path: path_str,
        name,
    })
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::sync::atomic::{AtomicUsize, Ordering};
    use std::time::{SystemTime, UNIX_EPOCH};

    static TEST_DIR_COUNTER: AtomicUsize = AtomicUsize::new(0);

    /// Crea una carpeta temporal única con los archivos (vacíos) indicados.
    fn temp_dir_with(files: &[&str]) -> PathBuf {
        let nanos = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .expect("system clock before epoch")
            .as_nanos();
        let n = TEST_DIR_COUNTER.fetch_add(1, Ordering::Relaxed);
        let dir = std::env::temp_dir().join(format!("krenamer_preview_test_{nanos}_{n}"));
        std::fs::create_dir_all(&dir).expect("create temp dir");
        for file in files {
            std::fs::write(dir.join(file), b"").expect("write temp file");
        }
        dir
    }

    fn plan(template: &str, start: u32, padding: usize, step: u32) -> RenamePlan {
        RenamePlan {
            template: template.to_string(),
            start,
            padding,
            step,
        }
    }

    /// Corre `preview` y limpia la carpeta temporal antes de devolver, para que
    /// las aserciones (que pueden hacer panic) no dejen basura en disco.
    fn run_preview(dir: &Path, paths: Vec<String>, plan: RenamePlan) -> Vec<PreviewRow> {
        let rows = preview(paths, plan).expect("preview ok");
        std::fs::remove_dir_all(dir).expect("cleanup temp dir");
        rows
    }

    #[test]
    fn clean_rename_has_no_flags() {
        let dir = temp_dir_with(&["Pag_0000.jpg", "Pag_0001.jpg"]);
        let rows = run_preview(
            &dir,
            vec![dir.to_string_lossy().into_owned()],
            plan("{n}", 1, 3, 1),
        );
        assert_eq!(rows.len(), 2);
        assert_eq!(rows[0].new_name, "001.jpg");
        assert_eq!(rows[1].new_name, "002.jpg");
        assert!(rows.iter().all(|r| !r.invalid && !r.collision));
    }

    #[test]
    fn duplicate_targets_are_flagged_on_both_rows() {
        // Sin token {n}, los dos archivos apuntan al mismo nombre nuevo.
        let dir = temp_dir_with(&["a.jpg", "b.jpg"]);
        let rows = run_preview(
            &dir,
            vec![dir.to_string_lossy().into_owned()],
            plan("same", 1, 3, 1),
        );
        assert!(rows.iter().all(|r| r.collision));
    }

    #[test]
    fn destination_clobbering_external_file_is_flagged() {
        // Seleccionamos solo x.jpg; en la carpeta ya existe 001.jpg fuera del set.
        let dir = temp_dir_with(&["x.jpg", "001.jpg"]);
        let x_path = dir.join("x.jpg").to_string_lossy().into_owned();
        let rows = run_preview(&dir, vec![x_path], plan("{n}", 1, 3, 1));
        assert_eq!(rows.len(), 1);
        assert_eq!(rows[0].new_name, "001.jpg");
        assert!(rows[0].collision);
    }

    #[test]
    fn renaming_into_own_set_is_not_a_collision() {
        // 001->002, 002->003: cada destino existe en disco pero pertenece al set.
        let dir = temp_dir_with(&["001.jpg", "002.jpg"]);
        let rows = run_preview(
            &dir,
            vec![dir.to_string_lossy().into_owned()],
            plan("{n}", 2, 3, 1),
        );
        assert!(rows.iter().all(|r| !r.collision));
    }

    #[test]
    fn invalid_windows_chars_are_flagged() {
        let dir = temp_dir_with(&["a.jpg"]);
        let rows = run_preview(
            &dir,
            vec![dir.to_string_lossy().into_owned()],
            plan("inv:{n}", 1, 3, 1),
        );
        assert!(rows[0].invalid);
    }
}
