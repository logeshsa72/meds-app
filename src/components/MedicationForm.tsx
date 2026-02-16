// src/components/MedicationForm.tsx
import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { MedicationFormData } from '../types';

const medicationSchema = z.object({
  name: z.string().min(1, 'Medication name is required'),
  dosage: z.string().min(1, 'Dosage is required'),
  frequency: z.string().min(1, 'Frequency is required'),
  time: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format'),
});

interface MedicationFormProps {
  onSubmit: (data: MedicationFormData) => void;
  isSubmitting?: boolean;
}

const MedicationForm: React.FC<MedicationFormProps> = ({ onSubmit, isSubmitting }) => {
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<MedicationFormData>({
    resolver: zodResolver(medicationSchema),
  });

  const onSubmitHandler = (data: MedicationFormData) => {
    onSubmit(data);
    reset();
  };

  return (
    <form onSubmit={handleSubmit(onSubmitHandler)} className="space-y-4">
      <div>
        <label htmlFor="name" className="block text-sm font-medium mb-1">
          Medication Name
        </label>
        <Input
          id="name"
          {...register('name')}
          placeholder="e.g., Amoxicillin"
        />
        {errors.name && (
          <p className="text-sm text-red-500 mt-1">{errors.name.message}</p>
        )}
      </div>

      <div>
        <label htmlFor="dosage" className="block text-sm font-medium mb-1">
          Dosage
        </label>
        <Input
          id="dosage"
          {...register('dosage')}
          placeholder="e.g., 500mg"
        />
        {errors.dosage && (
          <p className="text-sm text-red-500 mt-1">{errors.dosage.message}</p>
        )}
      </div>

      <div>
        <label htmlFor="frequency" className="block text-sm font-medium mb-1">
          Frequency
        </label>
        <Input
          id="frequency"
          {...register('frequency')}
          placeholder="e.g., 8 hours"
        />
        {errors.frequency && (
          <p className="text-sm text-red-500 mt-1">{errors.frequency.message}</p>
        )}
      </div>

      <div>
        <label htmlFor="time" className="block text-sm font-medium mb-1">
          Time
        </label>
        <Input
          id="time"
          type="time"
          {...register('time')}
        />
        {errors.time && (
          <p className="text-sm text-red-500 mt-1">{errors.time.message}</p>
        )}
      </div>

      <Button type="submit" disabled={isSubmitting} className="w-full">
        {isSubmitting ? 'Adding...' : 'Add Medication'}
      </Button>
    </form>
  );
};

export default MedicationForm;