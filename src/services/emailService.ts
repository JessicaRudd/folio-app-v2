import { Resend } from 'resend';

let resendClient: Resend | null = null;

function getResend() {
  if (!resendClient) {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      console.warn('RESEND_API_KEY is not set. Emails will not be sent.');
      return null;
    }
    console.log(`Initializing Resend client with API key starting with: ${apiKey.substring(0, 7)}...`);
    resendClient = new Resend(apiKey);
  }
  return resendClient;
}

function getFromEmail() {
  const email = process.env.RESEND_FROM_EMAIL || 'Folio <hello@curateyourfolio.com>';
  console.log(`Using FROM_EMAIL: ${email}`);
  return email;
}

function getBrandUrl() {
  const url = process.env.RESEND_BRAND_URL || 'https://curateyourfolio.com';
  console.log(`Using BRAND_URL: ${url}`);
  return url;
}

export async function sendInviteEmail({ 
  email, 
  collectionTitle, 
  shareUrl, 
  creatorName,
  inviteToken,
  type = 'collection',
  baseUrl
}: { 
  email: string; 
  collectionTitle?: string; 
  shareUrl?: string; 
  creatorName?: string;
  inviteToken?: string;
  type?: 'collection' | 'early-access';
  baseUrl?: string;
}) {
  const resend = getResend();
  if (!resend) {
    return { error: 'RESEND_API_KEY not set' };
  }

  const isEarlyAccess = type === 'early-access';
  const subject = isEarlyAccess 
    ? "You've received your stamp! 🕊️"
    : `Invite: View ${collectionTitle} on Folio`;

  // Prioritize the environment variable BRAND_URL if it's explicitly set, 
  // otherwise use the passed baseUrl (from request) or the default.
  const envBrandUrl = process.env.RESEND_BRAND_URL;
  const finalBaseUrl = envBrandUrl || baseUrl || getBrandUrl();
  const unlockUrl = `${finalBaseUrl}/unlock?token=${inviteToken}`;

  const html = isEarlyAccess ? `
    <div style="font-family: 'Georgia', serif; max-width: 600px; margin: 0 auto; padding: 60px 40px; background: #fdfcfb; color: #1a1a1a; border: 1px solid #eee; border-radius: 4px;">
      <div style="text-align: center; margin-bottom: 40px;">
        <div style="display: inline-block; width: 60px; height: 60px; border: 2px dashed #1a1a1a; border-radius: 50%; padding: 5px; margin-bottom: 20px;">
          <div style="width: 100%; height: 100%; background: #1a1a1a; border-radius: 50%; display: flex; align-items: center; justify-content: center;">
            <span style="color: white; font-weight: bold; font-size: 24px;">F</span>
          </div>
        </div>
      </div>
      
      <h1 style="font-size: 28px; font-weight: normal; text-align: center; margin-bottom: 32px; letter-spacing: -0.02em;">You've received your stamp!</h1>
      
      <p style="font-size: 18px; line-height: 1.8; margin-bottom: 40px; text-align: center; color: #444;">
        The wait is over. Your invitation to the Folio inner circle has been officially stamped and delivered. 
        We're thrilled to have you join our private beta.
      </p>
      
      <p style="font-size: 16px; line-height: 1.8; margin-bottom: 40px; text-align: center; color: #666; font-style: italic;">
        Click below to unlock your private dashboard, create your account, and start curating your most precious memories.
      </p>
      
      <div style="text-align: center; margin: 60px 0;">
        <a href="${unlockUrl}" style="display: inline-block; background: #1a1a1a; color: white; padding: 20px 40px; text-decoration: none; font-weight: bold; text-transform: uppercase; letter-spacing: 0.2em; font-size: 12px; border-radius: 4px; transition: all 0.3s ease;">
          Unlock Your Folio
        </a>
      </div>
      
      <div style="margin-top: 60px; padding-top: 30px; border-top: 1px solid #eee; text-align: center;">
        <p style="font-size: 12px; color: #999; text-transform: uppercase; letter-spacing: 0.1em;">
          Folio &copy; 2026 &mdash; Private Beta
        </p>
      </div>
    </div>
  ` : `
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
        This is a private link sent via <a href="${getBrandUrl()}" style="color: #4a5d4e; text-decoration: none;">${getBrandUrl().replace('https://', '')}</a>. Please do not share it with others.
      </p>
    </div>
  `;

  const text = isEarlyAccess 
    ? `You've received your stamp! The wait is over. Your invitation to the Folio inner circle has been officially stamped and delivered. Unlock your folio here: ${unlockUrl}`
    : `${creatorName} has invited you to view their private collection: ${collectionTitle}. View it here: ${shareUrl}`;

  try {
    const { data, error } = await resend.emails.send({
      from: getFromEmail(),
      to: email,
      subject,
      html,
      text
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
  const resend = getResend();
  if (!resend) {
    return { error: 'RESEND_API_KEY not set' };
  }

  try {
    const { data, error } = await resend.emails.send({
      from: getFromEmail(),
      to: email,
      subject: `Your Access Code for ${collectionTitle}`,
      text: `Your access code for ${collectionTitle} is: ${otp}`,
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
            Sent via <a href="${getBrandUrl()}" style="color: #4a5d4e; text-decoration: none;">${getBrandUrl().replace('https://', '')}</a>. This code will expire shortly.
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
