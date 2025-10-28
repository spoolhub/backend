import { sleep } from 'src/utils/sleep';

export type Mail = Record<string, unknown> & {
  subject: string;
  text: string;
};

/**
 * Waits for an email to be received at a specific address by polling a mail server URL.
 *
 * @param email The email address to watch for.
 * @param timeout The maximum time to wait in milliseconds.
 * @returns The first email found.
 * @throws An error if no email is found within the timeout period.
 */
export async function waitForEmail(
  email: string,
  timeout = 15000
): Promise<Mail> {
  const startTime = Date.now();
  // MailHog/MailCatcher URL format
  const url = `http://127.0.0.1:1080/email?headers.to=${encodeURIComponent(
    email
  )}`;

  while (Date.now() - startTime < timeout) {
    try {
      const response = await fetch(url, {
        headers: {
          Accept: 'application/json',
        },
      });
      if (response.ok) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        const data = await response.json();
        if (Array.isArray(data) && data.length > 0) {
          // Email found, return the most recent one
          return data[0] as Mail;
        }
      }
    } catch (error) {
      // Ignore fetch errors (e.g., server not ready) and retry
      throw new Error(`Can't connect to maildev server`, { cause: error });
    }

    // Wait for a second before the next poll
    await sleep(1000);
  }

  throw new Error(`Timeout: Email to ${email} not found within ${timeout} ms.`);
}
