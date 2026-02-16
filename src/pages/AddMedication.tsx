// src/pages/AddMedication.tsx
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useMedications } from '../hooks/useMedications';
import { useToast } from '../hooks/useToast';
import { Button } from '../components/ui/button';
import MedicationForm from '../components/MedicationForm';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { ArrowLeft } from 'lucide-react';

const AddMedication: React.FC = () => {
  const navigate = useNavigate();
  const { addMedication, isAdding } = useMedications();
  const { toast } = useToast();

  const handleSubmit = async (data: any) => {
    try {
      await addMedication(data);
      toast({
        title: 'Success',
        description: 'Medication added successfully',
      });
      navigate('/');
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to add medication',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <Button
          variant="ghost"
          onClick={() => navigate('/')}
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Dashboard
        </Button>

        <Card>
          <CardHeader>
            <CardTitle>Add New Medication</CardTitle>
          </CardHeader>
          <CardContent>
            <MedicationForm
              onSubmit={handleSubmit}
              isSubmitting={isAdding}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AddMedication;