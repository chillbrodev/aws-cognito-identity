const MONTH_NAMES = [
  "", "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];
const WEEK_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/**
 * Current time in "ddd MMM D HH:mm:ss UTC YYYY" format (Cognito SRP).
 */
export function getNowString(): string {
  const now = new Date();
  const weekDay = WEEK_NAMES[now.getUTCDay()];
  const month = MONTH_NAMES[now.getUTCMonth() + 1];
  const day = now.getUTCDate();
  const hours = now.getUTCHours().toString().padStart(2, "0");
  const minutes = now.getUTCMinutes().toString().padStart(2, "0");
  const seconds = now.getUTCSeconds().toString().padStart(2, "0");
  const year = now.getUTCFullYear();
  return `${weekDay} ${month} ${day} ${hours}:${minutes}:${seconds} UTC ${year}`;
}
