import { requirePlatformCapability } from "@/lib/platform/readiness.server";
import type { PlatformDigestPayload, PlatformInboxItem } from "@/types/platform";

export class PlatformEmailDeliveryError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PlatformEmailDeliveryError";
  }
}

export function getNotificationDeliveryConfig() {
  requirePlatformCapability("notification_delivery");

  const apiKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.NOTIFICATION_FROM_EMAIL;
  const replyToEmail = process.env.NOTIFICATION_REPLY_TO_EMAIL;

  if (!apiKey || !fromEmail) {
    throw new PlatformEmailDeliveryError(
      "Notification delivery is not configured. Add RESEND_API_KEY and NOTIFICATION_FROM_EMAIL."
    );
  }

  return {
    apiKey,
    fromEmail,
    replyToEmail: replyToEmail || undefined,
  };
}

function renderInboxItemsHtml(items: PlatformInboxItem[]) {
  return items
    .slice(0, 5)
    .map(
      (item) => `
        <li style="margin:0 0 18px;padding:0;list-style:none;border:1px solid #e7e5e4;padding:16px;background:#fafaf9;">
          <p style="margin:0 0 8px;font-size:11px;letter-spacing:0.12em;text-transform:uppercase;color:#78716c;">${item.eventKey.replaceAll(".", " ")}</p>
          <p style="margin:0 0 8px;font-size:16px;font-weight:600;color:#1c1917;">${item.title}</p>
          <p style="margin:0 0 8px;font-size:14px;line-height:1.6;color:#57534e;">${item.description}</p>
          ${
            item.emailTemplate
              ? `<p style="margin:0;font-size:12px;color:#78716c;">Email-ready subject: ${item.emailTemplate.subject}</p>`
              : ""
          }
        </li>
      `
    )
    .join("");
}

function renderDigestHtml(digest: PlatformDigestPayload) {
  return `
    <div style="font-family:Inter,Segoe UI,Arial,sans-serif;max-width:720px;margin:0 auto;padding:32px;background:#ffffff;color:#1c1917;">
      <p style="margin:0 0 8px;font-size:11px;letter-spacing:0.14em;text-transform:uppercase;color:#78716c;">NexCart operational digest</p>
      <h1 style="margin:0 0 12px;font-family:Georgia,Times New Roman,serif;font-size:32px;font-weight:500;color:#1c1917;">${digest.title}</h1>
      <p style="margin:0 0 24px;font-size:15px;line-height:1.7;color:#57534e;">${digest.summary}</p>

      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:12px;margin-bottom:28px;">
        ${digest.sections
          .map(
            (section) => `
              <div style="border:1px solid #e7e5e4;padding:16px;background:#fafaf9;">
                <p style="margin:0 0 6px;font-size:11px;letter-spacing:0.12em;text-transform:uppercase;color:#78716c;">${section.label}</p>
                <p style="margin:0 0 6px;font-size:24px;font-weight:600;color:#1c1917;">${section.value}</p>
                <p style="margin:0;font-size:13px;line-height:1.5;color:#57534e;">${section.description}</p>
              </div>
            `
          )
          .join("")}
      </div>

      <h2 style="margin:0 0 12px;font-size:18px;font-weight:600;color:#1c1917;">Priority follow-up</h2>
      <ul style="margin:0;padding:0;">
        ${renderInboxItemsHtml(digest.inboxPreview)}
      </ul>
    </div>
  `;
}

function renderDigestText(digest: PlatformDigestPayload) {
  return [
    digest.title,
    "",
    digest.summary,
    "",
    ...digest.sections.flatMap((section) => [`${section.label}: ${section.value}`, section.description, ""]),
    "Priority follow-up:",
    ...digest.inboxPreview.slice(0, 5).flatMap((item) => [
      `- ${item.title}`,
      `  ${item.description}`,
      item.emailTemplate ? `  Email-ready subject: ${item.emailTemplate.subject}` : "",
      "",
    ]),
  ]
    .filter(Boolean)
    .join("\n");
}

export async function sendPlatformDigestEmail({
  to,
  digest,
}: {
  to: string;
  digest: PlatformDigestPayload;
}) {
  const config = getNotificationDeliveryConfig();

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: config.fromEmail,
      to: [to],
      reply_to: config.replyToEmail ? [config.replyToEmail] : undefined,
      subject: `${digest.title} - NexCart`,
      html: renderDigestHtml(digest),
      text: renderDigestText(digest),
    }),
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as { message?: string } | null;
    throw new PlatformEmailDeliveryError(
      payload?.message ?? "Email delivery provider rejected the digest request."
    );
  }

  return response.json().catch(() => null);
}
