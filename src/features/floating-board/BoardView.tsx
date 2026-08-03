import { useRef, useState } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  pointerWithin,
  useSensor,
  useSensors,
  type CollisionDetection,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { findTask } from "../../board/boardState";
import { groupIds, type BoardState, type GroupId } from "../../board/model";
import { BoardColumnView } from "./BoardColumnView";

interface BoardViewProps {
  board: BoardState;
  editingTaskId: string | null;
  onMoveTask: (taskId: string, targetGroupId: GroupId, targetIndex: number) => void;
  onBeginEdit: (taskId: string) => void;
  onCancelEdit: () => void;
  onCommitTitle: (taskId: string, title: string) => void;
  onAddTask: (groupId: GroupId, title: string) => void;
  armedTaskId: string | null;
  onArmForRemove: (taskId: string) => void;
  onConfirmRemove: (taskId: string) => void;
  onBeginEditing: () => Promise<boolean>;
  onEndEditing: () => Promise<void>;
}

function groupFromOverId(overId: string): GroupId | null {
  if (!overId.startsWith("group:")) return null;
  const id = overId.slice("group:".length);
  return groupIds.includes(id as GroupId) ? (id as GroupId) : null;
}

const preferTaskUnderPointer: CollisionDetection = (arguments_) => {
  const collisions = pointerWithin(arguments_);
  const taskCollision = collisions.find(
    (collision) => !String(collision.id).startsWith("group:"),
  );
  return taskCollision ? [taskCollision] : collisions;
};

export function BoardView({
  board,
  editingTaskId,
  onMoveTask,
  onBeginEdit,
  onCancelEdit,
  onCommitTitle,
  onAddTask,
  armedTaskId,
  onArmForRemove,
  onConfirmRemove,
  onBeginEditing,
  onEndEditing,
}: BoardViewProps) {
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);
  const boardRef = useRef(board);
  boardRef.current = board;

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
  );

  const handleDragStart = ({ active }: DragStartEvent) => {
    const taskId = String(active.id);
    setActiveTaskId(taskId);
    onCancelEdit();
  };

  const locateTarget = (overId: string) => {
    const overTask = findTask(boardRef.current, overId);
    if (overTask) {
      return { groupId: overTask.groupId, index: overTask.index };
    }

    const groupId = groupFromOverId(overId);
    if (!groupId) return null;
    return {
      groupId,
      index: boardRef.current.groups[groupId].tasks.length,
    };
  };

  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over) return setActiveTaskId(null);

    const taskId = String(active.id);
    const target = locateTarget(String(over.id));
    if (target && String(over.id) !== taskId) {
      onMoveTask(taskId, target.groupId, target.index);
    }
    setActiveTaskId(null);
  };

  const handleDragCancel = () => setActiveTaskId(null);
  const activeTask = activeTaskId ? findTask(board, activeTaskId)?.task : null;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={preferTaskUnderPointer}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <main className="board-grid" aria-label="任务看板">
        {groupIds.map((groupId) => (
          <BoardColumnView
            key={groupId}
            group={board.groups[groupId]}
            editingTaskId={editingTaskId}
            onBeginEdit={onBeginEdit}
            onCancelEdit={onCancelEdit}
            onCommitTitle={onCommitTitle}
            onAddTask={onAddTask}
            armedTaskId={armedTaskId}
            onArmForRemove={onArmForRemove}
            onConfirmRemove={onConfirmRemove}
            onBeginEditing={onBeginEditing}
            onEndEditing={onEndEditing}
          />
        ))}
      </main>

      <DragOverlay>
        {activeTask ? (
          <div className={`task-card task-card--${activeTask.groupId} task-card--overlay`}>
            <span className="task-card__seal" aria-hidden="true" />
            <p className="task-card__title">{activeTask.title}</p>
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
