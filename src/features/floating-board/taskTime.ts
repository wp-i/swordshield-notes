function pad(value: number): string {
  return String(value).padStart(2, "0");
}

export function formatTaskCreatedAt(timestamp: number, reference = Date.now()): string {
  const created = new Date(timestamp);
  const now = new Date(reference);
  const time = `${pad(created.getHours())}:${pad(created.getMinutes())}`;
  const isToday = created.getFullYear() === now.getFullYear()
    && created.getMonth() === now.getMonth()
    && created.getDate() === now.getDate();

  return isToday
    ? time
    : `${pad(created.getMonth() + 1)}/${pad(created.getDate())} ${time}`;
}
