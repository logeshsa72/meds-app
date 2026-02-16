// src/pages/Dashboard.tsx
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useMedications } from '../hooks/useMedications';
import { Button } from '../components/ui/button';
import MedicationCard from '../components/MedicationCard';
import { Plus, LogOut, Pill } from 'lucide-react';

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { medications, isLoading, markAsTaken, deleteMedication, isMarking, isDeleting } = useMedications();

  const handleSignOut = async () => {
    try {
      await signOut();
      navigate('/login');
    } catch (error) {
      console.error('Failed to sign out:', error);
    }
  };

  const todayMeds = medications.filter(med => !med.takenToday);
  const takenMeds = medications.filter(med => med.takenToday);

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
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-2">
              <Pill className="h-6 w-6 text-blue-600" />
              <h1 className="text-xl font-semibold">MedsBuddy</h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">{user?.email}</span>
              <Button variant="ghost" size="sm" onClick={handleSignOut}>
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Today's Medications</h2>
            <p className="text-gray-600">
              {todayMeds.length} medication{todayMeds.length !== 1 ? 's' : ''} pending
            </p>
          </div>
          <Button onClick={() => navigate('/add-medication')}>
            <Plus className="h-4 w-4 mr-2" />
            Add Medication
          </Button>
        </div>

        {medications.length === 0 ? (
          <div className="text-center py-12">
            <Pill className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No medications added yet</h3>
            <p className="text-gray-600 mb-4">Add your first medication to get started</p>
            <Button onClick={() => navigate('/add-medication')}>
              <Plus className="h-4 w-4 mr-2" />
              Add Medication
            </Button>
          </div>
        ) : (
          <div className="space-y-8">
            {todayMeds.length > 0 && (
              <div>
                <h3 className="text-lg font-medium mb-4">Pending</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {todayMeds.map((medication) => (
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
              </div>
            )}

            {takenMeds.length > 0 && (
              <div>
                <h3 className="text-lg font-medium mb-4">Completed</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {takenMeds.map((medication) => (
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
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
};

export default Dashboard;