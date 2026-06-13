use crate::rename::{build_names, RenamePlan};
use serde::Serialize;
use std::collections::{HashMap, HashSet};
use std::path::{Path, PathBuf};
use std::time::{SystemTime, UNIX_EPOCH};

/// Caracteres no permitidos en nombres de archivo de Windows.
const INVALID_FILENAME_CHARS: &[char] = &['\\', '/', ':', '*', '?', '"', '<', '>', '|'];

/// Prefijo de los nombres temporales usados en la fase 1 del renombrado.
const TEMP_PREFIX: &str = ".krenamer-tmp-";

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
        .map(|(entry, new_name)| dest_path_for(&entry.path, new_name))
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

/// Resultado de aplicar el renombrado a un único archivo. Se serializa a TS
/// como `{ path, newName, ok, error }` (ver `src/types/applyOutcome.ts`).
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ApplyOutcome {
    /// Ruta absoluta original del archivo.
    pub path: String,
    /// Nombre nuevo que se intentó aplicar.
    pub new_name: String,
    /// `true` si el archivo quedó con su nombre nuevo (o ya lo tenía).
    pub ok: bool,
    /// Mensaje de error si `ok` es `false`; `None` si salió bien.
    pub error: Option<String>,
}

impl ApplyOutcome {
    fn ok(path: &str, new_name: &str) -> Self {
        ApplyOutcome {
            path: path.to_string(),
            new_name: new_name.to_string(),
            ok: true,
            error: None,
        }
    }

    fn failed(path: &str, new_name: &str, error: String) -> Self {
        ApplyOutcome {
            path: path.to_string(),
            new_name: new_name.to_string(),
            ok: false,
            error: Some(error),
        }
    }
}

/// Archivo que pasó la fase 1 (ya movido a un nombre temporal) y espera la
/// fase 2 (mover del temporal al nombre final).
struct Staged {
    index: usize,
    temp_path: PathBuf,
    final_path: PathBuf,
    path: String,
    new_name: String,
}

/// Aplica el renombrado en disco, en 2 fases para evitar colisiones cuando un
/// destino es el origen de otro archivo (p.ej. `001->002, 002->003`).
///
/// Antes de tocar disco valida con `preview`: si hay algún nombre inválido o
/// colisión, aborta sin renombrar nada (`Err`). Los archivos cuyo nombre nuevo
/// es igual al actual se omiten (no-op). Devuelve un resultado por archivo,
/// en el mismo orden que la tabla de preview.
#[tauri::command]
pub fn apply(paths: Vec<String>, plan: RenamePlan) -> Result<Vec<ApplyOutcome>, String> {
    let rows = preview(paths, plan)?;

    if let Some(reason) = blocking_reason(&rows) {
        return Err(reason);
    }

    let mut outcomes: Vec<Option<ApplyOutcome>> = (0..rows.len()).map(|_| None).collect();
    let mut staged: Vec<Staged> = Vec::new();

    // Fase 1: cada origen que cambia de nombre -> un temporal único en su carpeta.
    for (index, row) in rows.iter().enumerate() {
        if row.new_name == row.current_name {
            outcomes[index] = Some(ApplyOutcome::ok(&row.path, &row.new_name));
            continue;
        }

        let source = PathBuf::from(&row.path);
        let temp_path = temp_path_for(&source, index);
        match std::fs::rename(&source, &temp_path) {
            Ok(()) => staged.push(Staged {
                index,
                temp_path,
                final_path: dest_path_for(&row.path, &row.new_name),
                path: row.path.clone(),
                new_name: row.new_name.clone(),
            }),
            Err(e) => {
                outcomes[index] = Some(ApplyOutcome::failed(&row.path, &row.new_name, e.to_string()))
            }
        }
    }

    // Fase 2: del temporal al nombre final.
    for item in staged {
        outcomes[item.index] = Some(match std::fs::rename(&item.temp_path, &item.final_path) {
            Ok(()) => ApplyOutcome::ok(&item.path, &item.new_name),
            Err(e) => ApplyOutcome::failed(&item.path, &item.new_name, e.to_string()),
        });
    }

    // Cada índice quedó relleno en la fase 1 o la 2.
    Ok(outcomes.into_iter().flatten().collect())
}

/// Motivo por el que el renombrado no debe ejecutarse, o `None` si es seguro.
fn blocking_reason(rows: &[PreviewRow]) -> Option<String> {
    let has_invalid = rows.iter().any(|r| r.invalid);
    let has_collision = rows.iter().any(|r| r.collision);
    match (has_invalid, has_collision) {
        (true, true) => {
            Some("Hay nombres inválidos y colisiones; corregí el patrón antes de aplicar.".into())
        }
        (true, false) => {
            Some("Hay nombres inválidos para Windows; corregí el patrón antes de aplicar.".into())
        }
        (false, true) => {
            Some("Hay colisiones de nombres; corregí el patrón antes de aplicar.".into())
        }
        (false, false) => None,
    }
}

/// Nombre temporal único dentro de la carpeta del archivo de origen.
fn temp_path_for(source: &Path, index: usize) -> PathBuf {
    let nanos = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_nanos())
        .unwrap_or(0);
    let file_name = format!("{TEMP_PREFIX}{index}_{nanos}");
    match source.parent() {
        Some(parent) => parent.join(file_name),
        None => PathBuf::from(file_name),
    }
}

/// Ruta de destino de un archivo: su misma carpeta con el nombre nuevo.
fn dest_path_for(source_path: &str, new_name: &str) -> PathBuf {
    match Path::new(source_path).parent() {
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

    /// Nombres de archivo presentes en la carpeta, ordenados.
    fn file_names_in(dir: &Path) -> Vec<String> {
        let mut names: Vec<String> = std::fs::read_dir(dir)
            .expect("read temp dir")
            .map(|entry| {
                entry
                    .expect("dir entry")
                    .file_name()
                    .to_string_lossy()
                    .into_owned()
            })
            .collect();
        names.sort();
        names
    }

    /// Corre `apply` seleccionando la carpeta entera y limpia el temporal antes
    /// de devolver. Devuelve el resultado y los nombres que quedaron en disco.
    fn run_apply(
        files: &[&str],
        plan: RenamePlan,
    ) -> (Result<Vec<ApplyOutcome>, String>, Vec<String>) {
        let dir = temp_dir_with(files);
        let result = apply(vec![dir.to_string_lossy().into_owned()], plan);
        let remaining = file_names_in(&dir);
        std::fs::remove_dir_all(&dir).expect("cleanup temp dir");
        (result, remaining)
    }

    #[test]
    fn applies_basic_rename() {
        let (result, remaining) =
            run_apply(&["Pag_0000.jpg", "Pag_0001.jpg"], plan("{n}", 1, 3, 1));
        let outcomes = result.expect("apply ok");
        assert!(outcomes.iter().all(|o| o.ok));
        assert_eq!(remaining, vec!["001.jpg", "002.jpg"]);
    }

    #[test]
    fn applies_shift_without_clobbering() {
        // 001->002, 002->003: solo posible gracias a las 2 fases.
        let (result, remaining) = run_apply(&["001.jpg", "002.jpg"], plan("{n}", 2, 3, 1));
        let outcomes = result.expect("apply ok");
        assert!(outcomes.iter().all(|o| o.ok));
        assert_eq!(remaining, vec!["002.jpg", "003.jpg"]);
    }

    #[test]
    fn no_op_leaves_file_unchanged() {
        let (result, remaining) = run_apply(&["001.jpg"], plan("{n}", 1, 3, 1));
        let outcomes = result.expect("apply ok");
        assert!(outcomes.iter().all(|o| o.ok));
        assert_eq!(remaining, vec!["001.jpg"]);
    }

    #[test]
    fn aborts_on_collision_without_touching_disk() {
        let (result, remaining) = run_apply(&["a.jpg", "b.jpg"], plan("same", 1, 3, 1));
        assert!(result.is_err());
        assert_eq!(remaining, vec!["a.jpg", "b.jpg"]);
    }

    #[test]
    fn aborts_on_invalid_name_without_touching_disk() {
        let (result, remaining) = run_apply(&["a.jpg"], plan("inv:{n}", 1, 3, 1));
        assert!(result.is_err());
        assert_eq!(remaining, vec!["a.jpg"]);
    }
}
