export const groupIds = ["sword", "shield"] as const;

export type GroupId = (typeof groupIds)[number];

export interface Task {
  id: string;
  groupId: GroupId;
  title: string;
  createdAt: number;
}

export interface BoardGroup {
  id: GroupId;
  tasks: Task[];
}

export interface BoardState {
  groups: Record<GroupId, BoardGroup>;
}

export interface RemovedTask extends Task {
  removedAt: number;
}

export interface BoardSnapshot {
  board: BoardState;
  history: RemovedTask[];
}
