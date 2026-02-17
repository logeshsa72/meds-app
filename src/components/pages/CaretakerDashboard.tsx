import React, { useState, useEffect } from 'react';
import { 
  Pill, 
  Clock, 
  AlertTriangle,
  Users,
  Plus,
  Edit2,
  Trash2,
  Bell,
  User,
  LogOut,
  Menu,
  CheckCircle,
  XCircle,
  X,
  Search,
  Filter,
  ChevronDown,
  Calendar,
  RefreshCw
} from 'lucide-react';

interface Medication {
  id: number;
  name: string;
  dosage: string;
  frequency: string;
  time: string;
  status: 'taken' | 'pending' | 'missed';
  refillDate: string;
  type: string;
  notes?: string;
}

interface Alert {
  id: number;
  message: string;
  time: string;
  severity: 'high' | 'medium' | 'low';
  read: boolean;
}

interface Patient {
  name: string;
  age: number;
  relationship: string;
  lastActive: string;
  adherence: number;
  avatar?: string;
}

const CaretakerDashboard: React.FC = () => {
  // State management
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showAddMedication, setShowAddMedication] = useState(false);
  const [showEditMedication, setShowEditMedication] = useState(false);
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [selectedMedication, setSelectedMedication] = useState<Medication | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [medications, setMedications] = useState<Medication[]>([
    { 
      id: 1, 
      name: 'Lisinopril', 
      dosage: '10mg', 
      frequency: 'Daily',
      time: '08:00',
      status: 'taken',
      refillDate: '2024-03-15',
      type: 'Blood Pressure',
      notes: 'Take with food'
    },
    { 
      id: 2, 
      name: 'Metformin', 
      dosage: '500mg', 
      frequency: 'Twice daily',
      time: '12:30, 20:00',
      status: 'pending',
      refillDate: '2024-03-10',
      type: 'Diabetes',
      notes: 'Take after meals'
    },
    { 
      id: 3, 
      name: 'Atorvastatin', 
      dosage: '20mg', 
      frequency: 'Daily',
      time: '20:00',
      status: 'missed',
      refillDate: '2024-03-20',
      type: 'Cholesterol',
      notes: 'Take at bedtime'
    },
  ]);

  const [alerts, setAlerts] = useState<Alert[]>([
    { id: 1, message: 'Missed medication: Atorvastatin', time: '2 hours ago', severity: 'high', read: false },
    { id: 2, message: 'Low refill: Metformin', time: '1 day ago', severity: 'medium', read: false },
  ]);

  const [patient] = useState<Patient>({
    name: 'John Doe',
    age: 65,
    relationship: 'Father',
    lastActive: '2 minutes ago',
    adherence: 85
  });

  const [newMedication, setNewMedication] = useState<Partial<Medication>>({
    name: '',
    dosage: '',
    frequency: 'Daily',
    time: '',
    type: 'Blood Pressure',
    notes: '',
    refillDate: ''
  });

  const [editMedication, setEditMedication] = useState<Partial<Medication>>({});

  // Filter medications based on search and status
  const filteredMedications = medications.filter(med => {
    const matchesSearch = med.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         med.type.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterStatus === 'all' || med.status === filterStatus;
    return matchesSearch && matchesFilter;
  });

  // Get unread alerts count
  const unreadAlertsCount = alerts.filter(alert => !alert.read).length;

  // Handle adding new medication
  const handleAddMedication = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate required fields
    if (!newMedication.name || !newMedication.dosage || !newMedication.time) {
      alert('Please fill in all required fields');
      return;
    }

    // Validate time format (basic validation)
    const timePattern = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9](,\s*([0-1]?[0-9]|2[0-3]):[0-5][0-9])*$/;
    if (!timePattern.test(newMedication.time)) {
      alert('Please enter valid time(s) in 24-hour format (e.g., 08:00, 14:30)');
      return;
    }

    const medication: Medication = {
      id: medications.length + 1,
      name: newMedication.name,
      dosage: newMedication.dosage,
      frequency: newMedication.frequency || 'Daily',
      time: newMedication.time,
      status: 'pending',
      refillDate: newMedication.refillDate || new Date().toISOString().split('T')[0],
      type: newMedication.type || 'Other',
      notes: newMedication.notes
    };
    
    setMedications([...medications, medication]);
    setShowAddMedication(false);
    setNewMedication({
      name: '',
      dosage: '',
      frequency: 'Daily',
      time: '',
      type: 'Blood Pressure',
      notes: '',
      refillDate: ''
    });
    
    // Add success alert
    addAlert('Medication added successfully', 'low');
  };

  // Handle editing medication
  const handleEditMedication = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!editMedication.id || !editMedication.name || !editMedication.dosage || !editMedication.time) {
      alert('Please fill in all required fields');
      return;
    }

    setMedications(medications.map(med => 
      med.id === editMedication.id ? { ...med, ...editMedication } : med
    ));
    setShowEditMedication(false);
    setSelectedMedication(null);
    addAlert('Medication updated successfully', 'low');
  };

  // Handle deleting medication
  const handleDeleteMedication = () => {
    if (selectedMedication) {
      setMedications(medications.filter(med => med.id !== selectedMedication.id));
      setShowDeleteConfirmation(false);
      setSelectedMedication(null);
      addAlert('Medication deleted successfully', 'low');
    }
  };

  // Handle marking medication as taken
  const handleMarkAsTaken = (id: number) => {
    setMedications(medications.map(med => 
      med.id === id ? { ...med, status: 'taken' } : med
    ));
    addAlert('Medication marked as taken', 'low');
  };

  // Handle dismissing alert
  const handleDismissAlert = (id: number) => {
    setAlerts(alerts.filter(alert => alert.id !== id));
  };

  // Handle marking alert as read
  const handleMarkAlertRead = (id: number) => {
    setAlerts(alerts.map(alert => 
      alert.id === id ? { ...alert, read: true } : alert
    ));
  };

  // Add new alert
  const addAlert = (message: string, severity: 'high' | 'medium' | 'low') => {
    const newAlert: Alert = {
      id: alerts.length + 1,
      message,
      time: 'Just now',
      severity,
      read: false
    };
    setAlerts([newAlert, ...alerts]);
  };

  // Check for refill alerts
  useEffect(() => {
    const today = new Date();
    medications.forEach(med => {
      const refillDate = new Date(med.refillDate);
      const daysUntilRefill = Math.ceil((refillDate.getTime() - today.getTime()) / (1000 * 3600 * 24));
      
      if (daysUntilRefill <= 3 && daysUntilRefill > 0) {
        const existingAlert = alerts.find(a => 
          a.message.includes(med.name) && a.message.includes('refill')
        );
        if (!existingAlert) {
          addAlert(`Refill needed soon: ${med.name} (${daysUntilRefill} days left)`, 'medium');
        }
      }
    });
  }, [medications]);

  const getStatusConfig = (status: string) => {
    switch(status) {
      case 'taken':
        return { color: 'text-green-700 bg-green-50', icon: CheckCircle };
      case 'pending':
        return { color: 'text-yellow-700 bg-yellow-50', icon: Clock };
      case 'missed':
        return { color: 'text-red-700 bg-red-50', icon: XCircle };
      default:
        return { color: 'text-gray-700 bg-gray-50', icon: Clock };
    }
  };

  const formatTime = (time: string) => {
    return time.split(',').map(t => {
      const [hours, minutes] = t.trim().split(':');
      const hour = parseInt(hours);
      const ampm = hour >= 12 ? 'PM' : 'AM';
      const hour12 = hour % 12 || 12;
      return `${hour12}:${minutes} ${ampm}`;
    }).join(', ');
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
              <div className="w-8 h-8 bg-purple-600 rounded-lg flex items-center justify-center">
                <Users className="w-4 h-4 text-white" />
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
              <a href="#" className="flex items-center px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 rounded-lg relative">
                <AlertTriangle className="w-5 h-5 mr-3 text-gray-400" />
                Alerts
                {unreadAlertsCount > 0 && (
                  <span className="ml-auto bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                    {unreadAlertsCount}
                  </span>
                )}
              </a>
              <a href="#" className="flex items-center px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 rounded-lg">
                <Users className="w-5 h-5 mr-3 text-gray-400" />
                Patients
              </a>
              <a href="#" className="flex items-center px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 rounded-lg">
                <Calendar className="w-5 h-5 mr-3 text-gray-400" />
                Schedule
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
                <p className="text-sm font-medium text-gray-700">Sarah Doe</p>
                <p className="text-xs text-gray-500">sarah@example.com</p>
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
            <h1 className="text-lg font-semibold text-gray-900">Caretaker Dashboard</h1>
            <div className="flex items-center space-x-3">
              <button className="p-2 rounded-full text-gray-400 hover:text-gray-500 hover:bg-gray-100 relative">
                <Bell className="w-5 h-5" />
                {unreadAlertsCount > 0 && (
                  <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
                )}
              </button>
              <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
                <User className="w-4 h-4 text-gray-500" />
              </div>
            </div>
          </div>
        </header>

        {/* Dashboard Content */}
        <div className="p-6">
          {/* Patient Overview */}
          <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">{patient.name}</h2>
                <p className="text-sm text-gray-500">{patient.age} years • {patient.relationship}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-500">Last active</p>
                <p className="text-sm font-medium text-gray-900">{patient.lastActive}</p>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs text-gray-500">Adherence Rate</p>
                <p className="text-lg font-semibold text-gray-900">{patient.adherence}%</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs text-gray-500">Total Medications</p>
                <p className="text-lg font-semibold text-gray-900">{medications.length}</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs text-gray-500">Missed Today</p>
                <p className="text-lg font-semibold text-gray-900">{medications.filter(m => m.status === 'missed').length}</p>
              </div>
            </div>
          </div>

          {/* Alerts Section */}
          {alerts.filter(a => !a.read).length > 0 && (
            <div className="mb-6">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-medium text-gray-900">Recent Alerts</h3>
                <button 
                  onClick={() => setAlerts(alerts.map(a => ({ ...a, read: true })))}
                  className="text-sm text-purple-600 hover:text-purple-700"
                >
                  Mark all as read
                </button>
              </div>
              <div className="space-y-2">
                {alerts.filter(a => !a.read).map((alert) => (
                  <div 
                    key={alert.id} 
                    className={`bg-white rounded-lg shadow-sm p-4 border-l-4 ${
                      alert.severity === 'high' ? 'border-red-500' : 
                      alert.severity === 'medium' ? 'border-yellow-500' : 'border-blue-500'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-3">
                        <AlertTriangle className={`w-5 h-5 flex-shrink-0 mt-0.5 ${
                          alert.severity === 'high' ? 'text-red-500' : 
                          alert.severity === 'medium' ? 'text-yellow-500' : 'text-blue-500'
                        }`} />
                        <div>
                          <p className="text-sm font-medium text-gray-900">{alert.message}</p>
                          <p className="text-xs text-gray-500">{alert.time}</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <button 
                          onClick={() => handleMarkAlertRead(alert.id)}
                          className="text-gray-400 hover:text-gray-500"
                        >
                          <CheckCircle className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => handleDismissAlert(alert.id)}
                          className="text-gray-400 hover:text-gray-500"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Medications Section */}
          <div className="bg-white rounded-lg shadow-sm">
            <div className="px-4 py-3 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium text-gray-900">Medications</h3>
                <button
                  onClick={() => setShowAddMedication(true)}
                  className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md text-white bg-purple-600 hover:bg-purple-700"
                >
                  <Plus className="w-4 h-4 mr-1" />
                  Add medication
                </button>
              </div>
            </div>

            {/* Search and Filter */}
            <div className="px-4 py-3 border-b border-gray-200">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search medications..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-purple-500 focus:border-purple-500"
                  />
                </div>
                <div className="flex items-center space-x-2">
                  <Filter className="w-4 h-4 text-gray-400" />
                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="text-sm border border-gray-300 rounded-md px-2 py-1 focus:outline-none focus:ring-purple-500 focus:border-purple-500"
                  >
                    <option value="all">All Status</option>
                    <option value="taken">Taken</option>
                    <option value="pending">Pending</option>
                    <option value="missed">Missed</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Medication</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Dosage</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Frequency</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Time</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredMedications.length > 0 ? (
                    filteredMedications.map((medication) => {
                      const statusConfig = getStatusConfig(medication.status);
                      const StatusIcon = statusConfig.icon;
                      
                      return (
                        <tr key={medication.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center mr-3">
                                <Pill className="w-4 h-4 text-purple-600" />
                              </div>
                              <div>
                                <p className="text-sm font-medium text-gray-900">{medication.name}</p>
                                <p className="text-xs text-gray-500">{medication.type}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">{medication.dosage}</td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">{medication.frequency}</td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">{formatTime(medication.time)}</td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${statusConfig.color}`}>
                              <StatusIcon className="w-3 h-3 mr-1" />
                              {medication.status.charAt(0).toUpperCase() + medication.status.slice(1)}
                            </span>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                            <div className="flex items-center space-x-2">
                              {medication.status === 'pending' && (
                                <button
                                  onClick={() => handleMarkAsTaken(medication.id)}
                                  className="text-green-600 hover:text-green-700"
                                  title="Mark as taken"
                                >
                                  <CheckCircle className="w-4 h-4" />
                                </button>
                              )}
                              <button
                                onClick={() => {
                                  setEditMedication(medication);
                                  setShowEditMedication(true);
                                }}
                                className="text-gray-400 hover:text-gray-500"
                                title="Edit"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => {
                                  setSelectedMedication(medication);
                                  setShowDeleteConfirmation(true);
                                }}
                                className="text-gray-400 hover:text-red-500"
                                title="Delete"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                        No medications found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </main>

      {/* Add Medication Modal - FIXED VERSION */}
      {showAddMedication && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          {/* Backdrop - separate div to handle clicks */}
          <div 
            className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
            onClick={() => setShowAddMedication(false)}
          />
          
          {/* Modal container - centered */}
          <div className="fixed inset-0 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4 text-center sm:p-0">
              <div 
                className="relative transform overflow-hidden rounded-lg bg-white text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg"
                onClick={(e) => e.stopPropagation()}
              >
                <form onSubmit={handleAddMedication}>
                  <div className="bg-white px-4 pb-4 pt-5 sm:p-6 sm:pb-4">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold text-gray-900">Add New Medication</h3>
                      <button 
                        type="button"
                        onClick={() => setShowAddMedication(false)} 
                        className="rounded-md text-gray-400 hover:text-gray-500 focus:outline-none"
                      >
                        <X className="h-5 w-5" />
                      </button>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Medication Name <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={newMedication.name}
                          onChange={(e) => setNewMedication({...newMedication, name: e.target.value})}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-purple-500 focus:border-purple-500 sm:text-sm"
                          placeholder="e.g., Lisinopril"
                          required
                          autoFocus
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Dosage <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="text"
                            value={newMedication.dosage}
                            onChange={(e) => setNewMedication({...newMedication, dosage: e.target.value})}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-purple-500 focus:border-purple-500 sm:text-sm"
                            placeholder="e.g., 10mg"
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Type
                          </label>
                          <select
                            value={newMedication.type}
                            onChange={(e) => setNewMedication({...newMedication, type: e.target.value})}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-purple-500 focus:border-purple-500 sm:text-sm"
                          >
                            <option>Blood Pressure</option>
                            <option>Diabetes</option>
                            <option>Cholesterol</option>
                            <option>Pain Relief</option>
                            <option>Antibiotic</option>
                            <option>Other</option>
                          </select>
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Frequency
                        </label>
                        <select
                          value={newMedication.frequency}
                          onChange={(e) => setNewMedication({...newMedication, frequency: e.target.value})}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-purple-500 focus:border-purple-500 sm:text-sm"
                        >
                          <option>Daily</option>
                          <option>Twice daily</option>
                          <option>Three times daily</option>
                          <option>Weekly</option>
                          <option>As needed</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Time(s) <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={newMedication.time}
                          onChange={(e) => setNewMedication({...newMedication, time: e.target.value})}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-purple-500 focus:border-purple-500 sm:text-sm"
                          placeholder="e.g., 08:00, 20:00"
                          required
                        />
                        <p className="mt-1 text-xs text-gray-500">Use 24-hour format, separate multiple times with commas</p>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Refill Date
                        </label>
                        <input
                          type="date"
                          value={newMedication.refillDate}
                          onChange={(e) => setNewMedication({...newMedication, refillDate: e.target.value})}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-purple-500 focus:border-purple-500 sm:text-sm"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Notes
                        </label>
                        <textarea
                          value={newMedication.notes}
                          onChange={(e) => setNewMedication({...newMedication, notes: e.target.value})}
                          rows={3}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-purple-500 focus:border-purple-500 sm:text-sm"
                          placeholder="Additional instructions..."
                        />
                      </div>
                    </div>
                  </div>

                  <div className="bg-gray-50 px-4 py-3 sm:flex sm:flex-row-reverse sm:px-6">
                    <button
                      type="submit"
                      className="inline-flex w-full justify-center rounded-md bg-purple-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-purple-700 sm:ml-3 sm:w-auto"
                    >
                      Add Medication
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowAddMedication(false)}
                      className="mt-3 inline-flex w-full justify-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 sm:mt-0 sm:w-auto"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Medication Modal - FIXED VERSION */}
      {showEditMedication && editMedication && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          {/* Backdrop - separate div to handle clicks */}
          <div 
            className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
            onClick={() => setShowEditMedication(false)}
          />
          
          {/* Modal container - centered */}
          <div className="fixed inset-0 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4 text-center sm:p-0">
              <div 
                className="relative transform overflow-hidden rounded-lg bg-white text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg"
                onClick={(e) => e.stopPropagation()}
              >
                <form onSubmit={handleEditMedication}>
                  <div className="bg-white px-4 pb-4 pt-5 sm:p-6 sm:pb-4">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold text-gray-900">Edit Medication</h3>
                      <button 
                        type="button"
                        onClick={() => setShowEditMedication(false)} 
                        className="rounded-md text-gray-400 hover:text-gray-500 focus:outline-none"
                      >
                        <X className="h-5 w-5" />
                      </button>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Medication Name <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={editMedication.name || ''}
                          onChange={(e) => setEditMedication({...editMedication, name: e.target.value})}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-purple-500 focus:border-purple-500 sm:text-sm"
                          required
                          autoFocus
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Dosage <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="text"
                            value={editMedication.dosage || ''}
                            onChange={(e) => setEditMedication({...editMedication, dosage: e.target.value})}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-purple-500 focus:border-purple-500 sm:text-sm"
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Type
                          </label>
                          <select
                            value={editMedication.type || ''}
                            onChange={(e) => setEditMedication({...editMedication, type: e.target.value})}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-purple-500 focus:border-purple-500 sm:text-sm"
                          >
                            <option>Blood Pressure</option>
                            <option>Diabetes</option>
                            <option>Cholesterol</option>
                            <option>Pain Relief</option>
                            <option>Antibiotic</option>
                            <option>Other</option>
                          </select>
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Frequency
                        </label>
                        <select
                          value={editMedication.frequency || ''}
                          onChange={(e) => setEditMedication({...editMedication, frequency: e.target.value})}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-purple-500 focus:border-purple-500 sm:text-sm"
                        >
                          <option>Daily</option>
                          <option>Twice daily</option>
                          <option>Three times daily</option>
                          <option>Weekly</option>
                          <option>As needed</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Time(s) <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={editMedication.time || ''}
                          onChange={(e) => setEditMedication({...editMedication, time: e.target.value})}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-purple-500 focus:border-purple-500 sm:text-sm"
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Status
                        </label>
                        <select
                          value={editMedication.status || 'pending'}
                          onChange={(e) => setEditMedication({...editMedication, status: e.target.value as 'taken' | 'pending' | 'missed'})}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-purple-500 focus:border-purple-500 sm:text-sm"
                        >
                          <option value="pending">Pending</option>
                          <option value="taken">Taken</option>
                          <option value="missed">Missed</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  <div className="bg-gray-50 px-4 py-3 sm:flex sm:flex-row-reverse sm:px-6">
                    <button
                      type="submit"
                      className="inline-flex w-full justify-center rounded-md bg-purple-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-purple-700 sm:ml-3 sm:w-auto"
                    >
                      Save Changes
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowEditMedication(false)}
                      className="mt-3 inline-flex w-full justify-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 sm:mt-0 sm:w-auto"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal - FIXED VERSION */}
      {showDeleteConfirmation && selectedMedication && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          {/* Backdrop - separate div to handle clicks */}
          <div 
            className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
            onClick={() => setShowDeleteConfirmation(false)}
          />
          
          {/* Modal container - centered */}
          <div className="fixed inset-0 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4 text-center sm:p-0">
              <div 
                className="relative transform overflow-hidden rounded-lg bg-white text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="bg-white px-4 pb-4 pt-5 sm:p-6 sm:pb-4">
                  <div className="sm:flex sm:items-start">
                    <div className="mx-auto flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-red-100 sm:mx-0 sm:h-10 sm:w-10">
                      <AlertTriangle className="h-6 w-6 text-red-600" />
                    </div>
                    <div className="mt-3 text-center sm:ml-4 sm:mt-0 sm:text-left">
                      <h3 className="text-base font-semibold leading-6 text-gray-900">
                        Delete Medication
                      </h3>
                      <div className="mt-2">
                        <p className="text-sm text-gray-500">
                          Are you sure you want to delete {selectedMedication.name}? This action cannot be undone.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="bg-gray-50 px-4 py-3 sm:flex sm:flex-row-reverse sm:px-6">
                  <button
                    type="button"
                    onClick={handleDeleteMedication}
                    className="inline-flex w-full justify-center rounded-md bg-red-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-red-700 sm:ml-3 sm:w-auto"
                  >
                    Delete
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowDeleteConfirmation(false)}
                    className="mt-3 inline-flex w-full justify-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 sm:mt-0 sm:w-auto"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CaretakerDashboard;