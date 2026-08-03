import type { RemovedTask } from "../../board/model";
import { GroupEmblem } from "../floating-board/GroupEmblem";

interface HistoryPanelProps {
  history: RemovedTask[];
}

function formatRemovedAt(timestamp: number): string {
  return new Intl.DateTimeFormat("zh-CN", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(timestamp));
}

export function HistoryPanel({ history }: HistoryPanelProps) {
  return (
    <section className="history-panel" aria-label="移除历史">
      {history.length === 0 ? (
        <div className="history-panel__empty">还没有移除过任务</div>
      ) : (
        <ol className="history-list">
          {history.map((task) => (
            <li key={task.id} className={`history-item history-item--${task.groupId}`}>
              <span className="history-item__emblem" aria-hidden="true">
                <GroupEmblem groupId={task.groupId} size={24} />
              </span>
              <span className="history-item__content">
                <strong>{task.title}</strong>
                <time dateTime={new Date(task.removedAt).toISOString()}>
                  {formatRemovedAt(task.removedAt)}
                </time>
              </span>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
