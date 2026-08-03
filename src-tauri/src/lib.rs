mod persistence {
    use std::{
        fs,
        sync::Mutex,
        time::{SystemTime, UNIX_EPOCH},
    };

    use rusqlite::{Connection, OptionalExtension, Transaction, params};
    use serde::Serialize;
    use tauri::{AppHandle, Manager, State};

    pub struct BoardDatabase(Mutex<Connection>);

    #[derive(Serialize)]
    #[serde(rename_all = "camelCase")]
    pub struct PersistedTask {
        id: String,
        group_id: String,
        title: String,
        sort_order: i64,
        created_at: i64,
    }

    #[derive(Serialize)]
    #[serde(rename_all = "camelCase")]
    pub struct RemovedTask {
        id: String,
        group_id: String,
        title: String,
        sort_order: i64,
        created_at: i64,
        removed_at: i64,
    }

    #[derive(Serialize)]
    pub struct BoardSnapshot {
        tasks: Vec<PersistedTask>,
        history: Vec<RemovedTask>,
    }

    fn now_millis() -> Result<i64, String> {
        SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .map(|duration| duration.as_millis() as i64)
            .map_err(|error| error.to_string())
    }

    fn valid_group(group_id: &str) -> bool {
        matches!(group_id, "sword" | "shield")
    }

    fn migrate(connection: &Connection) -> Result<(), String> {
        connection
            .execute_batch(
                "PRAGMA journal_mode = WAL;
                 PRAGMA foreign_keys = ON;
                 CREATE TABLE IF NOT EXISTS tasks (
                   id TEXT PRIMARY KEY NOT NULL,
                   group_id TEXT NOT NULL CHECK (group_id IN ('sword', 'shield')),
                   title TEXT NOT NULL CHECK (length(trim(title)) > 0),
                   sort_order INTEGER NOT NULL,
                   created_at INTEGER NOT NULL,
                   updated_at INTEGER NOT NULL,
                   removed_at INTEGER
                 );
                 CREATE INDEX IF NOT EXISTS idx_tasks_active_order
                   ON tasks (group_id, removed_at, sort_order);
                 CREATE INDEX IF NOT EXISTS idx_tasks_history
                   ON tasks (removed_at DESC);",
            )
            .map_err(|error| error.to_string())
    }

    pub fn open(app: &AppHandle) -> Result<BoardDatabase, String> {
        let directory = app
            .path()
            .app_data_dir()
            .map_err(|error| error.to_string())?;
        fs::create_dir_all(&directory).map_err(|error| error.to_string())?;
        let connection =
            Connection::open(directory.join("board.sqlite3")).map_err(|error| error.to_string())?;
        migrate(&connection)?;
        Ok(BoardDatabase(Mutex::new(connection)))
    }

    fn read_snapshot(connection: &Connection) -> Result<BoardSnapshot, String> {
        let mut active_statement = connection
            .prepare(
                "SELECT id, group_id, title, sort_order, created_at
                 FROM tasks
                 WHERE removed_at IS NULL
                 ORDER BY group_id, sort_order, id",
            )
            .map_err(|error| error.to_string())?;
        let tasks = active_statement
            .query_map([], |row| {
                Ok(PersistedTask {
                    id: row.get(0)?,
                    group_id: row.get(1)?,
                    title: row.get(2)?,
                    sort_order: row.get(3)?,
                    created_at: row.get(4)?,
                })
            })
            .map_err(|error| error.to_string())?
            .collect::<Result<Vec<_>, _>>()
            .map_err(|error| error.to_string())?;

        let mut history_statement = connection
            .prepare(
                "SELECT id, group_id, title, sort_order, created_at, removed_at
                 FROM tasks
                 WHERE removed_at IS NOT NULL
                 ORDER BY removed_at DESC, id DESC",
            )
            .map_err(|error| error.to_string())?;
        let history = history_statement
            .query_map([], |row| {
                Ok(RemovedTask {
                    id: row.get(0)?,
                    group_id: row.get(1)?,
                    title: row.get(2)?,
                    sort_order: row.get(3)?,
                    created_at: row.get(4)?,
                    removed_at: row.get(5)?,
                })
            })
            .map_err(|error| error.to_string())?
            .collect::<Result<Vec<_>, _>>()
            .map_err(|error| error.to_string())?;

        Ok(BoardSnapshot { tasks, history })
    }

    fn ordered_ids(
        transaction: &Transaction<'_>,
        group_id: &str,
        excluded_id: &str,
    ) -> Result<Vec<String>, String> {
        let mut statement = transaction
            .prepare(
                "SELECT id FROM tasks
                 WHERE group_id = ?1 AND removed_at IS NULL AND id <> ?2
                 ORDER BY sort_order, id",
            )
            .map_err(|error| error.to_string())?;
        statement
            .query_map(params![group_id, excluded_id], |row| row.get(0))
            .map_err(|error| error.to_string())?
            .collect::<Result<Vec<_>, _>>()
            .map_err(|error| error.to_string())
    }

    fn write_order(
        transaction: &Transaction<'_>,
        ids: &[String],
        updated_at: i64,
    ) -> Result<(), String> {
        for (index, id) in ids.iter().enumerate() {
            transaction
                .execute(
                    "UPDATE tasks SET sort_order = ?1, updated_at = ?2 WHERE id = ?3",
                    params![index as i64, updated_at, id],
                )
                .map_err(|error| error.to_string())?;
        }
        Ok(())
    }

    #[tauri::command]
    pub fn board_load(database: State<'_, BoardDatabase>) -> Result<BoardSnapshot, String> {
        let connection = database.0.lock().map_err(|error| error.to_string())?;
        read_snapshot(&connection)
    }

    #[tauri::command]
    pub fn board_add(
        database: State<'_, BoardDatabase>,
        group_id: String,
        title: String,
    ) -> Result<BoardSnapshot, String> {
        let title = title.trim();
        if !valid_group(&group_id) || title.is_empty() {
            return Err("Invalid task group or title".into());
        }
        let now = now_millis()?;
        let id = format!(
            "task-{}",
            SystemTime::now()
                .duration_since(UNIX_EPOCH)
                .map_err(|error| error.to_string())?
                .as_nanos()
        );
        let mut connection = database.0.lock().map_err(|error| error.to_string())?;
        let transaction = connection
            .transaction()
            .map_err(|error| error.to_string())?;
        transaction
            .execute(
                "UPDATE tasks SET sort_order = sort_order + 1, updated_at = ?1
                 WHERE group_id = ?2 AND removed_at IS NULL",
                params![now, group_id],
            )
            .map_err(|error| error.to_string())?;
        transaction
            .execute(
                "INSERT INTO tasks
                 (id, group_id, title, sort_order, created_at, updated_at, removed_at)
                 VALUES (?1, ?2, ?3, 0, ?4, ?4, NULL)",
                params![id, group_id, title, now],
            )
            .map_err(|error| error.to_string())?;
        transaction.commit().map_err(|error| error.to_string())?;
        read_snapshot(&connection)
    }

    #[tauri::command]
    pub fn board_rename(
        database: State<'_, BoardDatabase>,
        task_id: String,
        title: String,
    ) -> Result<BoardSnapshot, String> {
        let title = title.trim();
        if title.is_empty() {
            return Err("Task title cannot be empty".into());
        }
        let connection = database.0.lock().map_err(|error| error.to_string())?;
        let changed = connection
            .execute(
                "UPDATE tasks SET title = ?1, updated_at = ?2
                 WHERE id = ?3 AND removed_at IS NULL",
                params![title, now_millis()?, task_id],
            )
            .map_err(|error| error.to_string())?;
        if changed != 1 {
            return Err("Active task was not found".into());
        }
        read_snapshot(&connection)
    }

    #[tauri::command]
    pub fn board_move(
        database: State<'_, BoardDatabase>,
        task_id: String,
        target_group_id: String,
        target_index: i64,
    ) -> Result<BoardSnapshot, String> {
        if !valid_group(&target_group_id) {
            return Err("Invalid target group".into());
        }
        let mut connection = database.0.lock().map_err(|error| error.to_string())?;
        let source_group: Option<String> = connection
            .query_row(
                "SELECT group_id FROM tasks WHERE id = ?1 AND removed_at IS NULL",
                params![task_id],
                |row| row.get(0),
            )
            .optional()
            .map_err(|error| error.to_string())?;
        let source_group = source_group.ok_or_else(|| "Active task was not found".to_string())?;
        let now = now_millis()?;
        let transaction = connection
            .transaction()
            .map_err(|error| error.to_string())?;
        let mut source_ids = ordered_ids(&transaction, &source_group, &task_id)?;

        if source_group == target_group_id {
            let index = target_index.max(0) as usize;
            source_ids.insert(index.min(source_ids.len()), task_id.clone());
            write_order(&transaction, &source_ids, now)?;
        } else {
            let mut target_ids = ordered_ids(&transaction, &target_group_id, &task_id)?;
            let index = (target_index.max(0) as usize).min(target_ids.len());
            target_ids.insert(index, task_id.clone());
            transaction
                .execute(
                    "UPDATE tasks SET group_id = ?1, updated_at = ?2
                     WHERE id = ?3 AND removed_at IS NULL",
                    params![target_group_id, now, task_id],
                )
                .map_err(|error| error.to_string())?;
            write_order(&transaction, &source_ids, now)?;
            write_order(&transaction, &target_ids, now)?;
        }
        transaction.commit().map_err(|error| error.to_string())?;
        read_snapshot(&connection)
    }

    fn remove_task(connection: &mut Connection, task_id: &str) -> Result<BoardSnapshot, String> {
        let group_id: Option<String> = connection
            .query_row(
                "SELECT group_id FROM tasks WHERE id = ?1 AND removed_at IS NULL",
                params![task_id],
                |row| row.get(0),
            )
            .optional()
            .map_err(|error| error.to_string())?;
        let group_id = group_id.ok_or_else(|| "Active task was not found".to_string())?;
        let now = now_millis()?;
        let transaction = connection
            .transaction()
            .map_err(|error| error.to_string())?;
        transaction
            .execute(
                "UPDATE tasks SET removed_at = ?1, updated_at = ?1 WHERE id = ?2",
                params![now, task_id],
            )
            .map_err(|error| error.to_string())?;
        let remaining = ordered_ids(&transaction, &group_id, &task_id)?;
        write_order(&transaction, &remaining, now)?;
        transaction.commit().map_err(|error| error.to_string())?;
        read_snapshot(&connection)
    }

    #[tauri::command]
    pub fn board_remove(
        database: State<'_, BoardDatabase>,
        task_id: String,
    ) -> Result<BoardSnapshot, String> {
        let mut connection = database.0.lock().map_err(|error| error.to_string())?;
        remove_task(&mut connection, &task_id)
    }

    #[cfg(test)]
    mod tests {
        use super::{migrate, now_millis, read_snapshot, remove_task};
        use rusqlite::{Connection, params};

        #[test]
        fn removed_task_survives_database_reopen_and_is_history_only() {
            let path = std::env::temp_dir().join(format!(
                "sword-shield-notes-{}.sqlite3",
                now_millis().expect("clock should be available")
            ));

            {
                let connection = Connection::open(&path).expect("test database should open");
                migrate(&connection).expect("migration should succeed");
                let snapshot = read_snapshot(&connection).expect("snapshot should load");
                assert!(snapshot.tasks.is_empty());
                assert!(snapshot.history.is_empty());

                let now = now_millis().expect("clock should be available");
                connection
                    .execute(
                        "INSERT INTO tasks
                         (id, group_id, title, sort_order, created_at, updated_at, removed_at)
                         VALUES (?1, ?2, ?3, 0, ?4, ?4, NULL)",
                        params!["task-real", "sword", "真实任务", now],
                    )
                    .expect("real task should be inserted");
            }

            {
                let mut reopened = Connection::open(&path).expect("database should reopen");
                migrate(&reopened).expect("migration should remain idempotent");
                let snapshot = read_snapshot(&reopened).expect("snapshot should reload");
                assert_eq!(snapshot.tasks.len(), 1);
                assert_eq!(snapshot.tasks[0].id, "task-real");
                let created_at = snapshot.tasks[0].created_at;
                assert!(created_at > 0);
                assert!(snapshot.history.is_empty());

                let removed =
                    remove_task(&mut reopened, "task-real").expect("soft removal should succeed");
                assert!(removed.tasks.is_empty());
                assert_eq!(removed.history.len(), 1);
                assert_eq!(removed.history[0].created_at, created_at);
            }

            {
                let reopened = Connection::open(&path).expect("database should reopen again");
                migrate(&reopened).expect("migration should remain idempotent");
                let snapshot = read_snapshot(&reopened).expect("snapshot should reload again");
                assert!(snapshot.tasks.is_empty());
                assert_eq!(snapshot.history.len(), 1);
                assert_eq!(snapshot.history[0].id, "task-real");
                assert!(snapshot.history[0].created_at > 0);
                assert!(snapshot.history[0].removed_at > 0);
            }

            std::fs::remove_file(path).expect("test database should be removable");
        }
    }
}

#[tauri::command]
fn quit_app(app: tauri::AppHandle) {
    app.exit(0);
}

#[cfg(windows)]
mod desktop_window {
    use tauri::WebviewWindow;
    use windows::Win32::{
        Foundation::HWND,
        System::Threading::{AttachThreadInput, GetCurrentThreadId},
        UI::{
            Input::KeyboardAndMouse::{SetActiveWindow, SetFocus},
            WindowsAndMessaging::{
                FindWindowExW, GW_OWNER, GWL_EXSTYLE, GWLP_HWNDPARENT, GetForegroundWindow,
                GetWindow, GetWindowLongPtrW, GetWindowThreadProcessId, HWND_BOTTOM, HWND_TOP,
                SW_SHOWNOACTIVATE, SWP_FRAMECHANGED, SWP_NOACTIVATE, SWP_NOMOVE, SWP_NOSIZE,
                SetForegroundWindow, SetWindowLongPtrW, SetWindowPos, ShowWindow, WS_EX_APPWINDOW,
                WS_EX_NOACTIVATE, WS_EX_TOOLWINDOW,
            },
        },
    };
    use windows::core::{PCWSTR, w};

    fn passive_style(style: isize) -> isize {
        (style | WS_EX_TOOLWINDOW.0 as isize | WS_EX_NOACTIVATE.0 as isize)
            & !(WS_EX_APPWINDOW.0 as isize)
    }

    fn editing_style(style: isize) -> isize {
        (style | WS_EX_TOOLWINDOW.0 as isize)
            & !(WS_EX_APPWINDOW.0 as isize | WS_EX_NOACTIVATE.0 as isize)
    }

    fn desktop_owner() -> Result<HWND, String> {
        let mut after = None;
        loop {
            // Explorer may host the desktop view under different top-level
            // window classes. Select the actual host of SHELLDLL_DefView
            // instead of assuming that the host is always a WorkerW.
            let host = unsafe { FindWindowExW(None, after, PCWSTR::null(), PCWSTR::null()) }
                .map_err(|_| "Windows desktop host was not found".to_string())?;

            if unsafe { FindWindowExW(Some(host), None, w!("SHELLDLL_DefView"), PCWSTR::null()) }
                .is_ok()
            {
                return Ok(host);
            }
            after = Some(host);
        }
    }

    fn attach_to_desktop(hwnd: HWND) -> Result<HWND, String> {
        let owner = desktop_owner()?;
        unsafe {
            SetWindowLongPtrW(hwnd, GWLP_HWNDPARENT, owner.0 as isize);
        }
        if unsafe { GetWindow(hwnd, GW_OWNER) }.ok() == Some(owner) {
            Ok(owner)
        } else {
            Err("Windows rejected the desktop window owner".into())
        }
    }

    fn detach_from_desktop(hwnd: HWND) -> Result<(), String> {
        unsafe {
            SetWindowLongPtrW(hwnd, GWLP_HWNDPARENT, 0);
        }
        if unsafe { GetWindow(hwnd, GW_OWNER) }.is_err() {
            Ok(())
        } else {
            Err("Windows rejected detaching the editing window from the desktop".into())
        }
    }

    fn apply_style(hwnd: HWND, editing: bool) -> Result<(), String> {
        unsafe {
            let current = GetWindowLongPtrW(hwnd, GWL_EXSTYLE);
            let next = if editing {
                editing_style(current)
            } else {
                passive_style(current)
            };
            SetWindowLongPtrW(hwnd, GWL_EXSTYLE, next);
            let insert_after = if editing { HWND_TOP } else { HWND_BOTTOM };
            SetWindowPos(
                hwnd,
                Some(insert_after),
                0,
                0,
                0,
                0,
                SWP_FRAMECHANGED | SWP_NOACTIVATE | SWP_NOMOVE | SWP_NOSIZE,
            )
            .map_err(|error| error.to_string())?;
        }
        Ok(())
    }

    fn detach_inputs(attached: &[(u32, u32)]) {
        for &(from, to) in attached.iter().rev() {
            unsafe {
                let _ = AttachThreadInput(from, to, false);
            }
        }
    }

    fn attach_input(from: u32, to: u32, attached: &mut Vec<(u32, u32)>) -> Result<(), String> {
        if from == to || to == 0 {
            return Ok(());
        }
        if unsafe { AttachThreadInput(from, to, true) }.as_bool() {
            attached.push((from, to));
            Ok(())
        } else {
            Err("Windows rejected sharing the editing input queue".into())
        }
    }

    fn activate_for_editing(hwnd: HWND) -> Result<(), String> {
        let current_thread = unsafe { GetCurrentThreadId() };
        let window_thread = unsafe { GetWindowThreadProcessId(hwnd, None) };
        let foreground = unsafe { GetForegroundWindow() };
        let foreground_thread = if foreground.0.is_null() {
            0
        } else {
            unsafe { GetWindowThreadProcessId(foreground, None) }
        };
        let mut attached = Vec::new();

        if let Err(error) = attach_input(current_thread, window_thread, &mut attached)
            .and_then(|_| attach_input(current_thread, foreground_thread, &mut attached))
        {
            detach_inputs(&attached);
            return Err(error);
        }

        let activated = unsafe {
            let foreground_set = SetForegroundWindow(hwnd).as_bool();
            let _ = SetActiveWindow(hwnd);
            let _ = SetFocus(Some(hwnd));
            foreground_set && GetForegroundWindow() == hwnd
        };
        detach_inputs(&attached);

        if activated {
            Ok(())
        } else {
            Err("Windows rejected the user-initiated editing focus".into())
        }
    }

    #[tauri::command]
    pub fn configure_desktop_window(window: WebviewWindow) -> Result<(), String> {
        window
            .set_skip_taskbar(true)
            .map_err(|error| error.to_string())?;
        let hwnd = window.hwnd().map_err(|error| error.to_string())?;
        attach_to_desktop(hwnd)?;
        apply_style(hwnd, false)?;
        unsafe {
            let _ = ShowWindow(hwnd, SW_SHOWNOACTIVATE);
        }
        Ok(())
    }

    #[tauri::command]
    pub fn begin_board_editing(window: WebviewWindow) -> Result<(), String> {
        let hwnd = window.hwnd().map_err(|error| error.to_string())?;
        detach_from_desktop(hwnd)?;
        apply_style(hwnd, true)?;
        if let Err(error) = activate_for_editing(hwnd) {
            let _ = attach_to_desktop(hwnd);
            let _ = apply_style(hwnd, false);
            return Err(error);
        }
        Ok(())
    }

    #[tauri::command]
    pub fn end_board_editing(window: WebviewWindow) -> Result<(), String> {
        let hwnd = window.hwnd().map_err(|error| error.to_string())?;
        let desktop = attach_to_desktop(hwnd)?;
        apply_style(hwnd, false)?;

        unsafe {
            if GetForegroundWindow() == hwnd {
                if !SetForegroundWindow(desktop).as_bool() {
                    return Err("Windows rejected returning focus to the desktop".into());
                }
            }
        }
        Ok(())
    }

    #[cfg(test)]
    mod tests {
        use super::{editing_style, passive_style};
        use windows::Win32::UI::WindowsAndMessaging::{
            WS_EX_APPWINDOW, WS_EX_NOACTIVATE, WS_EX_TOOLWINDOW,
        };

        #[test]
        fn passive_window_is_silent_and_hidden_from_app_switching() {
            let style = passive_style(WS_EX_APPWINDOW.0 as isize);
            assert_eq!(style & WS_EX_APPWINDOW.0 as isize, 0);
            assert_ne!(style & WS_EX_TOOLWINDOW.0 as isize, 0);
            assert_ne!(style & WS_EX_NOACTIVATE.0 as isize, 0);
        }

        #[test]
        fn editing_only_removes_no_activate() {
            let passive = passive_style(WS_EX_APPWINDOW.0 as isize);
            let editing = editing_style(passive);
            assert_eq!(editing & WS_EX_APPWINDOW.0 as isize, 0);
            assert_ne!(editing & WS_EX_TOOLWINDOW.0 as isize, 0);
            assert_eq!(editing & WS_EX_NOACTIVATE.0 as isize, 0);
        }
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    use tauri::Manager;

    let builder = tauri::Builder::default().setup(|app| {
        let database = persistence::open(app.handle()).map_err(std::io::Error::other)?;
        app.manage(database);
        Ok(())
    });

    #[cfg(windows)]
    let builder = builder.plugin(tauri_plugin_single_instance::init(
        |app, _arguments, _working_directory| {
            if let Some(window) = app.get_webview_window("main") {
                // Re-running the installed app is the recovery path for an
                // unexpectedly hidden widget and must never take focus.
                let _ = desktop_window::configure_desktop_window(window);
            }
        },
    ));

    #[cfg(windows)]
    let builder = builder.invoke_handler(tauri::generate_handler![
        quit_app,
        persistence::board_load,
        persistence::board_add,
        persistence::board_rename,
        persistence::board_move,
        persistence::board_remove,
        desktop_window::configure_desktop_window,
        desktop_window::begin_board_editing,
        desktop_window::end_board_editing,
    ]);

    builder
        .run(tauri::generate_context!())
        .expect("error while running Sword Shield Notes");
}
