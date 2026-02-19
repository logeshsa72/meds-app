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
};

export const stopNotificationScheduler = () => {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
    console.log('🛑 Notification scheduler stopped');
  }
};

// Run immediately on start
export const runInitialCheck = async () => {
  console.log('🚀 Running initial missed medication check...');
  await checkAndSendMissedMedicationEmails();
};