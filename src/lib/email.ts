import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM = process.env.EMAIL_FROM || "noreply@daddymoto.com";

export async function sendPasswordResetEmail(to: string, token: string) {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  const resetUrl = `${siteUrl}/auth/reset-password?token=${token}`;

  await resend.emails.send({
    from: `Daddy Moto <${FROM}>`,
    to,
    subject: "Reset your Daddy Moto password",
    text: `Click the link below to reset your password. It expires in 1 hour.\n\n${resetUrl}\n\nIf you didn't request this, ignore this email.`,
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:auto;">
        <h2 style="color:#ef4444;">Daddy Moto</h2>
        <p>Click the button below to reset your password. This link expires in <strong>1 hour</strong>.</p>
        <a href="${resetUrl}"
           style="display:inline-block;background:#ef4444;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:bold;">
          Reset Password
        </a>
        <p style="margin-top:24px;color:#888;font-size:13px;">
          If you didn't request a password reset, you can safely ignore this email.
        </p>
      </div>
    `,
  });
}

export async function sendContactEmail(opts: {
  to: string;
  replyTo: string;
  senderName: string;
  senderEmail: string;
  listingTitle: string;
  body: string;
}) {
  await resend.emails.send({
    from: `Daddy Moto <${FROM}>`,
    to: opts.to,
    reply_to: opts.replyTo,
    subject: `New message about: ${opts.listingTitle}`,
    text: `You have a new message from ${opts.senderName} (${opts.senderEmail}) about your listing "${opts.listingTitle}":\n\n${opts.body}\n\n---\nReply directly to this email to respond.`,
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:auto;">
        <p>You have a new message from <strong>${opts.senderName}</strong> (<a href="mailto:${opts.senderEmail}">${opts.senderEmail}</a>) about your listing <strong>"${opts.listingTitle}"</strong>:</p>
        <blockquote style="border-left:3px solid #ef4444;padding-left:12px;margin:16px 0;color:#555;">${opts.body.replace(/\n/g, "<br>")}</blockquote>
        <p>Reply directly to this email to respond.</p>
        <p style="color:#999;font-size:12px;">— Daddy Moto</p>
      </div>
    `,
  });
}
