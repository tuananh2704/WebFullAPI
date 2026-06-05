export const formatCurrency = (value: string | number | null | undefined) => {
  const amount = Number(value || 0);
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
  }).format(amount);
};

export const parseLocalDateTime = (value: string) => {
  const normalized = String(value || "").replace("T", " ");
  const match = normalized.match(
    /^(\d{4})-(\d{2})-(\d{2})[ ](\d{2}):(\d{2})(?::(\d{2}))?$/
  );

  if (match) {
    const [, year, month, day, hour, minute, second = "0"] = match;
    return new Date(
      Number(year),
      Number(month) - 1,
      Number(day),
      Number(hour),
      Number(minute),
      Number(second)
    );
  }

  return new Date(value);
};

export const formatDateTime = (value: string) => {
  return new Intl.DateTimeFormat("vi-VN", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(parseLocalDateTime(value));
};

export const formatTime = (value: string) => {
  return new Intl.DateTimeFormat("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(parseLocalDateTime(value));
};
