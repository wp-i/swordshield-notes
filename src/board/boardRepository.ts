import { invoke } from "@tauri-apps/api/core";
import {
  addTask,
  createInitialBoard,
  findTask,
  moveTask,
  removeTask,
  updateTask,
} from "./boardState";
import { groupIds, type BoardSnapshot, type BoardState, type GroupId, type RemovedTask } from "./model";

interface PersistedTaskDto {
  id: string;
  groupId: GroupId;
  title: string;
  sortOrder: number;
  createdAt: number;
}

interface RemovedTaskDto extends PersistedTaskDto {
  removedAt: number;
}

interface SnapshotDto {
  tasks: PersistedTaskDto[];
  history: RemovedTaskDto[];
}

function isTauriRuntime(): boolean {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}

function toBoard(tasks: PersistedTaskDto[]): BoardState {
  const board: BoardState = {
    groups: {
      sword: { id: "sword", tasks: [] },
      shield: { id: "shield", tasks: [] },
    },
  };

  for (const groupId of groupIds) {
    board.groups[groupId].tasks = tasks
      .filter((task) => task.groupId === groupId)
      .sort((left, right) => left.sortOrder - right.sortOrder)
      .map(({ id, title, createdAt }) => ({ id, groupId, title, createdAt }));
  }
  return board;
}

function fromDto(snapshot: SnapshotDto): BoardSnapshot {
  return {
    board: toBoard(snapshot.tasks),
    history: snapshot.history.map(({ id, groupId, title, createdAt, removedAt }) => ({
      id,
      groupId,
      title,
      createdAt,
      removedAt,
    })),
  };
}

function localSnapshot(board: BoardState, history: RemovedTask[]): BoardSnapshot {
  return { board, history };
}

export const boardRepository = {
  async load(): Promise<BoardSnapshot> {
    if (!isTauriRuntime()) return localSnapshot(createInitialBoard(), []);
    return fromDto(await invoke<SnapshotDto>("board_load"));
  },

  async add(
    board: BoardState,
    history: RemovedTask[],
    groupId: GroupId,
    title: string,
  ): Promise<BoardSnapshot> {
    if (!isTauriRuntime()) return localSnapshot(addTask(board, groupId, title), history);
    return fromDto(await invoke<SnapshotDto>("board_add", { groupId, title }));
  },

  async rename(
    board: BoardState,
    history: RemovedTask[],
    taskId: string,
    title: string,
  ): Promise<BoardSnapshot> {
    if (!isTauriRuntime()) {
      return localSnapshot(updateTask(board, taskId, { title }), history);
    }
    return fromDto(await invoke<SnapshotDto>("board_rename", { taskId, title }));
  },

  async move(
    board: BoardState,
    history: RemovedTask[],
    taskId: string,
    targetGroupId: GroupId,
    targetIndex: number,
  ): Promise<BoardSnapshot> {
    if (!isTauriRuntime()) {
      return localSnapshot(moveTask(board, taskId, targetGroupId, targetIndex), history);
    }
    return fromDto(await invoke<SnapshotDto>("board_move", {
      taskId,
      targetGroupId,
      targetIndex,
    }));
  },

  async remove(
    board: BoardState,
    history: RemovedTask[],
    taskId: string,
  ): Promise<BoardSnapshot> {
    if (!isTauriRuntime()) {
      const located = findTask(board, taskId);
      if (!located) return localSnapshot(board, history);
      return localSnapshot(removeTask(board, taskId), [
        { ...located.task, removedAt: Date.now() },
        ...history,
      ]);
    }
    return fromDto(await invoke<SnapshotDto>("board_remove", { taskId }));
  },
};
