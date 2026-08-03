import type { BoardState, GroupId, Task } from "./model";

export function createInitialBoard(): BoardState {
  return {
    groups: {
      sword: {
        id: "sword",
        tasks: [],
      },
      shield: {
        id: "shield",
        tasks: [],
      },
    },
  };
}

export function findTask(
  board: BoardState,
  taskId: string,
): { groupId: GroupId; index: number; task: Task } | null {
  for (const group of Object.values(board.groups)) {
    const index = group.tasks.findIndex((task) => task.id === taskId);
    if (index >= 0) {
      return { groupId: group.id, index, task: group.tasks[index] };
    }
  }
  return null;
}

export function updateTask(
  board: BoardState,
  taskId: string,
  updates: Pick<Task, "title">,
): BoardState {
  const located = findTask(board, taskId);
  if (!located) return board;

  const group = board.groups[located.groupId];
  const tasks = group.tasks.map((task) =>
    task.id === taskId ? { ...task, ...updates } : task,
  );

  return {
    groups: {
      ...board.groups,
      [located.groupId]: { ...group, tasks },
    },
  };
}

export function addTask(board: BoardState, groupId: GroupId, title: string): BoardState {
  const normalizedTitle = title.trim();
  if (!normalizedTitle) return board;

  const group = board.groups[groupId];
  const createdAt = Date.now();
  const task: Task = {
    id: `${groupId}-${createdAt}-${Math.random().toString(36).slice(2, 7)}`,
    groupId,
    title: normalizedTitle,
    createdAt,
  };

  return {
    groups: {
      ...board.groups,
      [groupId]: { ...group, tasks: [task, ...group.tasks] },
    },
  };
}

export function moveTask(
  board: BoardState,
  taskId: string,
  targetGroupId: GroupId,
  targetIndex: number,
): BoardState {
  const located = findTask(board, taskId);
  if (!located) return board;

  const sourceGroup = board.groups[located.groupId];
  const targetGroup = board.groups[targetGroupId];
  const nextSourceTasks = sourceGroup.tasks.filter((task) => task.id !== taskId);
  const safeIndex = Math.max(
    0,
    Math.min(targetIndex, located.groupId === targetGroupId
      ? nextSourceTasks.length
      : targetGroup.tasks.length),
  );

  if (located.groupId === targetGroupId) {
    const nextTasks = [...nextSourceTasks];
    nextTasks.splice(safeIndex, 0, located.task);
    return {
      groups: {
        ...board.groups,
        [targetGroupId]: { ...targetGroup, tasks: nextTasks },
      },
    };
  }

  const nextTargetTasks = [...targetGroup.tasks];
  nextTargetTasks.splice(safeIndex, 0, {
    ...located.task,
    groupId: targetGroupId,
  });

  return {
    groups: {
      ...board.groups,
      [located.groupId]: { ...sourceGroup, tasks: nextSourceTasks },
      [targetGroupId]: { ...targetGroup, tasks: nextTargetTasks },
    },
  };
}

export function removeTask(board: BoardState, taskId: string): BoardState {
  const located = findTask(board, taskId);
  if (!located) return board;

  const group = board.groups[located.groupId];
  return {
    groups: {
      ...board.groups,
      [located.groupId]: {
        ...group,
        tasks: group.tasks.filter((task) => task.id !== taskId),
      },
    },
  };
}
