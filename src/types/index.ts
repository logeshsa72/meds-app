// src/types/index.ts
export interface Medication {
  id: string;
  name: string;
  dosage: string;
  frequency: string;
  time: string;
  takenToday: boolean;
  lastTaken?: string;
  created_at: string;
  user_id: string;
}

export interface User {
  id: string;
  email: string;
}

export interface MedicationFormData {
  name: string;
  dosage: string;
  frequency: string;
  time: string;
}