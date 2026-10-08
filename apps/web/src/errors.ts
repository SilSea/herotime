import { serverText, tr } from "./i18n.js";
import { ApiError } from "./net.js";

/** At most this many reports per page load, so a looping bug cannot flood the server. */
const MAX_REPORTS = 20;
let reports = 0;

/**
 * Send an unexpected error to the server log (POST /client-errors). Players never see its details;
 * nothing is printed in the page either.
 */
export function reportError(e: unknown, where: string): void {
  if (reports >= MAX_REPORTS) return;
  reports++;
  const err = e instanceof Error ? e : undefined;
  const body = {
    where,
    message: err ? `${err.name}: ${err.message}` : typeof e === "string" ? e : JSON.stringify(e) ?? String(e),
    stack: err?.stack ?? "",
    page: location.pathname + location.hash,
  };
  try {
    void fetch("/client-errors", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body), keepalive: true }).catch(() => undefined);
  } catch {
    // reporting must never throw
  }
}

/** fetch() itself failed: offline, or the server is down. */
const unreachable = (e: unknown): boolean => e instanceof TypeError && /fetch|network|load failed/i.test(e.message);

/**
 * What to show for a failed action. The server's own answers (ApiError) are written for people and are shown;
 * anything else is a bug or a dropped connection, reported to the server log and shown as a plain message.
 */
export function userMessage(e: unknown, where: string, fallback = tr("Something went wrong. Please try again.", "เกิดข้อผิดพลาด ลองใหม่อีกครั้ง")): string {
  if (e instanceof ApiError) return serverText(e.message);
  if (unreachable(e)) return tr("Cannot reach the game server. Check your connection and try again.", "เชื่อมต่อเซิร์ฟเวอร์เกมไม่ได้ ตรวจการเชื่อมต่อแล้วลองใหม่");
  reportError(e, where);
  return fallback;
}

/** Catch whatever no handler did (a bug in a click handler, a forgotten promise) and send it to the server log. */
export function installErrorReporting(): void {
  window.addEventListener("error", (ev) => {
    reportError(ev.error ?? ev.message, "window.onerror");
    ev.preventDefault();
  });
  window.addEventListener("unhandledrejection", (ev) => {
    reportError(ev.reason, "unhandledrejection");
    ev.preventDefault();
  });
}
