import type { CSSProperties } from "react";
import type { GroupId } from "../../board/model";

const accessibilityLabels: Record<GroupId, string> = {
  sword: "左侧任务区",
  shield: "右侧任务区",
};

interface GroupEmblemProps {
  groupId: GroupId;
  size?: number;
}

export function getGroupAccessibilityLabel(groupId: GroupId): string {
  return accessibilityLabels[groupId];
}

export function GroupEmblem({ groupId, size = 20 }: GroupEmblemProps) {
  return (
    <span
      className={`pixel-emblem pixel-emblem--${groupId}`}
      style={{ "--emblem-size": `${size}px` } as CSSProperties}
      aria-hidden="true"
    />
  );
}
