/** Builds a mailto: URL that opens the user's own email client with the
 * given addresses pre-filled as BCC, so recipients can't see each other. */
export function buildMailtoUrl(emails: string[]): string {
  const unique = Array.from(new Set(emails.filter(Boolean)));
  return `mailto:?bcc=${encodeURIComponent(unique.join(","))}`;
}
