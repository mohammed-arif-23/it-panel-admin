import nodemailer from 'nodemailer';

interface EmailConfig {
  host: string;
  port: number;
  secure: boolean;
  auth: {
    user: string;
    pass: string;
  };
}

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

class EmailService {
  private transporter: nodemailer.Transporter;

  constructor() {
    const config: EmailConfig = {
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: false, // true for 465, false for other ports
      auth: {
        user: process.env.SMTP_USER || '',
        pass: process.env.SMTP_PASS || '',
      },
    };

    console.log('Email service initializing with config:', {
      host: config.host,
      port: config.port,
      user: config.auth.user,
      hasPassword: !!config.auth.pass,
    });

    this.transporter = nodemailer.createTransport(config);
  }

  async sendEmail(options: EmailOptions): Promise<{ success: boolean; error?: string }> {
    try {
      const fromEmail = process.env.FROM_EMAIL || process.env.SMTP_USER;
      const fromName = process.env.FROM_NAME || 'Department of IT';
      
      const mailOptions = {
        from: `"${fromName}" <${fromEmail}>`,
        to: options.to,
        subject: options.subject,
        html: options.html,
        text: options.text,
      };

      console.log('Sending email with options:', {
        from: mailOptions.from,
        to: mailOptions.to,
        subject: mailOptions.subject,
      });

      const result = await this.transporter.sendMail(mailOptions);
      console.log('✅ Email sent successfully:', result.messageId);
      return { success: true };
    } catch (error) {
      console.error('❌ Email sending failed:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown email error' 
      };
    }
  }

  async sendSeminarSelectionEmail(
    studentEmail: string,
    studentName: string,
    registerNumber: string,
    seminarDate: string,
    classYear: string
  ): Promise<{ success: boolean; error?: string }> {
    const formattedDate = new Date(seminarDate + 'T12:00:00').toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    const subject = `🎯 You've been selected for seminar on ${formattedDate}`;
    
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Seminar Selection Notification</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
          .highlight { background: #e8f4fd; padding: 20px; border-left: 4px solid #2196F3; margin: 20px 0; border-radius: 5px; }
          .button { display: inline-block; background: #4CAF50; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
          .footer { text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; color: #666; font-size: 14px; }
          .emoji { font-size: 24px; }
          .important { color: #d32f2f; font-weight: bold; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="emoji">🎯</div>
            <h1>Congratulations! You've been selected!</h1>
            <p>Seminar Selection Notification</p>
          </div>
          
          <div class="content">
            <p>Dear <strong>${studentName}</strong>,</p>
            
            <div class="highlight">
              <h3>🎉 Great news!</h3>
              <p>You have been <strong>automatically selected</strong> to present in the upcoming seminar.</p>
            </div>
            
            <h3>📋 Selection Details:</h3>
            <ul>
              <li><strong>Student Name:</strong> ${studentName}</li>
              <li><strong>Register Number:</strong> ${registerNumber}</li>
              <li><strong>Class:</strong> ${classYear}</li>
              <li><strong>Seminar Date:</strong> ${formattedDate}</li>
              <li><strong>Selection Time:</strong> ${new Date().toLocaleString()}</li>
            </ul>
            
  
            
            <h3>📞 Need Help?</h3>
            <p>If you have any questions or concerns about your selection, please contact the Department of IT immediately.</p>
            
            <p>Best of luck with your presentation!</p>
            
            <p>Regards,<br>
            <strong>Department of IT</strong><br>
            College Seminar System</p>
          </div>
          
          <div class="footer">
            <p>This is an automated notification from the College Seminar System.</p>
            <p>Please do not reply to this email.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const text = `
      Congratulations ${studentName}!
      
      You have been selected for the seminar on ${formattedDate}.
      
      Details:
      - Name: ${studentName}
      - Register Number: ${registerNumber}
      - Class: ${classYear}
      - Seminar Date: ${formattedDate}
      
      Important: Attendance is mandatory for selected students.
      
      Please prepare your presentation and arrive 15 minutes early.
      
      Best regards,
      Department of IT
    `;

    return this.sendEmail({
      to: studentEmail,
      subject,
      html,
      text,
    });
  }

  async testConnection(): Promise<{ success: boolean; error?: string }> {
    try {
      await this.transporter.verify();
      console.log('SMTP connection verified successfully');
      return { success: true };
    } catch (error) {
      console.error('SMTP connection failed:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'SMTP connection failed' 
      };
    }
  }
}

export const emailService = new EmailService();
