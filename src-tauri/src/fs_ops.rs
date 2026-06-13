use serde::Serialize;
use std::path::Path;

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
