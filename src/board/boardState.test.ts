import { describe, expect, it } from "vitest";
import {
  addTask,
  createInitialBoard,
  findTask,
  moveTask,
  removeTask,
  updateTask,
} from "./boardState";

describe("board state", () => {
  it("starts with two empty board groups", () => {
    const board = createInitialBoard();

    expect(board.groups.sword.tasks).toEqual([]);
    expect(board.groups.shield.tasks).toEqual([]);
  });

  it("moves a task across board groups without duplicating it", () => {
    const board = addTask(createInitialBoard(), "shield", "待移动任务");
    const taskId = board.groups.shield.tasks[0].id;
    const createdAt = board.groups.shield.tasks[0].createdAt;
    const moved = moveTask(board, taskId, "sword", 0);
    const located = findTask(moved, taskId);
    const occurrences = Object.values(moved.groups).flatMap((group) =>
      group.tasks.filter((task) => task.id === taskId),
    );

    expect(located?.groupId).toBe("sword");
    expect(located?.index).toBe(0);
    expect(located?.task.createdAt).toBe(createdAt);
    expect(occurrences).toHaveLength(1);
  });

  it("reorders within a board group", () => {
    const first = addTask(createInitialBoard(), "sword", "第一件");
    const firstId = first.groups.sword.tasks[0].id;
    const second = addTask(first, "sword", "第二件");
    const secondId = second.groups.sword.tasks[0].id;
    const moved = moveTask(second, secondId, "sword", 1);

    expect(moved.groups.sword.tasks.map((task) => task.id)).toEqual([firstId, secondId]);
  });

  it("updates only the requested task", () => {
    const first = addTask(createInitialBoard(), "shield", "保留标题");
    const firstId = first.groups.shield.tasks[0].id;
    const board = addTask(first, "shield", "旧标题");
    const changedId = board.groups.shield.tasks[0].id;
    const createdAt = board.groups.shield.tasks[0].createdAt;
    const changed = updateTask(board, changedId, { title: "新的标题" });

    expect(findTask(changed, changedId)?.task.title).toBe("新的标题");
    expect(findTask(changed, changedId)?.task.createdAt).toBe(createdAt);
    expect(findTask(changed, firstId)?.task).toEqual(findTask(board, firstId)?.task);
  });

  it("adds a task directly to its destination group", () => {
    const changed = addTask(createInitialBoard(), "sword", "  现在处理  ");

    expect(changed.groups.sword.tasks[0]).toMatchObject({
      groupId: "sword",
      title: "现在处理",
    });
    expect(changed.groups.shield.tasks).toHaveLength(0);
  });

  it("removes only the requested active task", () => {
    const first = addTask(createInitialBoard(), "sword", "保留任务");
    const retainedId = first.groups.sword.tasks[0].id;
    const board = addTask(first, "sword", "移除任务");
    const removedId = board.groups.sword.tasks[0].id;
    const changed = removeTask(board, removedId);

    expect(findTask(changed, removedId)).toBeNull();
    expect(findTask(changed, retainedId)).not.toBeNull();
    expect(changed.groups.sword.tasks).toHaveLength(1);
    expect(changed.groups.shield.tasks).toHaveLength(0);
  });
});
