// lib/database.ts
import { supabase } from './supabase';
import type { Medication, Profile, MedicationTracking, Alert } from '../types';
import { sendMissedMedicationEmail } from './emailService'; // Make sure this import exists

// ==================== TYPES ====================

interface MissedMedicationInfo {
  patientName: string;
  medicationName: string;
  dosage: string;
  scheduledTime: string;
  missedTime: string;
  delayMinutes: number;
}

interface EmailNotification {
  id: string;
  user_id: string;
  medication_id: string;
  scheduled_time: string;
  tracking_date: string;
  reminder_type: 'first' | 'second' | 'end_of_day';
  email_sent: boolean;
  sent_at: string | null;
  error_message: string | null;
  created_at: string;
}

// ==================== AUTH FUNCTIONS ====================

export const signUp = async (email: string, password: string, fullName: string) => {
  try {
    // Sign up with Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
    });

    if (authError) throw authError;
    if (!authData.user) throw new Error('No user returned from sign up');

    // Create profile in database
    const { error: profileError } = await supabase.from('profiles').insert({
      id: authData.user.id,
      email,
      full_name: fullName,
      role: 'both', // Default to both for simplicity
    });

    if (profileError) throw profileError;

    return { success: true, user: authData.user };
  } catch (error) {
    console.error('Sign up error:', error);
    return { success: false, error };
  }
};

export const signIn = async (email: string, password: string) => {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) throw error;
    return { success: true, user: data.user };
  } catch (error) {
    console.error('Sign in error:', error);
    return { success: false, error };
  }
};

export const signOut = async () => {
  const { error } = await supabase.auth.signOut();
  if (error) console.error('Sign out error:', error);
};

export const getCurrentUser = async () => {
  const { data: { user } } = await supabase.auth.getUser();
  return user;
};

// ==================== PROFILE FUNCTIONS ====================

export const getUserProfile = async (userId: string): Promise<Profile | null> => {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (error) {
    console.error('Error fetching profile:', error);
    return null;
  }

  return data;
};

export const updateUserProfile = async (userId: string, updates: Partial<Profile>) => {
  try {
    const { error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', userId);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error updating profile:', error);
    return false;
  }
};

// ==================== MEDICATION FUNCTIONS ====================

export const addMedication = async (medication: Omit<Medication, 'id' | 'created_at'>) => {
  try {
    const { data, error } = await supabase
      .from('medications')
      .insert([medication])
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error adding medication:', error);
    throw error;
  }
};

export const getMedications = async (userId: string): Promise<Medication[]> => {
  const { data, error } = await supabase
    .from('medications')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching medications:', error);
    return [];
  }

  return data || [];
};

export const updateMedication = async (id: string, updates: Partial<Medication>) => {
  try {
    const { error } = await supabase
      .from('medications')
      .update(updates)
      .eq('id', id);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error updating medication:', error);
    return false;
  }
};

export const deleteMedication = async (id: string) => {
  try {
    const { error } = await supabase
      .from('medications')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error deleting medication:', error);
    return false;
  }
};

// ==================== TRACKING FUNCTIONS ====================

export const markMedicationAsTaken = async (
  medicationId: string,
  userId: string,
  scheduledTime: string,
  date: string
) => {
  try {
    // Check if tracking record exists
    const { data: existing } = await supabase
      .from('medication_tracking')
      .select('*')
      .eq('medication_id', medicationId)
      .eq('tracking_date', date)
      .eq('scheduled_time', scheduledTime)
      .maybeSingle();

    if (existing) {
      // Update existing record
      const { error } = await supabase
        .from('medication_tracking')
        .update({ 
          taken: true, 
          taken_at: new Date().toISOString() 
        })
        .eq('id', existing.id);

      if (error) throw error;
    } else {
      // Create new record
      const { error } = await supabase
        .from('medication_tracking')
        .insert([{
          medication_id: medicationId,
          user_id: userId,
          taken: true,
          taken_at: new Date().toISOString(),
          scheduled_time: scheduledTime,
          tracking_date: date
        }]);

      if (error) throw error;
    }

    return true;
  } catch (error) {
    console.error('Error marking medication as taken:', error);
    return false;
  }
};

export const getTodaysTracking = async (userId: string, date: string) => {
  const { data, error } = await supabase
    .from('medication_tracking')
    .select(`
      *,
      medications:medication_id (
        name,
        dosage,
        time
      )
    `)
    .eq('user_id', userId)
    .eq('tracking_date', date);

  if (error) {
    console.error('Error fetching tracking:', error);
    return [];
  }

  return data || [];
};

export const getMedicationsWithTodayStatus = async (userId: string, date: string) => {
  // Get all medications
  const medications = await getMedications(userId);
  
  // Get today's tracking
  const tracking = await getTodaysTracking(userId, date);

  // Combine medications with tracking status
  return medications.map(med => {
    const times = med.time.split(',').map(t => t.trim());
    const takenTimes = tracking
      .filter(t => t.medication_id === med.id && t.taken)
      .map(t => t.scheduled_time);

    return {
      ...med,
      taken: takenTimes.length > 0,
      takenTimes
    };
  });
};

export const getTrackingHistory = async (userId: string, days: number = 7) => {
  const endDate = new Date().toISOString().split('T')[0];
  const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  const { data, error } = await supabase
    .from('medication_tracking')
    .select(`
      *,
      medications:medication_id (
        name,
        dosage
      )
    `)
    .eq('user_id', userId)
    .gte('tracking_date', startDate)
    .lte('tracking_date', endDate)
    .order('tracking_date', { ascending: false });

  if (error) {
    console.error('Error fetching tracking history:', error);
    return [];
  }

  return data || [];
};

// ==================== ALERT FUNCTIONS ====================

export const createAlert = async (userId: string, message: string, severity: 'low' | 'medium' | 'high' = 'medium') => {
  try {
    const { error } = await supabase
      .from('alerts')
      .insert([{
        user_id: userId,
        message,
        severity,
        read: false
      }]);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error creating alert:', error);
    return false;
  }
};

export const getAlerts = async (userId: string): Promise<Alert[]> => {
  const { data, error } = await supabase
    .from('alerts')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(20);

  if (error) {
    console.error('Error fetching alerts:', error);
    return [];
  }

  return data || [];
};

export const markAlertAsRead = async (alertId: string) => {
  try {
    const { error } = await supabase
      .from('alerts')
      .update({ read: true })
      .eq('id', alertId);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error marking alert as read:', error);
    return false;
  }
};

export const markAllAlertsAsRead = async (userId: string) => {
  try {
    const { error } = await supabase
      .from('alerts')
      .update({ read: true })
      .eq('user_id', userId)
      .eq('read', false);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error marking all alerts as read:', error);
    return false;
  }
};

// ==================== EMAIL NOTIFICATION FUNCTIONS ====================

export const checkAndSendMissedMedicationEmails = async (): Promise<void> => {
  try {
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const currentTimeInMinutes = currentHour * 60 + currentMinute;

    console.log(`🔍 Checking for missed medications at ${now.toLocaleString()}`);

    // Get all medications that haven't been taken today
    const { data: medications, error: medError } = await supabase
      .from('medications')
      .select(`
        id,
        name,
        dosage,
        time,
        user_id,
        profiles!inner (
          full_name,
          caretaker_email,
          email_notifications
        )
      `)
      .eq('profiles.email_notifications', true)
      .not('profiles.caretaker_email', 'is', null);

    if (medError) throw medError;

    for (const med of medications || []) {
      const times = med.time.split(',').map((t: string) => t.trim());
      
      for (const scheduledTime of times) {
        const [hours, minutes] = scheduledTime.split(':').map(Number);
        const scheduledTimeInMinutes = hours * 60 + minutes;
        
        // Calculate how late it is
        const minutesLate = currentTimeInMinutes - scheduledTimeInMinutes;
        
        // Only check if the scheduled time has passed
        if (minutesLate <= 0) continue;

        // Check if medication was taken at this time
        const { data: tracking } = await supabase
          .from('medication_tracking')
          .select('*')
          .eq('medication_id', med.id)
          .eq('tracking_date', today)
          .eq('scheduled_time', scheduledTime)
          .maybeSingle();

        // If already taken, skip
        if (tracking?.taken) continue;

        // Check if we've already sent an email for this
        const { data: existingEmail } = await supabase
          .from('email_notifications')
          .select('*')
          .eq('medication_id', med.id)
          .eq('tracking_date', today)
          .eq('scheduled_time', scheduledTime)
          .maybeSingle();

        const info: MissedMedicationInfo = {
          patientName: med.profiles.full_name,
          medicationName: med.name,
          dosage: med.dosage,
          scheduledTime: formatTime(scheduledTime),
          missedTime: now.toLocaleTimeString(),
          delayMinutes: minutesLate
        };

        // First reminder: 30 minutes late
        if (minutesLate >= 30 && minutesLate < 60 && !existingEmail) {
          console.log(`📧 Sending first reminder for ${med.name} (${minutesLate} mins late)`);
          
          const sent = await sendMissedMedicationEmail(
            med.profiles.caretaker_email,
            info,
            'first'
          );

          await supabase.from('email_notifications').insert({
            user_id: med.user_id,
            medication_id: med.id,
            scheduled_time: scheduledTime,
            tracking_date: today,
            reminder_type: 'first',
            email_sent: sent,
            sent_at: sent ? new Date().toISOString() : null,
            error_message: sent ? null : 'Failed to send email'
          });

          // Also create an alert in the app
          await createAlert(
            med.user_id,
            `⚠️ First reminder: ${med.name} at ${formatTime(scheduledTime)} is 30 minutes late`,
            'medium'
          );
        }

        // Second reminder: 1 hour late
        else if (minutesLate >= 60 && minutesLate < 120 && 
                 existingEmail?.reminder_type === 'first') {
          console.log(`📧 Sending second reminder for ${med.name} (${minutesLate} mins late)`);
          
          const sent = await sendMissedMedicationEmail(
            med.profiles.caretaker_email,
            info,
            'second'
          );

          await supabase.from('email_notifications').insert({
            user_id: med.user_id,
            medication_id: med.id,
            scheduled_time: scheduledTime,
            tracking_date: today,
            reminder_type: 'second',
            email_sent: sent,
            sent_at: sent ? new Date().toISOString() : null
          });

          await createAlert(
            med.user_id,
            `🚨 Urgent: ${med.name} at ${formatTime(scheduledTime)} is 1 hour late!`,
            'high'
          );
        }

        // Critical: 2+ hours late
        else if (minutesLate >= 120 && 
                 existingEmail?.reminder_type === 'second') {
          console.log(`📧 Sending critical alert for ${med.name} (${minutesLate} mins late)`);
          
          const sent = await sendMissedMedicationEmail(
            med.profiles.caretaker_email,
            info,
            'end_of_day'
          );

          await supabase.from('email_notifications').insert({
            user_id: med.user_id,
            medication_id: med.id,
            scheduled_time: scheduledTime,
            tracking_date: today,
            reminder_type: 'end_of_day',
            email_sent: sent,
            sent_at: sent ? new Date().toISOString() : null
          });

          await createAlert(
            med.user_id,
            `🚨 CRITICAL: ${med.name} at ${formatTime(scheduledTime)} is over 2 hours late!`,
            'high'
          );
        }
      }
    }
  } catch (error) {
    console.error('Error checking missed medications:', error);
  }
};

// ==================== MISSED MEDICATION CHECK FUNCTION ====================

export const checkMissedMedications = async (userId: string) => {
  const today = new Date().toISOString().split('T')[0];
  const medications = await getMedications(userId);
  const tracking = await getTodaysTracking(userId, today);
  
  const now = new Date();
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();
  const currentTimeInMinutes = currentHour * 60 + currentMinute;

  const missedMedications: string[] = [];

  for (const med of medications) {
    const times = med.time.split(',').map(t => t.trim());
    
    for (const time of times) {
      const [hours, minutes] = time.split(':').map(Number);
      const scheduledTimeInMinutes = hours * 60 + minutes;
      
      // Check if this time has passed (with 30 min grace period)
      if (currentTimeInMinutes > scheduledTimeInMinutes + 30) {
        // Check if medication was taken at this time
        const taken = tracking.some(
          t => t.medication_id === med.id && 
               t.scheduled_time === time && 
               t.taken
        );
        
        if (!taken) {
          missedMedications.push(`${med.name} at ${formatTime(time)}`);
        }
      }
    }
  }

  if (missedMedications.length > 0) {
    await createAlert(
      userId,
      `Missed medications: ${missedMedications.join(', ')}`,
      'high'
    );
    
    // Also trigger email check for all users
    await checkAndSendMissedMedicationEmails();
  }

  return missedMedications;
};

// ==================== UTILITY FUNCTIONS ====================

export const formatTime = (timeString: string): string => {
  if (!timeString) return '';
  
  // Handle multiple times
  const times = timeString.split(',').map(t => t.trim());
  if (times.length === 1) {
    // Single time - format nicely
    const [hours, minutes] = times[0].split(':');
    const hour = parseInt(hours, 10);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour % 12 || 12;
    return `${hour12}:${minutes} ${ampm}`;
  } else {
    // Multiple times
    return times.map(t => {
      const [hours, minutes] = t.split(':');
      const hour = parseInt(hours, 10);
      const ampm = hour >= 12 ? 'PM' : 'AM';
      const hour12 = hour % 12 || 12;
      return `${hour12}:${minutes} ${ampm}`;
    }).join(', ');
  }
};

export const calculateAdherenceRate = (trackingHistory: any[], medications: Medication[]) => {
  if (!trackingHistory.length || !medications.length) return 0;

  const totalDoses = medications.reduce((total, med) => {
    const times = med.time.split(',').length;
    return total + times;
  }, 0) * 7; // Assuming 7 days of history

  const takenDoses = trackingHistory.filter(t => t.taken).length;

  return Math.round((takenDoses / totalDoses) * 100);
};

// ==================== STATISTICS FUNCTIONS ====================

export const getMedicationStats = async (userId: string) => {
  const medications = await getMedications(userId);
  const trackingHistory = await getTrackingHistory(userId, 7);
  
  const totalMedications = medications.length;
  const totalDosesToday = medications.reduce((total, med) => {
    const times = med.time.split(',').length;
    return total + times;
  }, 0);

  const today = new Date().toISOString().split('T')[0];
  const takenToday = trackingHistory.filter(
    t => t.tracking_date === today && t.taken
  ).length;

  const adherenceRate = calculateAdherenceRate(trackingHistory, medications);

  return {
    totalMedications,
    totalDosesToday,
    takenToday,
    adherenceRate,
    missedToday: totalDosesToday - takenToday
  };
};