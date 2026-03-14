const nodemailer = require('nodemailer');
const { emailTemplateCache, configCache } = require('../utils/cache');
let sendgridMail = null;
try {
  // Optional dependency. Only required when SENDGRID_API_KEY is set.
  sendgridMail = require('@sendgrid/mail');
} catch (error) {
  sendgridMail = null;
}

class EmailService {
  constructor() {
    this.transporter = null;
    this.isConnected = false;
    this.provider = process.env.SENDGRID_API_KEY ? 'sendgrid' : 'smtp';
    const smtpPort = Number(process.env.SMTP_PORT) || 587;
    const smtpSecure = process.env.SMTP_SECURE
      ? process.env.SMTP_SECURE === 'true'
      : smtpPort === 465;

    this.config = {
      service: process.env.SMTP_SERVICE || 'gmail',
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: smtpPort,
      secure: smtpSecure,
      retryAttempts: 2,
      retryDelay: 1000,
      connectionTimeout: 10000,
      greetingTimeout: 10000,
      socketTimeout: 10000
    };
    
    console.log('📧 EmailService initialized');
  }

  /**
   * Initialize email service with Gmail SMTP
   */
  async initialize() {
    try {
      if (this.provider === 'sendgrid') {
        if (!process.env.SENDGRID_API_KEY) {
          const error = new Error('SendGrid API key not found in environment variables');
          error.code = 'SENDGRID_API_KEY_MISSING';
          throw error;
        }
        if (!sendgridMail) {
          const error = new Error('SendGrid SDK not installed. Add @sendgrid/mail to server dependencies.');
          error.code = 'SENDGRID_SDK_MISSING';
          throw error;
        }

        sendgridMail.setApiKey(process.env.SENDGRID_API_KEY);
        this.isConnected = true;
        console.log('✅ SendGrid email service initialized successfully');
        return { success: true, message: 'SendGrid email service connected' };
      }

      const user = process.env.SMTP_USER || process.env.GMAIL_USER;
      const pass = process.env.SMTP_PASS || process.env.GMAIL_APP_PASSWORD;

      if (!user || !pass) {
        const error = new Error('Email credentials not found in environment variables');
        error.code = 'EMAIL_CREDENTIALS_MISSING';
        throw error;
      }

      this.transporter = nodemailer.createTransport({
        service: this.config.service,
        host: this.config.host,
        port: this.config.port,
        secure: this.config.secure,
        auth: {
          user,
          pass
        },
        tls: {
          rejectUnauthorized: false
        },
        connectionTimeout: this.config.connectionTimeout,
        greetingTimeout: this.config.greetingTimeout,
        socketTimeout: this.config.socketTimeout
      });

      // Verify connection
      await this.verifyConnection();
      this.isConnected = true;
      console.log('✅ Gmail SMTP service initialized successfully');
      
      return { success: true, message: 'Email service connected' };
    } catch (error) {
      console.error('⚠️ Email service initialization failed:', error.message);
      if (error.code || error.responseCode) {
        console.error('SMTP error details:', {
          code: error.code,
          responseCode: error.responseCode,
          response: error.response
        });
      }
      
      this.transporter = null;
      this.isConnected = false;
      
      throw error;
    }
  }

  /**
   * Verify SMTP connection
   */
  async verifyConnection() {
    if (!this.transporter) {
      throw new Error('Email transporter not initialized');
    }
    
    await this.transporter.verify();
    console.log('📧 SMTP connection verified');
    return true;
  }

  /**
   * Get professional email template for OTP
   */
  getOtpEmailTemplate(otp, options = {}) {
    const { 
      isResend = false, 
      userName = null,
      expirationMinutes = 10 
    } = options;

    const subject = isResend ? 'Your New OTP for HackTrack' : 'Your OTP for HackTrack';
    const greeting = userName ? `Hello ${userName},` : 'Hello,';
    const actionText = isResend ? 'You requested a new OTP for HackTrack.' : 'Thank you for using HackTrack.';
    const otpText = isResend ? 'Your new OTP is:' : 'Your verification OTP is:';

    const html = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${subject}</title>
        <style>
          body { margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f8fafc; }
          .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; }
          .header { background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%); padding: 40px 20px; text-align: center; }
          .header h1 { color: #ffffff; margin: 0; font-size: 28px; font-weight: 600; }
          .content { padding: 40px 30px; }
          .greeting { font-size: 16px; color: #374151; margin-bottom: 20px; }
          .action-text { font-size: 16px; color: #374151; margin-bottom: 30px; }
          .otp-container { background: #f3f4f6; border: 2px dashed #d1d5db; border-radius: 12px; padding: 30px; text-align: center; margin: 30px 0; }
          .otp-label { font-size: 14px; color: #6b7280; margin-bottom: 10px; text-transform: uppercase; letter-spacing: 1px; }
          .otp-code { font-size: 36px; font-weight: bold; color: #1f2937; letter-spacing: 8px; font-family: 'Courier New', monospace; }
          .expiry-info { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 30px 0; border-radius: 4px; }
          .expiry-text { color: #92400e; font-size: 14px; margin: 0; }
          .security-notice { background: #fef2f2; border-left: 4px solid #ef4444; padding: 15px; margin: 30px 0; border-radius: 4px; }
          .security-text { color: #991b1b; font-size: 14px; margin: 0; }
          .footer { background: #f9fafb; padding: 30px; text-align: center; border-top: 1px solid #e5e7eb; }
          .footer-text { color: #6b7280; font-size: 14px; margin: 0; }
          .company-name { color: #4f46e5; font-weight: 600; }
          .help-text { color: #9ca3af; font-size: 12px; margin-top: 20px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🔐 HackTrack Security</h1>
          </div>
          
          <div class="content">
            <p class="greeting">${greeting}</p>
            <p class="action-text">${actionText} ${otpText}</p>
            
            <div class="otp-container">
              <div class="otp-label">Your Verification Code</div>
              <div class="otp-code">${otp}</div>
            </div>
            
            <div class="expiry-info">
              <p class="expiry-text">
                ⏰ This OTP is valid for ${expirationMinutes} minutes only. Please use it promptly.
              </p>
            </div>
            
            <div class="security-notice">
              <p class="security-text">
                🔒 For your security, never share this OTP with anyone. HackTrack will never ask for your OTP via phone or email.
              </p>
            </div>
            
            <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">
              If you didn't request this OTP, you can safely ignore this email. Your account remains secure.
            </p>
          </div>
          
          <div class="footer">
            <p class="footer-text">
              Best regards,<br>
              The <span class="company-name">HackTrack</span> Team
            </p>
            <p class="help-text">
              Need help? Contact us at support@hacktrack.com
            </p>
          </div>
        </div>
      </body>
      </html>
    `;

    const text = `
${greeting}

${actionText} ${otpText}

Your OTP: ${otp}

This OTP is valid for ${expirationMinutes} minutes. Please do not share it with anyone.

If you didn't request this OTP, you can safely ignore this email.

Best regards,
The HackTrack Team
    `.trim();

    return { subject, html, text };
  }

  /**
   * Send OTP email with retry logic
   */
  async sendOtpEmail(email, otp, options = {}) {
    const { 
      isResend = false, 
      userName = null,
      expirationMinutes = 10 
    } = options;

    console.log(`📧 Sending ${isResend ? 'resend' : 'new'} OTP email to ${email}`);

    if (this.provider === 'sendgrid') {
      const template = this.getOtpEmailTemplate(otp, { isResend, userName, expirationMinutes });
      const fromAddress = process.env.SENDGRID_FROM || process.env.SMTP_FROM || process.env.GMAIL_USER;
      if (!fromAddress) {
        const error = new Error('SendGrid from address not configured');
        error.code = 'SENDGRID_FROM_MISSING';
        throw error;
      }

      const message = {
        to: email,
        from: fromAddress,
        subject: template.subject,
        text: template.text,
        html: template.html
      };

      try {
        await this.initialize();
        const result = await this.sendWithRetrySendGrid(message);
        console.log('✅ OTP email sent successfully (SendGrid)');
        return {
          success: true,
          messageId: result?.headers?.['x-message-id'],
          message: 'OTP email sent successfully'
        };
      } catch (error) {
        console.error('❌ Failed to send OTP email (SendGrid):', error.message);
        throw error;
      }
    }

    // Check if service is available
    if (!this.transporter || !this.isConnected) {
      try {
        await this.initialize();
      } catch (initError) {
        const error = new Error(
          initError.code === 'ETIMEDOUT'
            ? 'SMTP connection timed out. Hosting provider may block SMTP ports.'
            : initError.message || 'Email service not configured'
        );
        error.code = initError.code || 'EMAIL_SERVICE_NOT_CONFIGURED';
        throw error;
      }
    }

    try {
      // Get email template
      const template = this.getOtpEmailTemplate(otp, { isResend, userName, expirationMinutes });
      
      // Prepare mail options
      const fromAddress = process.env.SMTP_FROM || process.env.GMAIL_USER;
      const mailOptions = {
        from: `"HackTrack Security" <${fromAddress}>`,
        to: email,
        subject: template.subject,
        html: template.html,
        text: template.text,
        headers: {
          'X-Priority': '1',
          'X-MSMail-Priority': 'High',
          'Importance': 'high'
        }
      };

      // Send email with retry logic
      const result = await this.sendWithRetry(mailOptions);
      
      console.log('✅ OTP email sent successfully');
      console.log(`📧 Message ID: ${result.messageId}`);
      
      return {
        success: true,
        messageId: result.messageId,
        message: 'OTP email sent successfully',
        previewUrl: process.env.NODE_ENV === 'development' ? nodemailer.getTestMessageUrl(result) : undefined
      };

    } catch (error) {
      console.error('❌ Failed to send OTP email:', error.message);
      if (error.code || error.responseCode) {
        console.error('SMTP error details:', {
          code: error.code,
          responseCode: error.responseCode,
          response: error.response
        });
      }
      throw error;
    }
  }

  /**
   * Send email with retry logic
   */
  async sendWithRetry(mailOptions, attempt = 1) {
    try {
      if (!this.transporter) {
        const error = new Error('Email transporter not initialized');
        error.code = 'EMAIL_TRANSPORTER_MISSING';
        throw error;
      }

      const result = await this.transporter.sendMail(mailOptions);
      return result;
    } catch (error) {
      console.error(`📧 Email send attempt ${attempt} failed:`, error.message);
      
      const nonRetryable = new Set([
        'EAUTH',
        'EENVELOPE',
        'EMAIL_TRANSPORTER_MISSING',
        'EMAIL_CREDENTIALS_MISSING'
      ]);

      if (!nonRetryable.has(error.code) && attempt < this.config.retryAttempts) {
        console.log(`🔄 Retrying email send in ${this.config.retryDelay}ms...`);
        await new Promise(resolve => setTimeout(resolve, this.config.retryDelay * attempt));
        return this.sendWithRetry(mailOptions, attempt + 1);
      }
      
      throw error;
    }
  }

  /**
   * Send email with retry logic using SendGrid
   */
  async sendWithRetrySendGrid(message, attempt = 1) {
    try {
      const [response] = await sendgridMail.send(message);
      return response;
    } catch (error) {
      const statusCode = error?.response?.statusCode;
      console.error(`📧 SendGrid send attempt ${attempt} failed:`, error.message);

      const nonRetryable = statusCode && statusCode >= 400 && statusCode < 500 && statusCode !== 429;
      if (!nonRetryable && attempt < this.config.retryAttempts) {
        console.log(`🔄 Retrying SendGrid email send in ${this.config.retryDelay}ms...`);
        await new Promise(resolve => setTimeout(resolve, this.config.retryDelay * attempt));
        return this.sendWithRetrySendGrid(message, attempt + 1);
      }

      throw error;
    }
  }

  /**
   * Send welcome email after successful registration
   */
  async sendWelcomeEmail(email, userName) {
    console.log(`📧 Sending welcome email to ${email}`);

    if (this.provider === 'sendgrid') {
      const subject = 'Welcome to HackTrack! 🎉';
      const html = `
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>${subject}</title>
          <style>
            body { margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f8fafc; }
            .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; }
            .header { background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 40px 20px; text-align: center; }
            .header h1 { color: #ffffff; margin: 0; font-size: 28px; font-weight: 600; }
            .content { padding: 40px 30px; }
            .welcome-text { font-size: 18px; color: #374151; margin-bottom: 30px; }
            .features { background: #f0fdf4; padding: 30px; border-radius: 12px; margin: 30px 0; }
            .feature-item { margin: 15px 0; color: #166534; }
            .cta-button { display: inline-block; background: #10b981; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: 600; margin: 20px 0; }
            .footer { background: #f9fafb; padding: 30px; text-align: center; border-top: 1px solid #e5e7eb; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🎉 Welcome to HackTrack!</h1>
            </div>
            
            <div class="content">
              <p class="welcome-text">
                Hello ${userName || 'there'}! 👋
              </p>
              <p class="welcome-text">
                Congratulations! Your HackTrack account has been successfully created and verified. 
                You're now ready to start tracking your hackathon journey!
              </p>
              
              <div class="features">
                <h3 style="color: #166534; margin-top: 0;">🚀 What you can do now:</h3>
                <div class="feature-item">📝 Create and manage hackathon projects</div>
                <div class="feature-item">📅 Sync with Google Calendar</div>
                <div class="feature-item">🏆 Track your achievements</div>
                <div class="feature-item">👥 Collaborate with team members</div>
              </div>
              
              <div style="text-align: center;">
                <a href="#" class="cta-button">Get Started Now</a>
              </div>
              
              <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">
                If you have any questions, feel free to reach out to our support team.
              </p>
            </div>
            
            <div class="footer">
              <p style="color: #6b7280; font-size: 14px; margin: 0;">
                Happy hacking!<br>
                The <span style="color: #10b981; font-weight: 600;">HackTrack</span> Team
              </p>
            </div>
          </div>
        </body>
        </html>
      `;

      const fromAddress = process.env.SENDGRID_FROM || process.env.SMTP_FROM || process.env.GMAIL_USER;
      if (!fromAddress) {
        console.log('📧 SendGrid from address missing, skipping welcome email');
        return { success: true, demoMode: true };
      }

      try {
        await this.initialize();
        const message = { to: email, from: fromAddress, subject, html };
        await this.sendWithRetrySendGrid(message);
        console.log('✅ Welcome email sent successfully (SendGrid)');
        return { success: true, message: 'Welcome email sent successfully' };
      } catch (error) {
        console.error('❌ Failed to send welcome email (SendGrid):', error.message);
        return { success: false, error: error.message, message: 'Welcome email failed but registration completed' };
      }
    }

    if (!this.transporter || !this.isConnected) {
      console.log('📧 Email service not available, skipping welcome email');
      return { success: true, demoMode: true };
    }

    const subject = 'Welcome to HackTrack! 🎉';
    const html = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${subject}</title>
        <style>
          body { margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f8fafc; }
          .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; }
          .header { background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 40px 20px; text-align: center; }
          .header h1 { color: #ffffff; margin: 0; font-size: 28px; font-weight: 600; }
          .content { padding: 40px 30px; }
          .welcome-text { font-size: 18px; color: #374151; margin-bottom: 30px; }
          .features { background: #f0fdf4; padding: 30px; border-radius: 12px; margin: 30px 0; }
          .feature-item { margin: 15px 0; color: #166534; }
          .cta-button { display: inline-block; background: #10b981; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: 600; margin: 20px 0; }
          .footer { background: #f9fafb; padding: 30px; text-align: center; border-top: 1px solid #e5e7eb; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🎉 Welcome to HackTrack!</h1>
          </div>
          
          <div class="content">
            <p class="welcome-text">
              Hello ${userName || 'there'}! 👋
            </p>
            <p class="welcome-text">
              Congratulations! Your HackTrack account has been successfully created and verified. 
              You're now ready to start tracking your hackathon journey!
            </p>
            
            <div class="features">
              <h3 style="color: #166534; margin-top: 0;">🚀 What you can do now:</h3>
              <div class="feature-item">📝 Create and manage hackathon projects</div>
              <div class="feature-item">📅 Sync with Google Calendar</div>
              <div class="feature-item">🏆 Track your achievements</div>
              <div class="feature-item">👥 Collaborate with team members</div>
            </div>
            
            <div style="text-align: center;">
              <a href="#" class="cta-button">Get Started Now</a>
            </div>
            
            <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">
              If you have any questions, feel free to reach out to our support team.
            </p>
          </div>
          
          <div class="footer">
            <p style="color: #6b7280; font-size: 14px; margin: 0;">
              Happy hacking!<br>
              The <span style="color: #10b981; font-weight: 600;">HackTrack</span> Team
            </p>
          </div>
        </div>
      </body>
      </html>
    `;

    try {
      const fromAddress = process.env.SMTP_FROM || process.env.GMAIL_USER;
      const mailOptions = {
        from: `"HackTrack Team" <${fromAddress}>`,
        to: email,
        subject,
        html
      };

      const result = await this.sendWithRetry(mailOptions);
      console.log('✅ Welcome email sent successfully');
      
      return {
        success: true,
        messageId: result.messageId,
        message: 'Welcome email sent successfully'
      };

    } catch (error) {
      console.error('❌ Failed to send welcome email:', error.message);
      // Don't throw error for welcome email - it's not critical
      return {
        success: false,
        error: error.message,
        message: 'Welcome email failed but registration completed'
      };
    }
  }

  /**
   * Get service status
   */
  getStatus() {
    return {
      isConnected: this.isConnected,
      hasTransporter: !!this.transporter,
      provider: this.provider,
      config: {
        service: this.config.service,
        host: this.config.host,
        port: this.config.port
      },
      credentials: {
        hasUser: !!(process.env.SMTP_USER || process.env.GMAIL_USER || process.env.SENDGRID_FROM),
        hasPassword: !!(process.env.SMTP_PASS || process.env.GMAIL_APP_PASSWORD || process.env.SENDGRID_API_KEY)
      }
    };
  }
}

module.exports = EmailService;
