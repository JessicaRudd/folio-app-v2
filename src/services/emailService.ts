import { Resend } from 'resend';

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'Folio <hello@curateyourfolio.com>';
const BRAND_URL = process.env.RESEND_BRAND_URL || 'https://curateyourfolio.com';

export async function sendInviteEmail({ 
  email, 
  collectionTitle, 
  shareUrl, 
  creatorName 
}: { 
  email: string; 
  collectionTitle: string; 
  shareUrl: string; 
  creatorName: string;
}) {
  if (!resend) {
    const msg = 'RESEND_API_KEY not set. Skipping email send.';
    console.warn(msg);
    return { error: msg };
  }

  try {
    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: email,
      subject: `Invite: View ${collectionTitle} on Folio`,
      html: `
        <div style="font-family: serif; max-width: 600px; margin: 0 auto; padding: 40px; background: #fdfcfb; color: #1a1a1a;">
          <h1 style="font-size: 32px; margin-bottom: 24px;">You've been invited</h1>
          <p style="font-size: 18px; line-height: 1.6; font-style: italic; color: #4a4a4a;">
            ${creatorName} has invited you to view their private collection: <strong>${collectionTitle}</strong>.
          </p>
          <div style="margin: 40px 0;">
            <a href="${shareUrl}" style="background: #4a5d4e; color: white; padding: 16px 32px; text-decoration: none; border-radius: 8px; font-weight: bold; font-family: sans-serif; display: inline-block;">
              View Collection
            </a>
          </div>
          <p style="font-size: 14px; color: #8a8a8a; margin-top: 40px; border-top: 1px solid #eee; pt: 20px;">
            This is a private link sent via <a href="${BRAND_URL}" style="color: #4a5d4e; text-decoration: none;">${BRAND_URL.replace('https://', '')}</a>. Please do not share it with others.
          </p>
        </div>
      `
    });

    if (error) {
      console.error('Resend error:', error);
      return { error: error.message };
    }
    return { success: true, data };
  } catch (error: any) {
    console.error('Error sending invite email:', error);
    return { error: error.message };
  }
}

export async function sendOtpEmail({ 
  email, 
  otp, 
  collectionTitle 
}: { 
  email: string; 
  otp: string; 
  collectionTitle: string;
}) {
  if (!resend) {
    const msg = 'RESEND_API_KEY not set. Skipping email send.';
    console.warn(msg);
    return { error: msg };
  }

  try {
    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: email,
      subject: `Your Access Code for ${collectionTitle}`,
      html: `
        <div style="font-family: serif; max-width: 600px; margin: 0 auto; padding: 40px; background: #fdfcfb; color: #1a1a1a;">
          <h1 style="font-size: 32px; margin-bottom: 24px;">Access Code</h1>
          <p style="font-size: 18px; line-height: 1.6; color: #4a4a4a;">
            Use the following code to access the private collection <strong>${collectionTitle}</strong>:
          </p>
          <div style="margin: 40px 0; text-align: center;">
            <span style="font-size: 48px; font-weight: bold; letter-spacing: 12px; font-family: monospace; background: #f0f0f0; padding: 20px 40px; border-radius: 12px;">
              ${otp}
            </span>
          </div>
          <p style="font-size: 14px; color: #8a8a8a; margin-top: 40px; border-top: 1px solid #eee; pt: 20px;">
            Sent via <a href="${BRAND_URL}" style="color: #4a5d4e; text-decoration: none;">${BRAND_URL.replace('https://', '')}</a>. This code will expire shortly.
          </p>
        </div>
      `
    });

    if (error) {
      console.error('Resend error:', error);
      return { error: error.message };
    }
    return { success: true, data };
  } catch (error: any) {
    console.error('Error sending OTP email:', error);
    return { error: error.message };
  }
}
