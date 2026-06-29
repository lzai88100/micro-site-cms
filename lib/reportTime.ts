const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

function getOffsetHours() {
  return Number(process.env.REPORT_TIMEZONE_OFFSET_HOURS || "8");
}

function getOffsetMs() {
  return getOffsetHours() * HOUR_MS;
}

function toLocalFakeDate(date: Date) {
  return new Date(date.getTime() + getOffsetMs());
}

function localFakeToUtc(localFakeDate: Date) {
  return new Date(localFakeDate.getTime() - getOffsetMs());
}

function formatLocalDate(localFakeDate: Date) {
  const year = localFakeDate.getUTCFullYear();
  const month = String(localFakeDate.getUTCMonth() + 1).padStart(2, "0");
  const day = String(localFakeDate.getUTCDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function formatLocalDateTime(localFakeDate: Date) {
  const date = formatLocalDate(localFakeDate);
  const hour = String(localFakeDate.getUTCHours()).padStart(2, "0");
  const minute = String(localFakeDate.getUTCMinutes()).padStart(2, "0");

  return `${date} ${hour}:${minute}`;
}

export function getWeeklyReportPeriod(now = new Date()) {
  const localNow = toLocalFakeDate(now);
  const localDay = localNow.getUTCDay();
  const daysSinceMonday = (localDay + 6) % 7;

  let localEnd = new Date(
    Date.UTC(
      localNow.getUTCFullYear(),
      localNow.getUTCMonth(),
      localNow.getUTCDate() - daysSinceMonday,
      12,
      0,
      0,
      0
    )
  );

  if (localNow.getTime() < localEnd.getTime()) {
    localEnd = new Date(localEnd.getTime() - 7 * DAY_MS);
  }

  const localStart = new Date(localEnd.getTime() - 7 * DAY_MS);
  const localDisplayEnd = new Date(localEnd.getTime() - 60 * 1000);

  const localPreviousEnd = localStart;
  const localPreviousStart = new Date(localPreviousEnd.getTime() - 7 * DAY_MS);

  return {
    reportType: "weekly" as const,
    sheetTitle: `${formatLocalDate(localStart)}(周表)`,
    startUtc: localFakeToUtc(localStart),
    endUtc: localFakeToUtc(localEnd),
    previousStartUtc: localFakeToUtc(localPreviousStart),
    previousEndUtc: localFakeToUtc(localPreviousEnd),
    periodStartLabel: formatLocalDateTime(localStart),
    periodEndLabel: formatLocalDateTime(localDisplayEnd),
  };
}

export function getMonthlyReportPeriod(now = new Date()) {
  const localNow = toLocalFakeDate(now);

  let localEnd = new Date(
    Date.UTC(localNow.getUTCFullYear(), localNow.getUTCMonth(), 1, 12, 0, 0, 0)
  );

  if (localNow.getTime() < localEnd.getTime()) {
    localEnd = new Date(
      Date.UTC(localNow.getUTCFullYear(), localNow.getUTCMonth() - 1, 1, 12, 0, 0, 0)
    );
  }

  const localStart = new Date(
    Date.UTC(localEnd.getUTCFullYear(), localEnd.getUTCMonth() - 1, 1, 12, 0, 0, 0)
  );

  const localPreviousEnd = localStart;
  const localPreviousStart = new Date(
    Date.UTC(
      localPreviousEnd.getUTCFullYear(),
      localPreviousEnd.getUTCMonth() - 1,
      1,
      12,
      0,
      0,
      0
    )
  );

  const localDisplayEnd = new Date(localEnd.getTime() - 60 * 1000);

  return {
    reportType: "monthly" as const,
    sheetTitle: `${formatLocalDate(localStart)}(月表)`,
    startUtc: localFakeToUtc(localStart),
    endUtc: localFakeToUtc(localEnd),
    previousStartUtc: localFakeToUtc(localPreviousStart),
    previousEndUtc: localFakeToUtc(localPreviousEnd),
    periodStartLabel: formatLocalDateTime(localStart),
    periodEndLabel: formatLocalDateTime(localDisplayEnd),
  };
}