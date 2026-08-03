const BOARD_SIZE = { width: 480, height: 600 };
const ICON_SIZE = { width: 52, height: 52 };
const EDGE_GAP = 18;

function isTauriRuntime(): boolean {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}

async function getWindowModule() {
  return import("@tauri-apps/api/window");
}

async function invokeDesktopCommand(command: string): Promise<void> {
  if (!isTauriRuntime()) return;
  const { invoke } = await import("@tauri-apps/api/core");
  await invoke(command);
}

export async function prepareWindow(): Promise<void> {
  if (!isTauriRuntime()) return;

  const { PhysicalPosition, getCurrentWindow, primaryMonitor } = await getWindowModule();
  const appWindow = getCurrentWindow();
  await appWindow.setAlwaysOnTop(false);
  const monitor = await primaryMonitor();
  if (monitor) {
    const size = await appWindow.outerSize();
    const area = monitor.workArea;
    const x = area.position.x + area.size.width - size.width - EDGE_GAP;
    const y = area.position.y + area.size.height - size.height - EDGE_GAP;
    await appWindow.setPosition(new PhysicalPosition(Math.max(area.position.x, x), Math.max(area.position.y, y)));
  }
  await invokeDesktopCommand("configure_desktop_window");
}

export async function beginBoardEditing(): Promise<boolean> {
  try {
    await invokeDesktopCommand("begin_board_editing");
    return true;
  } catch (error) {
    console.error("Unable to enter board editing focus", error);
    return false;
  }
}

export async function endBoardEditing(): Promise<void> {
  try {
    await invokeDesktopCommand("end_board_editing");
  } catch (error) {
    console.error("Unable to return the board to passive mode", error);
  }
}

function easeOutCubic(value: number): number {
  return 1 - Math.pow(1 - value, 3);
}

function nextAnimationFrame(): Promise<void> {
  return new Promise((resolve) => requestAnimationFrame(() => resolve()));
}

export async function waitForModeFade(): Promise<void> {
  await nextAnimationFrame();
  await nextAnimationFrame();
  await new Promise<void>((resolve) => window.setTimeout(resolve, 90));
}

export async function setMinifiedWindow(minified: boolean): Promise<void> {
  if (!isTauriRuntime()) return;

  const { PhysicalPosition, PhysicalSize, getCurrentWindow, currentMonitor } = await getWindowModule();
  const appWindow = getCurrentWindow();
  const [startSize, startPosition, scaleFactor, monitor] = await Promise.all([
    appWindow.outerSize(),
    appWindow.outerPosition(),
    appWindow.scaleFactor(),
    currentMonitor(),
  ]);

  const logicalTarget = minified ? ICON_SIZE : BOARD_SIZE;
  const maximumWidth = monitor ? monitor.workArea.size.width - EDGE_GAP * 2 : Infinity;
  const maximumHeight = monitor ? monitor.workArea.size.height - EDGE_GAP * 2 : Infinity;
  const targetWidth = Math.min(Math.round(logicalTarget.width * scaleFactor), maximumWidth);
  const targetHeight = Math.min(Math.round(logicalTarget.height * scaleFactor), maximumHeight);
  const anchoredX = startPosition.x + startSize.width - targetWidth;
  const anchoredY = startPosition.y + startSize.height - targetHeight;
  const minimumX = monitor ? monitor.workArea.position.x + EDGE_GAP : anchoredX;
  const minimumY = monitor ? monitor.workArea.position.y + EDGE_GAP : anchoredY;
  const targetX = Math.max(minimumX, anchoredX);
  const targetY = Math.max(minimumY, anchoredY);
  const frames = 12;

  for (let frame = 1; frame <= frames; frame += 1) {
    const progress = easeOutCubic(frame / frames);
    const width = Math.round(startSize.width + (targetWidth - startSize.width) * progress);
    const height = Math.round(startSize.height + (targetHeight - startSize.height) * progress);
    const x = Math.round(startPosition.x + (targetX - startPosition.x) * progress);
    const y = Math.round(startPosition.y + (targetY - startPosition.y) * progress);
    await Promise.all([
      appWindow.setSize(new PhysicalSize(width, height)),
      appWindow.setPosition(new PhysicalPosition(x, y)),
    ]);
    await nextAnimationFrame();
  }
}

export async function closeWindow(): Promise<void> {
  if (!isTauriRuntime()) return;
  await invokeDesktopCommand("quit_app");
}
