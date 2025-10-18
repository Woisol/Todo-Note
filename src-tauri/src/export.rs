use std::fs::File;
use std::io::Write;
use std::path;
fn _export_str(str: &str, path: &path::Path) -> Result<String, String> {
    // Here you would implement the logic to export data, e.g., to a file
    // For demonstration, we just return the data as a confirmation
    if str.is_empty() {
        return Err("No data to export".to_string());
    }

    let mut file = match File::create(path) {
        Ok(file) => file,
        Err(e) => return Err(format!("Failed to create file: {}", e)),
    };

    file.write_all(str.as_bytes())
        .map_err(|e| format!("Failed to write to file: {}", e))?;
    // if let Err(e) = writeln!(file, "{}", data) {
    //     return Err(format!("Failed to write to file: {}", e));
    // }

    Ok(format!("Data exported to {} successfully", path.display()))
}
// 结果是因为漏了这个导致 main.rs 中 export::export_todo 编译错误
#[tauri::command]
pub fn export_todo(todo_str: &str) -> bool {
    // todo!("Implement export functionality");
    // This function can be used to export todo items
    // For now, we will just return a placeholder string
    match _export_str(&todo_str, path::Path::new("./todo.json")){
        Ok(msg) => true,
        Err(err) => false,
    }
}

#[tauri::command]
pub fn export_note(note_str: &str, path: &str) -> bool {
    // todo!("Implement export functionality");
    // This function can be used to export todo items
    // For now, we will just return a placeholder string
    match _export_str(&note_str, path::Path::new(path)){
        Ok(msg) => true,
        Err(err) => false,
    }
}
