import { useRef, useState } from "react";
import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { Plus } from "lucide-react";
import type { BoardGroup, GroupId } from "../../board/model";
import { getGroupAccessibilityLabel, GroupEmblem } from "./GroupEmblem";
import { TaskCard } from "./TaskCard";

interface BoardColumnViewProps {
  group: BoardGroup;
  editingTaskId: string | null;
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

export function BoardColumnView({
  group,
  editingTaskId,
  onBeginEdit,
  onCancelEdit,
  onCommitTitle,
  onAddTask,
  armedTaskId,
  onArmForRemove,
  onConfirmRemove,
  onBeginEditing,
  onEndEditing,
}: BoardColumnViewProps) {
  const [draft, setDraft] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const enteringEditingRef = useRef(false);
  const { isOver, setNodeRef } = useDroppable({
    id: `group:${group.id}`,
    data: { type: "group", groupId: group.id },
  });
  const accessibilityLabel = getGroupAccessibilityLabel(group.id);

  const submit = () => {
    const title = draft.trim();
    if (!title) return;
    onAddTask(group.id, title);
    setDraft("");
    inputRef.current?.focus();
  };

  const focusInputForEditing = async () => {
    if (document.activeElement === inputRef.current || enteringEditingRef.current) return;
    enteringEditingRef.current = true;
    try {
      if (await onBeginEditing()) inputRef.current?.focus();
    } finally {
      enteringEditingRef.current = false;
    }
  };

  return (
    <section
      ref={setNodeRef}
      className={`board-column board-column--${group.id} ${isOver ? "is-over" : ""}`}
      aria-label={`${accessibilityLabel}，${group.tasks.length} 项`}
    >
      <header className="board-column__header">
        <span className="board-column__emblem" aria-hidden="true">
          <GroupEmblem groupId={group.id} size={100} />
        </span>
        {group.tasks.length > 0 && (
          <span className="board-column__count">{group.tasks.length}</span>
        )}
      </header>

      <form
        className="group-add"
        onSubmit={(event) => {
          event.preventDefault();
          submit();
        }}
      >
        <Plus className="group-add__plus" size={18} aria-hidden="true" />
        <input
          ref={inputRef}
          value={draft}
          aria-label={`添加到${accessibilityLabel}`}
          placeholder="添加一件任务…"
          onPointerDown={(event) => {
            if (!event.isPrimary || document.activeElement === inputRef.current) return;
            event.preventDefault();
            void focusInputForEditing();
          }}
          onChange={(event) => setDraft(event.target.value)}
          onBlur={() => void onEndEditing()}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              submit();
            }
            if (event.key === "Escape") {
              event.preventDefault();
              setDraft("");
              inputRef.current?.blur();
            }
          }}
        />
      </form>

      <SortableContext
        items={group.tasks.map((task) => task.id)}
        strategy={verticalListSortingStrategy}
      >
        <div className="board-column__list">
          {group.tasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              editing={editingTaskId === task.id}
              onBeginEdit={onBeginEdit}
              onCancelEdit={onCancelEdit}
              onCommitTitle={onCommitTitle}
              armed={armedTaskId === task.id}
              onArmForRemove={onArmForRemove}
              onConfirmRemove={onConfirmRemove}
            />
          ))}
        </div>
      </SortableContext>

      <div className="drop-line" aria-hidden="true" />
    </section>
  );
}
