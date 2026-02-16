// src/pages/Medications.tsx
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useMedications } from '../hooks/useMedications';
import { Button } from '../components/ui/button';
import MedicationCard from '../components/MedicationCard';
import { ArrowLeft, Plus } from 'lucide-react';

const Medications: React.FC = () => {
  const navigate = useNavigate();
  const { medications, isLoading, markAsTaken, deleteMedication, isMarking, isDeleting } = useMedications();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center space-x-4">
            <Button variant="ghost" size="sm" onClick={() => navigate('/')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <h1 className="text-xl font-semibold">All Medications</h1>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-end mb-6">
          <Button onClick={() => navigate('/add-medication')}>
            <Plus className="h-4 w-4 mr-2" />
            Add Medication
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {medications.map((medication) => (
            <MedicationCard
              key={medication.id}
              medication={medication}
              onMarkAsTaken={markAsTaken}
              onDelete={deleteMedication}
              isMarking={isMarking}
              isDeleting={isDeleting}
            />
          ))}
        </div>

        {medications.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-600">No medications found</p>
          </div>
        )}
      </main>
    </div>
  );
};

export default Medications;