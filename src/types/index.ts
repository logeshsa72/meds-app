// types/index.ts
export interface Profile {
  id: string;
  email: string;
  full_name: string;
  role: 'patient' | 'caretaker' | 'both';
  created_at: string;
}

export interface Medication {
  id: string;
  user_id: string;
  name: string;
  dosage: string;
  frequency: string;
  time: string;
  type: string;
  notes?: string | null;  // Make optional
  refill_date?: string | null;  // Make optional
  created_at: string;
}

export interface MedicationWithTracking extends Medication {
  taken: boolean;
  takenTimes: string[];
}

export interface MedicationTracking {
  id: string;
  medication_id: string;
  user_id: string;
  taken: boolean;
  taken_at: string | null;
  scheduled_time: string;
  tracking_date: string;
  created_at: string;
  medications?: {
    name: string;
    dosage: string;
    time: string;
  };
}

export interface Alert {
  id: string;
  user_id: string;
  message: string;
  severity: 'low' | 'medium' | 'high';
  read: boolean;
  created_at: string;
}