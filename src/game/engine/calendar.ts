const DATE_KEY_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

export function getLocalDateKey(date = new Date()) {
  const year = String(date.getFullYear()).padStart(4, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

export function getNextLocalDateKey(dateKey: string) {
  const match = DATE_KEY_PATTERN.exec(dateKey);
  if (!match) {
    return dateKey;
  }

  const [, year, month, day] = match;
  const nextDate = new Date(
    Number(year),
    Number(month) - 1,
    Number(day) + 1,
    12,
  );

  return getLocalDateKey(nextDate);
}

export function isDateKeyAvailable(
  availableOn: string | null,
  currentDateKey: string,
) {
  return availableOn !== null && currentDateKey >= availableOn;
}
