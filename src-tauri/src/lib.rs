pub mod fs_ops;
pub mod rename;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            fs_ops::scan,
            fs_ops::preview,
            fs_ops::apply
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
