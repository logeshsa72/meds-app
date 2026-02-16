// src/hooks/useMedications.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import type { Medication, MedicationFormData } from '../types';
import { useAuth } from './useAuth.ts';

export const useMedications = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: medications = [], isLoading, error } = useQuery({
    queryKey: ['medications', user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      const { data, error } = await supabase
        .from('medications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as Medication[];
    },
    enabled: !!user,
  });

  const addMedication = useMutation({
    mutationFn: async (medicationData: MedicationFormData) => {
      if (!user) throw new Error('No user logged in');

      const { data, error } = await supabase
        .from('medications')
        .insert([
          {
            ...medicationData,
            user_id: user.id,
            takenToday: false,
          },
        ])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['medications'] });
    },
  });

  const markAsTaken = useMutation({
    mutationFn: async (medicationId: string) => {
      const { error } = await supabase
        .from('medications')
        .update({ 
          takenToday: true,
          lastTaken: new Date().toISOString(),
        })
        .eq('id', medicationId);

      if (error) throw error;
      
      // This would trigger the edge function to check if all medications are taken
      await supabase.functions.invoke('check-medications', {
        body: { medicationId },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['medications'] });
    },
  });

  const deleteMedication = useMutation({
    mutationFn: async (medicationId: string) => {
      const { error } = await supabase
        .from('medications')
        .delete()
        .eq('id', medicationId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['medications'] });
    },
  });

  return {
    medications,
    isLoading,
    error,
    addMedication: addMedication.mutateAsync,
    markAsTaken: markAsTaken.mutateAsync,
    deleteMedication: deleteMedication.mutateAsync,
    isAdding: addMedication.isPending,
    isMarking: markAsTaken.isPending,
    isDeleting: deleteMedication.isPending,
  };
};