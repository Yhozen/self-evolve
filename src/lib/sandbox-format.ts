export function formatTimestamp(value: string | null) {
  if (!value) {
    return "Not available";
  }

  const formatter = new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: "America/New_York",
  });

  const parts = formatter.formatToParts(new Date(value));
  const lookup = new Map(parts.map((part) => [part.type, part.value]));

  return `${lookup.get("month")} ${lookup.get("day")}, ${lookup.get("year")}, ${lookup.get("hour")}:${lookup.get("minute")} ${lookup.get("dayPeriod")}`;
}

export function formatDuration(timeoutMs: number) {
  const minutes = Math.floor(timeoutMs / 60000);
  const seconds = Math.floor((timeoutMs % 60000) / 1000);

  if (minutes === 0) {
    return `${seconds}s`;
  }

  if (seconds === 0) {
    return `${minutes}m`;
  }

  return `${minutes}m ${seconds}s`;
}

export function formatBytes(sizeBytes: number) {
  if (sizeBytes < 1024) {
    return `${sizeBytes} B`;
  }

  const sizeMb = sizeBytes / (1024 * 1024);

  if (sizeMb < 1024) {
    return `${sizeMb.toFixed(sizeMb >= 10 ? 0 : 1)} MB`;
  }

  return `${(sizeMb / 1024).toFixed(1)} GB`;
}
