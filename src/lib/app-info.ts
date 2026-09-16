export const APP_NAME = "JobPix";
export const APP_VERSION = "1.0.0";
export const SUPPORT_EMAIL = "jobpixhelp@repairman.com";

/** Small, non-sensitive diagnostics appended to support emails. */
export function diagnostics(screen: string) {
  const platform =
    typeof navigator !== "undefined" ? navigator.userAgent.slice(0, 160) : "unknown";
  return [
    "",
    "---",
    `${APP_NAME} version: ${APP_VERSION}`,
    `Screen: ${screen}`,
    `Device: ${platform}`,
  ].join("\n");
}

export function mailto(subject: string, body: string) {
  return `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}
