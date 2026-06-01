// Shared HTML email templates for KickHub

const otpTemplate = (name, otp) => `
<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <title>KickHub Verification Code</title>
    <style>
      body { font-family: Arial, Helvetica, sans-serif; background:#f4f7fb; margin:0; padding:20px }
      .card { max-width:600px; margin:24px auto; background:#ffffff; border-radius:8px; box-shadow:0 2px 10px rgba(0,0,0,0.08); overflow:hidden }
      .header { background:#0b63ff; color:white; padding:18px 24px }
      .content { padding:24px; color:#333 }
      .otp { display:inline-block; padding:12px 18px; font-size:28px; letter-spacing:4px; background:#f1f7ff; border-radius:6px; margin:12px 0 }
      .small { color:#666; font-size:13px }
      .footer { background:#fafafa; padding:14px 24px; text-align:center; color:#888; font-size:12px }
    </style>
  </head>
  <body>
    <div class="card">
      <div class="header">
        <h2>KickHub</h2>
      </div>
      <div class="content">
        <p>Hi <strong>${name || 'there'}</strong>,</p>
        <p>Use the verification code below to complete your account registration. This code expires in 10 minutes.</p>
        <div class="otp">${otp}</div>
        <p class="small">If you didn't request this code, you can safely ignore this email.</p>
      </div>
      <div class="footer">© ${new Date().getFullYear()} KickHub — Bringing players together</div>
    </div>
  </body>
</html>
`;

const forgotPasswordTemplate = (name, token) => `
<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <title>Reset your KickHub password</title>
    <style>
      body { font-family: Arial, Helvetica, sans-serif; background:#f4f7fb; margin:0; padding:20px }
      .card { max-width:680px; margin:24px auto; background:#ffffff; border-radius:8px; box-shadow:0 2px 10px rgba(0,0,0,0.08); overflow:hidden }
      .header { background:#0b63ff; color:white; padding:18px 24px }
      .content { padding:24px; color:#333 }
      .token { display:inline-block; padding:10px 14px; font-size:20px; letter-spacing:3px; background:#fff6e5; border-radius:6px; margin:12px 0; color:#b36b00 }
      .button { display:inline-block; background:#0b63ff; color:white; padding:10px 16px; border-radius:6px; text-decoration:none; margin-top:12px }
      .small { color:#666; font-size:13px }
      .footer { background:#fafafa; padding:14px 24px; text-align:center; color:#888; font-size:12px }
    </style>
  </head>
  <body>
    <div class="card">
      <div class="header"><h2>KickHub</h2></div>
      <div class="content">
        <p>Hi <strong>${name || 'there'}</strong>,</p>
        <p>We received a request to reset your KickHub password. Use the code below to reset it. This code will expire in 1 hour.</p>
        <div class="token">${token}</div>
        <p>If you prefer, you can also reset your password from the app or use the "Forgot Password" flow.</p>
        <p class="small">If you did not request a password reset, please ignore this email or contact support.</p>
      </div>
      <div class="footer">© ${new Date().getFullYear()} KickHub — Need help? Reply to this email.</div>
    </div>
  </body>
</html>
`;

module.exports = { otpTemplate, forgotPasswordTemplate };
