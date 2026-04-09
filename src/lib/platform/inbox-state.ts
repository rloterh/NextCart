import type {
  PlatformInboxItem,
  PlatformInboxPayload,
  PlatformNotificationState,
  PlatformNotificationStateRecord,
} from "@/types/platform";

export function isMissingNotificationStateTable(message: string | null | undefined) {
  if (!message) return false;
  const normalized = message.toLowerCase();
  return normalized.includes("notification_states") || normalized.includes("relation") || normalized.includes("does not exist");
}

export function applyNotificationStateToItems(
  items: PlatformInboxItem[],
  stateRecords: PlatformNotificationStateRecord[]
) {
  const stateMap = new Map(stateRecords.map((record) => [record.item_id, record]));

  return items
    .map((item) => {
      const state = stateMap.get(item.id);
      if (!state) {
        return item;
      }

      return {
        ...item,
        state: state.state,
        readAt: state.read_at,
        archivedAt: state.archived_at,
      };
    })
    .filter((item) => item.state !== "archived");
}

export function summarizeInboxItems(items: PlatformInboxItem[]): PlatformInboxPayload["summary"] {
  return items.reduce(
    (summary, item) => {
      summary.total += 1;
      if (item.tone === "danger") {
        summary.urgent += 1;
      }
      if (item.tone === "warning") {
        summary.attention += 1;
      }
      if (item.state === "unread") {
        summary.unread += 1;
      }
      return summary;
    },
    { total: 0, urgent: 0, attention: 0, unread: 0 }
  );
}

export function buildNotificationStateUpdate(
  userId: string,
  itemId: string,
  state: PlatformNotificationState
): PlatformNotificationStateRecord {
  const now = new Date().toISOString();

  return {
    user_id: userId,
    item_id: itemId,
    state,
    read_at: state === "unread" ? null : now,
    archived_at: state === "archived" ? now : null,
  };
}
