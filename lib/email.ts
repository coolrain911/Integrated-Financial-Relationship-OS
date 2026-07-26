/** Builds a Gmail web-compose URL with the given addresses pre-filled as
 * BCC. Unlike a mailto: link — which hands off to whatever the OS has
 * registered as the default mail app (e.g. Outlook) — this always opens
 * Gmail in the browser, using whichever Google account is signed in there. */
export function buildGmailComposeUrl(emails: string[]): string {
  const unique = Array.from(new Set(emails.filter(Boolean)));
  const params = new URLSearchParams({ view: "cm", fs: "1", bcc: unique.join(",") });
  return `https://mail.google.com/mail/?${params.toString()}`;
}
