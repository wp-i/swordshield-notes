import { useEffect, useRef, useState } from "react";
import { createInitialBoard } from "../board/boardState";
import { boardRepository } from "../board/boardRepository";
import type { BoardSnapshot, BoardState, GroupId, RemovedTask } from "../board/model";
import { BoardView } from "../features/floating-board/BoardView";
import { HistoryPanel } from "../features/history/HistoryPanel";
import { ProductMark } from "./ProductMark";
import { WindowChrome } from "./WindowChrome";
import {
  beginBoardEditing,
  closeWindow,
  endBoardEditing,
  prepareWindow,
  setMinifiedWindow,
  waitForModeFade,
} from "./window/windowService";

export function App() {
  const [board, setBoard] = useState<BoardState>(() => createInitialBoard());
  const [history, setHistory] = useState<RemovedTask[]>([]);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [armedTaskId, setArmedTaskId] = useState<string | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [operationError, setOperationError] = useState<string | null>(null);
  const [minified, setMinified] = useState(false);
  const [windowBusy, setWindowBusy] = useState(false);
  const [windowTransitioning, setWindowTransitioning] = useState(false);
  const boardRef = useRef(board);
  const historyRef = useRef(history);
  boardRef.current = board;
  historyRef.current = history;

  const applySnapshot = (snapshot: BoardSnapshot) => {
    setBoard(snapshot.board);
    setHistory(snapshot.history);
    setOperationError(null);
  };

  const reportOperationError = (error: unknown) => {
    console.error("Board persistence operation failed", error);
    setOperationError("本地保存失败，请重试");
  };

  useEffect(() => {
    void prepareWindow();
    let active = true;
    void boardRepository
      .load()
      .then((snapshot) => {
        if (active) applySnapshot(snapshot);
      })
      .catch((error) => {
        if (active) reportOperationError(error);
      });
    return () => {
      active = false;
    };
  }, []);

  const commitTitle = async (taskId: string, title: string) => {
    const normalized = title.trim();
    if (!normalized) return;
    setEditingTaskId(null);
    await endBoardEditing();
    try {
      applySnapshot(
        await boardRepository.rename(
          boardRef.current,
          historyRef.current,
          taskId,
          normalized,
        ),
      );
    } catch (error) {
      reportOperationError(error);
    }
  };

  const cancelTitleEditing = () => {
    setEditingTaskId(null);
    void endBoardEditing();
  };

  const beginTitleEditing = async (taskId: string) => {
    setArmedTaskId(null);
    if (await beginBoardEditing()) setEditingTaskId(taskId);
  };

  const addTaskToGroup = async (groupId: GroupId, title: string) => {
    setArmedTaskId(null);
    try {
      applySnapshot(
        await boardRepository.add(boardRef.current, historyRef.current, groupId, title),
      );
    } catch (error) {
      reportOperationError(error);
    }
  };

  const moveTaskTo = async (
    taskId: string,
    targetGroupId: GroupId,
    targetIndex: number,
  ) => {
    setArmedTaskId(null);
    try {
      applySnapshot(
        await boardRepository.move(
          boardRef.current,
          historyRef.current,
          taskId,
          targetGroupId,
          targetIndex,
        ),
      );
    } catch (error) {
      reportOperationError(error);
    }
  };

  const confirmRemove = async (taskId: string) => {
    if (armedTaskId !== taskId) return;
    setArmedTaskId(null);
    try {
      applySnapshot(
        await boardRepository.remove(boardRef.current, historyRef.current, taskId),
      );
    } catch (error) {
      reportOperationError(error);
    }
  };

  const enterIconMode = async () => {
    if (windowBusy) return;
    setWindowBusy(true);
    try {
      setArmedTaskId(null);
      setHistoryOpen(false);
      await endBoardEditing();
      setEditingTaskId(null);
      setWindowTransitioning(true);
      await waitForModeFade();
      setMinified(true);
      await setMinifiedWindow(true);
    } finally {
      setWindowTransitioning(false);
      setWindowBusy(false);
    }
  };

  const restoreDefaultBoard = async () => {
    if (windowBusy) return;
    setWindowBusy(true);
    try {
      setWindowTransitioning(true);
      await waitForModeFade();
      setMinified(false);
      await setMinifiedWindow(false);
    } finally {
      setWindowTransitioning(false);
      setWindowBusy(false);
    }
  };

  if (minified) {
    return (
      <main className={`icon-stage ${windowTransitioning ? "is-mode-transitioning" : ""}`}>
        <button
          type="button"
          className="floating-icon"
          aria-label="恢复剑盾纪事看板"
          disabled={windowBusy}
          onClick={() => void restoreDefaultBoard()}
        >
          <ProductMark />
        </button>
      </main>
    );
  }

  return (
    <div
      className={`window-stage ${windowTransitioning ? "is-mode-transitioning" : ""}`}
      onPointerDownCapture={(event) => {
        const target = event.target as HTMLElement;
        if (!target.closest(".task-card")) setArmedTaskId(null);
        if (target.closest("input")) return;
        const activeElement = document.activeElement;
        if (activeElement instanceof HTMLInputElement) activeElement.blur();
      }}
    >
      <section className="window-shell">
        <WindowChrome
          busy={windowBusy}
          historyOpen={historyOpen}
          onHistory={() => {
            setArmedTaskId(null);
            setHistoryOpen((open) => !open);
          }}
          onMinify={() => void enterIconMode()}
          onClose={() => void closeWindow()}
        />

        <div className="workspace">
          <BoardView
            board={board}
            editingTaskId={editingTaskId}
            armedTaskId={armedTaskId}
            onMoveTask={(taskId, groupId, index) =>
              void moveTaskTo(taskId, groupId, index)
            }
            onBeginEdit={(taskId) => void beginTitleEditing(taskId)}
            onCancelEdit={cancelTitleEditing}
            onCommitTitle={(taskId, title) => void commitTitle(taskId, title)}
            onAddTask={(groupId, title) => void addTaskToGroup(groupId, title)}
            onArmForRemove={setArmedTaskId}
            onConfirmRemove={(taskId) => void confirmRemove(taskId)}
            onBeginEditing={beginBoardEditing}
            onEndEditing={endBoardEditing}
          />
        </div>

        {historyOpen && (
          <HistoryPanel history={history} />
        )}
        {operationError && <div className="operation-error" role="status">{operationError}</div>}
      </section>
    </div>
  );
}
