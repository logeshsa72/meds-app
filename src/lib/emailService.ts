// lib/emailService.ts
import { supabase } from './supabase';

// Email configuration
const EMAIL_CONFIG = {
  // Using Resend (recommended - free tier: 3000 emails/month)
  // Sign up at https://resend.com
  RESEND_API_KEY: import.meta.env.VITE_RESEND_API_KEY,
  
  // Fallback: Using SMTP (optional)
  SMTP_HOST: import.meta.env.VITE_SMTP_HOST,
  SMTP_PORT: import.meta.env.VITE_SMTP_PORT,
  SMTP_USER: import.meta.env.VITE_SMTP_USER,
  SMTP_PASS: import.meta.env.VITE_SMTP_PASS,
  
  // Email addresses
  FROM_EMAIL: 'MedBuddy <notifications@medbuddy.app>',
  FROM_NAME: 'MedBuddy Care System'
};

interface EmailData {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

interface MissedMedicationInfo {
  patientName: string;
  medicationName: string;
  dosage: string;
  scheduledTime: string;
  missedTime: string;
  delayMinutes: number;
}

// ==================== EMAIL TEMPLATES ====================

const getMissedMedicationEmailHTML = (info: MissedMedicationInfo, reminderType: string): string => {
  const colors = {
    first: {
      primary: '#3b82f6',
      bg: '#eff6ff',
      border: '#93c5fd',
      text: '#1e40af'
    },
    second: {
      primary: '#f59e0b',
      bg: '#fffbeb',
      border: '#fcd34d',
      text: '#92400e'
    },
    end_of_day: {
      primary: '#ef4444',
      bg: '#fef2f2',
      border: '#fca5a5',
      text: '#991b1b'
    }
  };

  const color = colors[reminderType as keyof typeof colors] || colors.first;

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
          line-height: 1.6;
          color: #1f2937;
          background: #f3f4f6;
        }
        .container {
          max-width: 600px;
          margin: 20px auto;
          background: white;
          border-radius: 16px;
          overflow: hidden;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
        }
        .header {
          background: ${color.primary};
          color: white;
          padding: 32px 24px;
          text-align: center;
        }
        .header h1 {
          font-size: 28px;
          margin-bottom: 8px;
          font-weight: 700;
        }
        .header p {
          font-size: 16px;
          opacity: 0.95;
        }
        .content {
          padding: 32px 24px;
        }
        .alert-box {
          background: ${color.bg};
          border: 2px solid ${color.border};
          border-radius: 12px;
          padding: 24px;
          margin: 24px 0;
        }
        .medication-details {
          background: white;
          border-radius: 8px;
          padding: 20px;
          margin: 20px 0;
          box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        }
        .detail-row {
          display: flex;
          justify-content: space-between;
          padding: 12px 0;
          border-bottom: 1px solid #e5e7eb;
        }
        .detail-row:last-child {
          border-bottom: none;
        }
        .label {
          font-weight: 600;
          color: #4b5563;
        }
        .value {
          color: #1f2937;
          font-weight: 500;
        }
        .button {
          display: inline-block;
          background: ${color.primary};
          color: white;
          text-decoration: none;
          padding: 14px 28px;
          border-radius: 8px;
          font-weight: 600;
          font-size: 16px;
          margin: 20px 0;
          text-align: center;
        }
        .button:hover {
          opacity: 0.9;
        }
        .footer {
          background: #f9fafb;
          padding: 24px;
          text-align: center;
          font-size: 14px;
          color: #6b7280;
          border-top: 1px solid #e5e7eb;
        }
        .urgency-badge {
          display: inline-block;
          background: ${color.primary}20;
          color: ${color.text};
          padding: 6px 12px;
          border-radius: 20px;
          font-size: 14px;
          font-weight: 600;
          margin-bottom: 16px;
        }
        @media (max-width: 600px) {
          .container { margin: 10px; }
          .header { padding: 24px 16px; }
          .content { padding: 24px 16px; }
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>⚠️ Medication Alert</h1>
          <p>Urgent: Medication Missed</p>
        </div>
        
        <div class="content">
          <div class="urgency-badge">
            ${reminderType === 'first' ? '🔔 First Reminder' : 
              reminderType === 'second' ? '⚠️ Second Reminder - Urgent' : 
              '🚨 End of Day Alert - Critical'}
          </div>
          
          <h2 style="font-size: 20px; margin-bottom: 16px;">Dear Caretaker,</h2>
          
          <p style="margin-bottom: 20px;">
            <strong>${info.patientName}</strong> has missed their medication scheduled for 
            <strong>${info.scheduledTime}</strong>. This medication is now 
            <strong>${info.delayMinutes} minutes late</strong>.
          </p>
          
          <div class="alert-box">
            <div style="font-size: 18px; font-weight: 600; margin-bottom: 16px; color: ${color.text};">
              Missed Medication Details
            </div>
            
            <div class="medication-details">
              <div class="detail-row">
                <span class="label">Medication:</span>
                <span class="value">${info.medicationName} ${info.dosage}</span>
              </div>
              <div class="detail-row">
                <span class="label">Scheduled Time:</span>
                <span class="value">${info.scheduledTime}</span>
              </div>
              <div class="detail-row">
                <span class="label">Missed Time:</span>
                <span class="value">${info.missedTime}</span>
              </div>
              <div class="detail-row">
                <span class="label">Delay:</span>
                <span class="value" style="color: ${color.primary}; font-weight: 600;">
                  ${info.delayMinutes} minutes
                </span>
              </div>
            </div>
          </div>
          
          <div style="text-align: center;">
            <a href="${window.location.origin}/dashboard" class="button">
              View Patient Dashboard
            </a>
          </div>
          
          <div style="background: #f3f4f6; border-radius: 8px; padding: 16px; margin-top: 24px;">
            <p style="font-size: 14px; color: #4b5563; margin-bottom: 8px;">
              <strong>📋 What you should do:</strong>
            </p>
            <ul style="font-size: 14px; color: #4b5563; padding-left: 20px;">
              <li>Check on the patient immediately</li>
              <li>Ensure they take the missed medication</li>
              <li>Mark it as taken in the app</li>
              <li>Contact their healthcare provider if concerned</li>
            </ul>
          </div>
        </div>
        
        <div class="footer">
          <p>This is an automated message from MedBuddy Care System.</p>
          <p style="margin-top: 8px;">
            To update notification preferences, visit your 
            <a href="${window.location.origin}/settings" style="color: #3b82f6;">account settings</a>.
          </p>
          <p style="margin-top: 16px; font-size: 12px;">
            © ${new Date().getFullYear()} MedBuddy. All rights reserved.
          </p>
        </div>
      </div>
    </body>
    </html>
  `;
};

const getTestEmailHTML = (): string => `
  <!DOCTYPE html>
  <html>
  <body>
    <h2>✅ Email Test Successful!</h2>
    <p>Your MedBuddy email notifications are working correctly.</p>
    <p>You will now receive alerts when medications are missed.</p>
  </body>
  </html>
`;

// ==================== EMAIL SENDING FUNCTIONS ====================

export const sendEmail = async (data: EmailData): Promise<boolean> => {
  try {
    // Method 1: Using Resend (Recommended)
    if (EMAIL_CONFIG.RESEND_API_KEY) {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${EMAIL_CONFIG.RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: EMAIL_CONFIG.FROM_EMAIL,
          to: data.to,
          subject: data.subject,
          html: data.html,
          text: data.text || data.html.replace(/<[^>]*>/g, ''),
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Resend API error: ${error}`);
      }

      console.log('✅ Email sent successfully via Resend');
      return true;
    }
    
    // Method 2: Using SMTP (Fallback)
    else if (EMAIL_CONFIG.SMTP_HOST) {
      // You would implement SMTP here using nodemailer or similar
      // This is just a placeholder
      console.log('SMTP email would be sent here');
      return true;
    }
    
    // Method 3: Using Supabase Edge Functions (Alternative)
    else {
      console.warn('No email service configured. Email would be:', data);
      return false;
    }
  } catch (error) {
    console.error('Error sending email:', error);
    return false;
  }
};

export const sendMissedMedicationEmail = async (
  caretakerEmail: string,
  info: MissedMedicationInfo,
  reminderType: 'first' | 'second' | 'end_of_day' = 'first'
): Promise<boolean> => {
  const subject = `⚠️ ${info.patientName} missed ${info.medicationName} - ${reminderType === 'first' ? 'First Reminder' : reminderType === 'second' ? 'Urgent Reminder' : 'End of Day Alert'}`;
  
  const html = getMissedMedicationEmailHTML(info, reminderType);
  
  return await sendEmail({
    to: caretakerEmail,
    subject,
    html
  });
};

export const sendTestEmail = async (email: string): Promise<boolean> => {
  return await sendEmail({
    to: email,
    subject: '✅ MedBuddy Test Notification',
    html: getTestEmailHTML()
  });
};