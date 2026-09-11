import { useEffect, useRef, useState } from "react";
import { CSS } from "@dnd-kit/utilities";
import { useSortable } from "@dnd-kit/sortable";
import type { Task } from "../../board/model";
import { formatTaskCreatedAt } from "./taskTime";

interface TaskCardProps {
  task: Task;
  editing: boolean;
  onBeginEdit: (taskId: string) => void;
  onCancelEdit: () => void;
  onCommitTitle: (taskId: string, title: string) => void;
  armed: boolean;
  onArmForRemove: (taskId: string) => void;
  onConfirmRemove: (taskId: string) => void;
}

export function TaskCard({
  task,
  editing,
  onBeginEdit,
  onCancelEdit,
  onCommitTitle,
  armed,
  onArmForRemove,
  onConfirmRemove,
}: TaskCardProps) {
  const [draft, setDraft] = useState(task.title);
  const [error, setError] = useState(false);
  const [striking, setStriking] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const removeTimerRef = useRef<number | null>(null);
  const {
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: task.id,
    data: { type: "task", groupId: task.groupId },
  });

  useEffect(() => {
    if (!editing) {
      setDraft(task.title);
      setError(false);
      return;
    }

    const frame = requestAnimationFrame(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
      resizeEditor();
    });
    return () => cancelAnimationFrame(frame);
  }, [editing, task.title]);

  useEffect(() => () => {
    if (removeTimerRef.current !== null) window.clearTimeout(removeTimerRef.current);
  }, []);

  const commit = () => {
    const title = draft.trim();
    if (!title) {
      setError(true);
      return;
    }
    onCommitTitle(task.id, title);
  };

  const resizeEditor = () => {
    const editor = inputRef.current;
    if (!editor) return;

    editor.style.height = "auto";
    editor.style.height = `${editor.scrollHeight}px`;
  };

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <article
      ref={setNodeRef}
      style={style}
      className={[
        "task-card",
        `task-card--${task.groupId}`,
        editing ? "is-editing" : "",
        armed ? "is-armed" : "",
        striking ? "is-striking" : "",
        isDragging ? "is-dragging" : "",
      ].filter(Boolean).join(" ")}
      onClick={(event) => {
        if (editing || (event.target as HTMLElement).closest(".task-card__remove")) return;
        onArmForRemove(task.id);
      }}
      onDoubleClick={() => onBeginEdit(task.id)}
      {...(editing ? {} : listeners)}
    >
      <span className="task-card__seal" aria-hidden="true" />
      {armed && !editing && (
        <button
          type="button"
          className="task-card__remove"
          aria-label={`确认移除“${task.title}”`}
          disabled={striking}
          onPointerDown={(event) => event.stopPropagation()}
          onDoubleClick={(event) => event.stopPropagation()}
          onClick={(event) => {
            event.stopPropagation();
            if (striking) return;
            setStriking(true);
            const dismissDelay = window.matchMedia("(prefers-reduced-motion: reduce)").matches
              ? 0
              : 180;
            removeTimerRef.current = window.setTimeout(() => {
              removeTimerRef.current = null;
              onConfirmRemove(task.id);
            }, dismissDelay);
          }}
        >
          <svg className="task-card__remove-mark" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M2.7 18.5C9.1 17.6 15.1 12.6 21 3.2C17.8 13.2 11.8 19.5 3.9 21.4Z" />
            <path className="task-card__remove-trail" d="M3.7 12.8C8.8 12.4 13.4 9.8 17.7 5.3C14.8 10.6 10.2 14 4.6 14.9Z" />
            <path className="task-card__remove-spark" d="M17.8 3.9L20.7 4.9L22 1.8L21.8 6.3Z" />
          </svg>
        </button>
      )}

      {editing ? (
        <div
          className="inline-editor"
          onPointerDown={(event) => event.stopPropagation()}
          onDoubleClick={(event) => event.stopPropagation()}
        >
          <textarea
            ref={inputRef}
            value={draft}
            rows={1}
            aria-label="编辑任务标题"
            aria-invalid={error}
            onChange={(event) => {
              setDraft(event.target.value);
              setError(false);
              requestAnimationFrame(resizeEditor);
            }}
            onBlur={commit}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                commit();
              }
              if (event.key === "Escape") onCancelEdit();
            }}
          />
          {error && <span className="inline-editor__error">标题不能为空</span>}
        </div>
      ) : (
        <>
          <p className="task-card__title">{task.title}</p>
          <time
            className="task-card__created-at"
            dateTime={new Date(task.createdAt).toISOString()}
          >
            {formatTaskCreatedAt(task.createdAt)}
          </time>
        </>
      )}
    </article>
  );
}
