use crate::fs_ops::FileEntry;
use serde::Deserialize;
use std::path::Path;

/// Token dentro de la plantilla que se reemplaza por el número de secuencia.
const SEQUENCE_TOKEN: &str = "{n}";

/// Configuración de renombrado que viene del frontend.
/// Se deserializa desde TS `{ template, start, padding, step }`
/// (ver `src/types/renamePlan.ts`).
#[derive(Deserialize)]
pub struct RenamePlan {
    /// Plantilla del nombre, con el token `{n}` donde va el número.
    /// Ej: `"One Piece 381 - Pag {n} [Español]"`.
    pub template: String,
    /// Número con el que arranca la secuencia.
    pub start: u32,
    /// Cantidad mínima de dígitos del número (rellena con ceros a la izquierda).
    pub padding: usize,
    /// Cuánto incrementa el número entre un archivo y el siguiente.
    pub step: u32,
}

/// Genera los nombres nuevos para una lista ordenada de archivos.
///
/// Función pura: no toca disco. El nombre nuevo de cada archivo es la plantilla
/// con `{n}` sustituido por su número de secuencia, preservando la extensión
/// original. El orden de entrada define el orden de la secuencia.
pub fn build_names(plan: &RenamePlan, entries: &[FileEntry]) -> Vec<String> {
    entries
        .iter()
        .enumerate()
        .map(|(index, entry)| build_single_name(plan, index, entry))
        .collect()
}

/// Construye el nombre nuevo para un único archivo en la posición `index`.
fn build_single_name(plan: &RenamePlan, index: usize, entry: &FileEntry) -> String {
    // u64 para evitar overflow aun con listas grandes o steps altos.
    let sequence_value = plan.start as u64 + index as u64 * plan.step as u64;
    let sequence = format!("{:0width$}", sequence_value, width = plan.padding);
    let stem = plan.template.replace(SEQUENCE_TOKEN, &sequence);

    match extension_of(&entry.name) {
        Some(ext) => format!("{stem}.{ext}"),
        None => stem,
    }
}

/// Devuelve la extensión de un nombre de archivo (sin el punto), si tiene.
fn extension_of(name: &str) -> Option<String> {
    Path::new(name)
        .extension()
        .map(|ext| ext.to_string_lossy().into_owned())
}

#[cfg(test)]
mod tests {
    use super::*;

    fn entry(name: &str) -> FileEntry {
        FileEntry {
            path: format!("/manga/{name}"),
            name: name.to_string(),
        }
    }

    fn plan(template: &str, start: u32, padding: usize, step: u32) -> RenamePlan {
        RenamePlan {
            template: template.to_string(),
            start,
            padding,
            step,
        }
    }

    #[test]
    fn replaces_token_pads_and_keeps_extension() {
        let names = build_names(
            &plan("Pag {n}", 1, 3, 1),
            &[entry("Pag_0000.jpg"), entry("Pag_0001.jpg")],
        );
        assert_eq!(names, vec!["Pag 001.jpg", "Pag 002.jpg"]);
    }

    #[test]
    fn full_template_example() {
        let names = build_names(
            &plan("One Piece 381 - Pag {n} [Español]", 1, 3, 1),
            &[entry("a.png"), entry("b.png"), entry("c.png")],
        );
        assert_eq!(
            names,
            vec![
                "One Piece 381 - Pag 001 [Español].png",
                "One Piece 381 - Pag 002 [Español].png",
                "One Piece 381 - Pag 003 [Español].png",
            ]
        );
    }

    #[test]
    fn honors_custom_start_for_merging_chapters() {
        // Caso "unir capítulos": el cap 2 arranca donde quedó el cap 1.
        let names = build_names(&plan("{n}", 201, 3, 1), &[entry("x.jpg"), entry("y.jpg")]);
        assert_eq!(names, vec!["201.jpg", "202.jpg"]);
    }

    #[test]
    fn honors_step() {
        let names = build_names(&plan("{n}", 0, 2, 5), &[entry("a"), entry("b"), entry("c")]);
        assert_eq!(names, vec!["00", "05", "10"]);
    }

    #[test]
    fn number_wider_than_padding_is_not_truncated() {
        let names = build_names(&plan("{n}", 1000, 3, 1), &[entry("a.jpg")]);
        assert_eq!(names, vec!["1000.jpg"]);
    }

    #[test]
    fn file_without_extension_has_no_trailing_dot() {
        let names = build_names(&plan("Pag {n}", 1, 2, 1), &[entry("README")]);
        assert_eq!(names, vec!["Pag 01"]);
    }
}
