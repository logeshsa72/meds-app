// lib/notificationScheduler.ts
import { checkAndSendMissedMedicationEmails } from './database';

let intervalId: NodeJS.Timeout | null = null;

export const startNotificationScheduler = () => {
  if (intervalId) {
    clearInterval(intervalId);
  }

  // Check every 5 minutes
  intervalId = setInterval(async () => {
    console.log('🕒 Running missed medication check...');
    await checkAndSendMissedMedicationEmails();
  }, 5 * 60 * 1000); // 5 minutes

  console.log('✅ Notification scheduler started');
  
  // Run immediately
  setTimeout(async () => {
    console.log('🚀 Running initial check...');
    await checkAndSendMissedMedicationEmails();
  }, 5000);
};

export const stopNotificationScheduler = () => {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
    console.log('🛑 Notification scheduler stopped');
  }
};