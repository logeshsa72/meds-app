// lib/emailService.ts
import { supabase } from './supabase';

interface EmailConfig {
  to: string;
  subject: string;
  html: string;
}

interface MissedMedicationInfo {
  patientName: string;
  medicationName: string;
  dosage: string;
  scheduledTime: string;
  missedTime: string;
  delayMinutes: number;
}

// Using a free email service like Resend or EmailJS
// For this example, I'll use Resend (resend.com) - it's free for small volumes

const RESEND_API_KEY = import.meta.env.VITE_RESEND_API_KEY;

export const sendMissedMedicationEmail = async (
  caretakerEmail: string,
  info: MissedMedicationInfo,
  reminderType: 'first' | 'second' | 'end_of_day'
): Promise<boolean> => {
  try {
    // Get caretaker name from database
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('caretaker_email', caretakerEmail)
      .single();

    const caretakerName = profile?.full_name || 'Caretaker';
    
    // Prepare email content based on reminder type
    const emailContent = getEmailContent(info, reminderType, caretakerName);
    
    // If using Resend
    if (RESEND_API_KEY) {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${RESEND_API_KEY}`
        },
        body: JSON.stringify({
          from: 'MedBuddy <notifications@medbuddy.app>',
          to: [caretakerEmail],
          subject: emailContent.subject,
          html: emailContent.html
        })
      });

      if (!response.ok) {
        throw new Error('Failed to send email');
      }

      console.log(`✅ ${reminderType} reminder email sent to ${caretakerEmail}`);
      return true;
    } else {
      // Fallback: Log to console for development
      console.log('📧 Email would be sent (API key not configured):', {
        to: caretakerEmail,
        subject: emailContent.subject,
        info
      });
      
      // Store in email_notifications table for tracking
      return true;
    }
  } catch (error) {
    console.error('❌ Error sending email:', error);
    return false;
  }
};

const getEmailContent = (
  info: MissedMedicationInfo,
  type: 'first' | 'second' | 'end_of_day',
  caretakerName: string
): { subject: string; html: string } => {
  
  const baseStyles = `
    <style>
      body { font-family: 'Inter', Arial, sans-serif; line-height: 1.6; color: #333; }
      .container { max-width: 600px; margin: 0 auto; padding: 20px; }
      .header { 
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white; 
        padding: 30px; 
        text-align: center;
        border-radius: 10px 10px 0 0;
      }
      .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
      .medication-details { 
        background: white; 
        padding: 20px; 
        border-radius: 8px; 
        margin: 20px 0;
        border-left: 4px solid #ff6b6b;
      }
      .medication-item { margin: 10px 0; }
      .label { font-weight: bold; color: #666; }
      .value { color: #333; font-size: 1.1em; }
      .button { 
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white; 
        padding: 12px 30px; 
        text-decoration: none; 
        border-radius: 5px;
        display: inline-block;
        margin-top: 20px;
      }
      .footer { 
        text-align: center; 
        margin-top: 30px; 
        color: #999;
        font-size: 0.9em;
      }
      .urgent { color: #ff4444; font-weight: bold; }
    </style>
  `;

  const baseHeader = `
    <div class="header">
      <h1>💊 MedBuddy - Medication Reminder</h1>
    </div>
  `;

  const commonDetails = `
    <div class="medication-details">
      <div class="medication-item"><span class="label">Patient:</span> <span class="value">${info.patientName}</span></div>
      <div class="medication-item"><span class="label">Medication:</span> <span class="value">${info.medicationName} (${info.dosage})</span></div>
      <div class="medication-item"><span class="label">Scheduled Time:</span> <span class="value">${info.scheduledTime}</span></div>
      <div class="medication-item"><span class="label">Current Time:</span> <span class="value">${info.missedTime}</span></div>
      <div class="medication-item"><span class="label">Delay:</span> <span class="value">${info.delayMinutes} minutes</span></div>
    </div>
  `;

  switch (type) {
    case 'first':
      return {
        subject: `⏰ First Reminder: ${info.patientName} missed ${info.medicationName}`,
        html: `
          <!DOCTYPE html>
          <html>
          <head>${baseStyles}</head>
          <body>
            <div class="container">
              ${baseHeader}
              <div class="content">
                <h2>Hello ${caretakerName},</h2>
                <p>We wanted to let you know that <strong>${info.patientName}</strong> hasn't marked their medication as taken yet.</p>
                
                ${commonDetails}
                
                <p style="color: #666; font-style: italic;">
                  This is just a friendly reminder - they still have time to take it. 
                  We'll notify you again if it remains untaken.
                </p>
                
                <a href="${window.location.origin}/caretaker" class="button">View Dashboard</a>
                
                <div class="footer">
                  <p>Stay on top of medications with MedBuddy 💊</p>
                  <p>© ${new Date().getFullYear()} MedBuddy. All rights reserved.</p>
                </div>
              </div>
            </div>
          </body>
          </html>
        `
      };

    case 'second':
      return {
        subject: `⚠️ Urgent: ${info.patientName} still hasn't taken ${info.medicationName}`,
        html: `
          <!DOCTYPE html>
          <html>
          <head>${baseStyles}</head>
          <body>
            <div class="container">
              ${baseHeader}
              <div class="content">
                <h2>Hello ${caretakerName},</h2>
                <p class="urgent">🚨 This is your second reminder - <strong>${info.patientName}</strong> still hasn't taken their medication!</p>
                
                ${commonDetails}
                
                <p style="color: #ff6b6b; font-weight: bold;">
                  It's been 1 hour since the scheduled time. Please check on them.
                </p>
                
                <a href="${window.location.origin}/caretaker" class="button">View Dashboard & Take Action</a>
                
                <div class="footer">
                  <p>Immediate attention may be needed.</p>
                  <p>© ${new Date().getFullYear()} MedBuddy. All rights reserved.</p>
                </div>
              </div>
            </div>
          </body>
          </html>
        `
      };

    case 'end_of_day':
      return {
        subject: `🔴 CRITICAL: ${info.patientName} missed ${info.medicationName} today`,
        html: `
          <!DOCTYPE html>
          <html>
          <head>${baseStyles}</head>
          <body>
            <div class="container">
              ${baseHeader}
              <div class="content">
                <h2>Hello ${caretakerName},</h2>
                <p style="color: #ff4444; font-size: 1.2em; font-weight: bold;">
                  ⚠️ CRITICAL ALERT ⚠️
                </p>
                <p><strong>${info.patientName}</strong> has missed their medication for today.</p>
                
                ${commonDetails}
                
                <p style="background: #ffebee; padding: 15px; border-radius: 5px; color: #c62828;">
                  This medication is now considered missed for today. Please contact them immediately 
                  to ensure their well-being and discuss this missed dose.
                </p>
                
                <a href="${window.location.origin}/caretaker" class="button">View Dashboard & Take Action</a>
                
                <div class="footer">
                  <p>Immediate attention required!</p>
                  <p>© ${new Date().getFullYear()} MedBuddy. All rights reserved.</p>
                </div>
              </div>
            </div>
          </body>
          </html>
        `
      };
  }
};

// Function to manually trigger email check (can be called from an API endpoint or cron job)
export const triggerMissedMedicationCheck = async (): Promise<void> => {
  try {
    // This function is called by a cron job or API endpoint
    console.log('🔄 Triggering missed medication check at:', new Date().toISOString());
    
    // Call the check function from your database.ts
    const { checkAndSendMissedMedicationEmails } = await import('./database');
    await checkAndSendMissedMedicationEmails();
    
    console.log('✅ Missed medication check completed');
  } catch (error) {
    console.error('❌ Error in missed medication check:', error);
  }
};