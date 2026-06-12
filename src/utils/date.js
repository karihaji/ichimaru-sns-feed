const dateFormatter = new Intl.DateTimeFormat("ja-JP", {
  year: "numeric",
  month: "long",
  day: "numeric"
});

export function formatDate(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "日付不明" : dateFormatter.format(date);
}
