import nodemailer from "nodemailer";
import crypto from "crypto";

/**
 * Email service for sending verification and password reset emails
 * Based on mature patterns from popular authentication libraries
 */

// Email configuration from environment variables
const EMAIL_FROM = process.env.EMAIL_FROM || "noreply@stockkanban.com";
const EMAIL_HOST = process.env.EMAIL_HOST || "smtp.gmail.com";
const EMAIL_PORT = parseInt(process.env.EMAIL_PORT || "587");
const EMAIL_USER = process.env.EMAIL_USER;
const EMAIL_PASSWORD = process.env.EMAIL_PASSWORD;
const APP_URL = process.env.APP_URL || "http://localhost:5000";

// Create transporter
let transporter: nodemailer.Transporter | null = null;

async function getTransporter(): Promise<nodemailer.Transporter> {
  if (!transporter) {
    // If email credentials are not configured, fail in production or create test account in development
    if (!EMAIL_USER || !EMAIL_PASSWORD) {
      if (process.env.NODE_ENV === "production") {
        throw new Error("Email credentials not configured. Set EMAIL_USER and EMAIL_PASSWORD environment variables.");
      }
      
      console.warn("⚠️  Email credentials not configured. Using test account for development.");
      console.warn("   Set EMAIL_USER and EMAIL_PASSWORD environment variables for production.");
      
      // Create real ethereal test account for development
      const testAccount = await nodemailer.createTestAccount();
      transporter = nodemailer.createTransport({
        host: testAccount.smtp.host,
        port: testAccount.smtp.port,
        secure: testAccount.smtp.secure,
        auth: {
          user: testAccount.user,
          pass: testAccount.pass,
        },
      });
    } else {
      transporter = nodemailer.createTransport({
        host: EMAIL_HOST,
        port: EMAIL_PORT,
        secure: EMAIL_PORT === 465,
        auth: {
          user: EMAIL_USER,
          pass: EMAIL_PASSWORD,
        },
      });
    }
  }
  return transporter;
}

/**
 * Generate a secure random token
 */
export function generateToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

/**
 * Send email verification email
 */
export async function sendVerificationEmail(
  email: string,
  username: string,
  token: string
): Promise<{ success: boolean; messageId?: string; previewUrl?: string }> {
  try {
    const verificationUrl = `${APP_URL}/verify-email?token=${token}`;
    
    const mailOptions = {
      from: EMAIL_FROM,
      to: email,
      subject: "Verify Your Email - Stock Kanban",
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #4F46E5; color: white; padding: 20px; text-align: center; }
            .content { background: #f9fafb; padding: 30px; border-radius: 8px; margin-top: 20px; }
            .button { display: inline-block; background: #4F46E5; color: white; padding: 12px 30px; 
                     text-decoration: none; border-radius: 6px; margin: 20px 0; }
            .footer { text-align: center; margin-top: 30px; font-size: 12px; color: #666; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Stock Kanban</h1>
            </div>
            <div class="content">
              <h2>Welcome, ${username}!</h2>
              <p>Thank you for registering with Stock Kanban. Please verify your email address to activate your account.</p>
              <p>Click the button below to verify your email:</p>
              <a href="${verificationUrl}" class="button">Verify Email</a>
              <p>Or copy and paste this link into your browser:</p>
              <p style="word-break: break-all; color: #4F46E5;">${verificationUrl}</p>
              <p style="margin-top: 30px; color: #666;">
                <strong>This link will expire in 24 hours.</strong>
              </p>
              <p style="color: #666;">
                If you didn't create an account, you can safely ignore this email.
              </p>
            </div>
            <div class="footer">
              <p>© 2026 Stock Kanban. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `
        Welcome to Stock Kanban, ${username}!
        
        Please verify your email address by clicking the link below:
        ${verificationUrl}
        
        This link will expire in 24 hours.
        
        If you didn't create an account, you can safely ignore this email.
      `,
    };

    const transporter = await getTransporter();
    const info = await transporter.sendMail(mailOptions);
    
    // Get preview URL for development (ethereal.email)
    const previewUrl = nodemailer.getTestMessageUrl(info);
    
    if (previewUrl) {
      console.log("📧 Email preview URL:", previewUrl);
    }
    
    return {
      success: true,
      messageId: info.messageId,
      previewUrl: previewUrl || undefined,
    };
  } catch (error) {
    console.error("Failed to send verification email:", error);
    return { success: false };
  }
}

/**
 * Send password reset email
 */
export async function sendPasswordResetEmail(
  email: string,
  username: string,
  token: string
): Promise<{ success: boolean; messageId?: string; previewUrl?: string }> {
  try {
    const resetUrl = `${APP_URL}/reset-password?token=${token}`;
    
    const mailOptions = {
      from: EMAIL_FROM,
      to: email,
      subject: "Reset Your Password - Stock Kanban",
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #4F46E5; color: white; padding: 20px; text-align: center; }
            .content { background: #f9fafb; padding: 30px; border-radius: 8px; margin-top: 20px; }
            .button { display: inline-block; background: #DC2626; color: white; padding: 12px 30px; 
                     text-decoration: none; border-radius: 6px; margin: 20px 0; }
            .footer { text-align: center; margin-top: 30px; font-size: 12px; color: #666; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Stock Kanban</h1>
            </div>
            <div class="content">
              <h2>Password Reset Request</h2>
              <p>Hello ${username},</p>
              <p>We received a request to reset your password. Click the button below to create a new password:</p>
              <a href="${resetUrl}" class="button">Reset Password</a>
              <p>Or copy and paste this link into your browser:</p>
              <p style="word-break: break-all; color: #4F46E5;">${resetUrl}</p>
              <p style="margin-top: 30px; color: #666;">
                <strong>This link will expire in 1 hour.</strong>
              </p>
              <p style="color: #DC2626;">
                <strong>Security Notice:</strong> If you didn't request a password reset, please ignore this email 
                and consider changing your password immediately.
              </p>
            </div>
            <div class="footer">
              <p>© 2026 Stock Kanban. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `
        Password Reset Request - Stock Kanban
        
        Hello ${username},
        
        We received a request to reset your password. Click the link below to create a new password:
        ${resetUrl}
        
        This link will expire in 1 hour.
        
        If you didn't request a password reset, please ignore this email and consider changing your password immediately.
      `,
    };

    const transporter = await getTransporter();
    const info = await transporter.sendMail(mailOptions);
    
    // Get preview URL for development
    const previewUrl = nodemailer.getTestMessageUrl(info);
    
    if (previewUrl) {
      console.log("📧 Email preview URL:", previewUrl);
    }
    
    return {
      success: true,
      messageId: info.messageId,
      previewUrl: previewUrl || undefined,
    };
  } catch (error) {
    console.error("Failed to send password reset email:", error);
    return { success: false };
  }
}

/**
 * Verify email configuration
 */
export async function verifyEmailConfig(): Promise<boolean> {
  try {
    const transporter = await getTransporter();
    await transporter.verify();
    console.log("✅ Email service is ready");
    return true;
  } catch (error) {
    console.error("❌ Email service configuration error:", error);
    return false;
  }
}
