const nodemailer = require("nodemailer");

const getMailConfig = () => {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || 587);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass) {
    throw new Error("SMTP email config is missing");
  }

  return {
    host,
    port,
    secure: process.env.SMTP_SECURE === "true",
    auth: {
      user,
      pass,
    },
  };
};

const createTransporter = () => nodemailer.createTransport(getMailConfig());

const escapeHtml = (value) =>
  String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

const sendVerificationEmail = async ({ to, fullName, verificationCode }) => {
  const transporter = createTransporter();
  const from = process.env.SMTP_FROM || process.env.SMTP_USER;
  const safeFullName = escapeHtml(fullName);
  const safeVerificationCode = escapeHtml(verificationCode);

  const info = await transporter.sendMail({
    from,
    to,
    subject: "Mã OTP xác minh tài khoản CINEMAX",
    text: `Xin chào ${fullName},\n\nMã OTP xác minh tài khoản CINEMAX của bạn là: ${verificationCode}\nMã có hiệu lực trong 5 phút.\n\nNếu bạn không thực hiện đăng ký, vui lòng bỏ qua email này.`,
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #222;">
        <h2 style="margin: 0 0 12px;">Xác minh tài khoản CINEMAX</h2>
        <p>Xin chào ${safeFullName},</p>
        <p>Mã OTP xác minh tài khoản của bạn là:</p>
        <p style="font-size: 28px; font-weight: 700; letter-spacing: 4px; margin: 16px 0;">
          ${safeVerificationCode}
        </p>
        <p>Mã có hiệu lực trong 5 phút.</p>
        <p>Nếu bạn không thực hiện đăng ký, vui lòng bỏ qua email này.</p>
      </div>
    `,
  });

  if (process.env.NODE_ENV !== "production") {
    console.log("Verification email result", {
      messageId: info.messageId,
      accepted: info.accepted,
      rejected: info.rejected,
    });
  }

  if (info.rejected?.length) {
    throw new Error(`SMTP rejected recipients: ${info.rejected.join(", ")}`);
  }

  return info;
};

const sendPasswordChangeEmail = async ({ to, fullName, verificationCode }) => {
  const transporter = createTransporter();
  const from = process.env.SMTP_FROM || process.env.SMTP_USER;
  const safeFullName = escapeHtml(fullName);
  const safeVerificationCode = escapeHtml(verificationCode);

  const info = await transporter.sendMail({
    from,
    to,
    subject: "Mã OTP đổi mật khẩu CINEMAX",
    text: `Xin chào ${fullName},\n\nMã OTP đổi mật khẩu CINEMAX của bạn là: ${verificationCode}\nMã có hiệu lực trong 5 phút.\n\nNếu bạn không yêu cầu đổi mật khẩu, vui lòng bỏ qua email này.`,
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #222;">
        <h2 style="margin: 0 0 12px;">Đổi mật khẩu CINEMAX</h2>
        <p>Xin chào ${safeFullName},</p>
        <p>Mã OTP đổi mật khẩu của bạn là:</p>
        <p style="font-size: 28px; font-weight: 700; letter-spacing: 4px; margin: 16px 0;">
          ${safeVerificationCode}
        </p>
        <p>Mã có hiệu lực trong 5 phút.</p>
        <p>Nếu bạn không yêu cầu đổi mật khẩu, vui lòng bỏ qua email này.</p>
      </div>
    `,
  });

  if (process.env.NODE_ENV !== "production") {
    console.log("Password change email result", {
      messageId: info.messageId,
      accepted: info.accepted,
      rejected: info.rejected,
    });
  }

  if (info.rejected?.length) {
    throw new Error(`SMTP rejected recipients: ${info.rejected.join(", ")}`);
  }

  return info;
};

module.exports = {
  sendVerificationEmail,
  sendPasswordChangeEmail,
};
