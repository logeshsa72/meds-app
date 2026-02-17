import React, { useState } from 'react';
import { 
  Pill, 
  Clock, 
  CheckCircle, 
  AlertCircle,
  Calendar,
  Bell,
  User,
  LogOut,
  Menu,
  Heart,
  Activity,
  Thermometer,
  Droplets,
  ChevronRight
} from 'lucide-react';

const PatientDashboard: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

  const medications = [
    { id: 1, name: 'Lisinopril', dosage: '10mg', time: '08:00', taken: true, type: 'Blood Pressure' },
    { id: 2, name: 'Metformin', dosage: '500mg', time: '12:30', taken: false, type: 'Diabetes' },
    { id: 3, name: 'Atorvastatin', dosage: '20mg', time: '20:00', taken: false, type: 'Cholesterol' },
    { id: 4, name: 'Aspirin', dosage: '81mg', time: '08:00', taken: true, type: 'Blood Thinner' },
  ];

  const vitals = [
    { label: 'Heart Rate', value: '72', unit: 'bpm', icon: Heart, change: -2 },
    { label: 'Blood Pressure', value: '120/80', unit: 'mmHg', icon: Activity, change: 0 },
    { label: 'Temperature', value: '98.6', unit: '°F', icon: Thermometer, change: 0.3 },
    { label: 'Blood Sugar', value: '110', unit: 'mg/dL', icon: Droplets, change: 5 },
  ];

  const pendingMeds = medications.filter(med => !med.taken);

  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour % 12 || 12;
    return `${hour12}:${minutes} ${ampm}`;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-gray-600 bg-opacity-75 z-20 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed top-0 left-0 z-30 h-full w-64 bg-white shadow-lg transform transition-transform duration-300 ease-in-out
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0
      `}>
        <div className="flex flex-col h-full">
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <Pill className="w-4 h-4 text-white" />
              </div>
              <span className="text-lg font-semibold text-gray-900">MedBuddy</span>
            </div>
          </div>

          <nav className="flex-1 p-4">
            <div className="space-y-1">
              <a href="#" className="flex items-center px-3 py-2 text-sm font-medium text-gray-900 bg-gray-100 rounded-lg">
                <Pill className="w-5 h-5 mr-3 text-gray-500" />
                Medications
              </a>
              <a href="#" className="flex items-center px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 rounded-lg">
                <Calendar className="w-5 h-5 mr-3 text-gray-400" />
                Schedule
              </a>
              <a href="#" className="flex items-center px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 rounded-lg">
                <Bell className="w-5 h-5 mr-3 text-gray-400" />
                Reminders
              </a>
            </div>
          </nav>

          <div className="p-4 border-t border-gray-200">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
                  <User className="w-4 h-4 text-gray-500" />
                </div>
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-700">John Doe</p>
                <p className="text-xs text-gray-500">john@example.com</p>
              </div>
            </div>
            <button className="mt-3 w-full flex items-center px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 rounded-lg">
              <LogOut className="w-4 h-4 mr-2" />
              Sign out
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="lg:pl-64">
        {/* Header */}
        <header className="bg-white shadow-sm sticky top-0 z-10">
          <div className="flex items-center justify-between px-4 py-3">
            <button 
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100"
            >
              <Menu className="w-6 h-6" />
            </button>
            <h1 className="text-lg font-semibold text-gray-900">Dashboard</h1>
            <div className="flex items-center space-x-3">
              <button className="p-2 rounded-full text-gray-400 hover:text-gray-500 hover:bg-gray-100 relative">
                <Bell className="w-5 h-5" />
                <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
              </button>
              <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
                <User className="w-4 h-4 text-gray-500" />
              </div>
            </div>
          </div>
        </header>

        {/* Dashboard Content */}
        <div className="p-6">
          {/* Welcome Section */}
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Good morning, John</h2>
            <p className="text-sm text-gray-500">Here's your health overview for today</p>
          </div>

          {/* Vitals Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {vitals.map((vital, index) => (
              <div key={index} className="bg-white rounded-lg shadow-sm p-4">
                <div className="flex items-center justify-between mb-2">
                  <vital.icon className="w-5 h-5 text-gray-400" />
                  <span className={`text-xs font-medium ${
                    vital.change > 0 ? 'text-green-600' : vital.change < 0 ? 'text-red-600' : 'text-gray-500'
                  }`}>
                    {vital.change > 0 ? '+' : ''}{vital.change}%
                  </span>
                </div>
                <p className="text-2xl font-semibold text-gray-900">
                  {vital.value} <span className="text-sm font-normal text-gray-500">{vital.unit}</span>
                </p>
                <p className="text-sm text-gray-500">{vital.label}</p>
              </div>
            ))}
          </div>

          {/* Medications Section */}
          <div className="bg-white rounded-lg shadow-sm">
            <div className="px-4 py-3 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium text-gray-900">Today's Medications</h3>
                <div className="flex items-center space-x-2">
                  <Calendar className="w-4 h-4 text-gray-400" />
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="text-sm border-0 focus:ring-0 p-0"
                  />
                </div>
              </div>
            </div>

            {pendingMeds.length > 0 && (
              <div className="bg-yellow-50 px-4 py-3 border-b border-yellow-100">
                <div className="flex items-center">
                  <AlertCircle className="w-5 h-5 text-yellow-400 mr-2" />
                  <p className="text-sm text-yellow-700">
                    You have {pendingMeds.length} medication{pendingMeds.length > 1 ? 's' : ''} pending
                  </p>
                </div>
              </div>
            )}

            <div className="divide-y divide-gray-200">
              {medications.map((medication) => (
                <div key={medication.id} className="px-4 py-3 flex items-center justify-between hover:bg-gray-50">
                  <div className="flex items-center space-x-3">
                    <div className={`w-2 h-2 rounded-full ${
                      medication.taken ? 'bg-green-500' : 'bg-yellow-500'
                    }`} />
                    <div>
                      <p className="text-sm font-medium text-gray-900">{medication.name}</p>
                      <p className="text-xs text-gray-500">{medication.dosage} • {medication.type}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-4">
                    <span className="text-sm text-gray-500">{formatTime(medication.time)}</span>
                    {medication.taken ? (
                      <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-green-100 text-green-800">
                        <CheckCircle className="w-3 h-3 mr-1" />
                        Taken
                      </span>
                    ) : (
                      <button className="inline-flex items-center px-3 py-1 border border-transparent text-xs font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700">
                        Mark taken
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="px-4 py-3 bg-gray-50 border-t border-gray-200">
              <a href="#" className="text-sm font-medium text-blue-600 hover:text-blue-500 flex items-center">
                View full schedule
                <ChevronRight className="w-4 h-4 ml-1" />
              </a>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default PatientDashboard;