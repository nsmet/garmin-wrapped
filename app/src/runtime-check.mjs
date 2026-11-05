export function assertRecapRuntime(timeZone = "UTC") {
  try {
    const date = new Intl.DateTimeFormat("en-CA", {
      timeZone: "UTC",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      hourCycle: "h23",
      weekday: "long",
    });
    const parts = Object.fromEntries(
      date
        .formatToParts(new Date("2025-01-01T00:00:00Z"))
        .map((part) => [part.type, part.value]),
    );
    if (
      parts.year !== "2025" ||
      parts.month !== "01" ||
      parts.day !== "01" ||
      parts.hour !== "00" ||
      parts.weekday !== "Wednesday"
    )
      throw Error();
    new Intl.DateTimeFormat("en", { timeZone }).format(new Date());
    if (
      new Intl.NumberFormat("en", {
        minimumFractionDigits: 1,
        maximumFractionDigits: 1,
      }).format(1234.56) !== "1,234.6"
    )
      throw Error();
  } catch {
    const error = new Error(
      "This device cannot format recap dates and measurements reliably. Update your operating system and try again. No Garmin records were requested.",
    );
    error.code = "RUNTIME_UNSUPPORTED";
    throw error;
  }
}
