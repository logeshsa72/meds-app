// components/patient/PatientDashboard.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Pill, 
  Clock, 
  CheckCircle, 
  AlertCircle,
  LogOut,
  Bell,
  User,
  Calendar,
  Heart,
  Activity,
  ChevronRight,
  X,
  Check,
  Loader
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { 
  getMedicationsWithTodayStatus,
  getCurrentUser,
  getUserProfile,
  formatTime,
  markMedicationAsTaken,
  getTodaysTracking,
  createAlert
} from '../../lib/database';
import type { MedicationWithTracking, Profile, MedicationTracking } from '../../types';

// ==================== TYPES ====================

interface TimeSlot {
  time: string;
  taken: boolean;
  takenAt?: string;
}

interface MedicationWithSlots extends MedicationWithTracking {
  timeSlots: TimeSlot[];
  allTaken: boolean;
}

interface DashboardStats {
  total: number;
  taken: number;
  pending: number;
  adherence: number;
}

// ==================== MAIN COMPONENT ====================

const PatientDashboard: React.FC = () => {
  // ==================== STATE ====================
  const [medications, setMedications] = useState<MedicationWithSlots[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [markingId, setMarkingId] = useState<string | null>(null);
  const [markingTime, setMarkingTime] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [showNotifications, setShowNotifications] = useState<boolean>(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [stats, setStats] = useState<DashboardStats>({
    total: 0,
    taken: 0,
    pending: 0,
    adherence: 0
  });
  const [currentTime, setCurrentTime] = useState<Date>(new Date());
  const [refreshInterval, setRefreshInterval] = useState<NodeJS.Timeout | null>(null);

  const navigate = useNavigate();

  // ==================== UTILITY FUNCTIONS ====================

  const showSuccess = (message: string) => {
    setSuccessMessage(message);
    setTimeout(() => setSuccessMessage(null), 3000);
  };

  const showError = (message: string) => {
    setError(message);
    setTimeout(() => setError(null), 3000);
  };

  const calculateStats = useCallback((meds: MedicationWithSlots[]) => {
    const total = meds.length;
    const taken = meds.filter(m => m.allTaken).length;
    const pending = total - taken;
    const adherence = total > 0 ? Math.round((taken / total) * 100) : 0;

    setStats({ total, taken, pending, adherence });
  }, []);

  // ==================== DATA LOADING ====================

  const loadUser = async (): Promise<void> => {
    try {
      const currentUser = await getCurrentUser();
      if (!currentUser) {
        navigate('/login');
        return;
      }
      setUser(currentUser);
      
      const userProfile = await getUserProfile(currentUser.id);
      setProfile(userProfile);
    } catch (error) {
      console.error('Error loading user:', error);
      showError('Failed to load user data');
    }
  };

  const loadMedications = async (): Promise<void> => {
    if (!user) return;
    
    try {
      setLoading(true);
      setError(null);
      
      const today = new Date().toISOString().split('T')[0];
      const data = await getMedicationsWithTodayStatus(user.id, today);
      
      // Get detailed tracking for today
      const tracking = await getTodaysTracking(user.id, today);
      
      // Process medications with time slots
      const processedMeds: MedicationWithSlots[] = data.map(med => {
        const times = med.time.split(',').map(t => t.trim());
        
        const timeSlots: TimeSlot[] = times.map(time => {
          const trackRecord = tracking.find(
            t => t.medication_id === med.id && t.scheduled_time === time
          );
          
          return {
            time,
            taken: trackRecord?.taken || false,
            takenAt: trackRecord?.taken_at
          };
        });
        
        const allTaken = timeSlots.every(slot => slot.taken);
        
        return {
          ...med,
          timeSlots,
          allTaken
        };
      });
      
      setMedications(processedMeds);
      calculateStats(processedMeds);
      
      // Check for missed medications and create notifications
      await checkMissedMedications(processedMeds);
      
    } catch (error) {
      console.error('Error loading medications:', error);
      showError('Failed to load medications');
    } finally {
      setLoading(false);
    }
  };

  const checkMissedMedications = async (meds: MedicationWithSlots[]): Promise<void> => {
    if (!user) return;
    
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    
    const missedAlerts: string[] = [];
    
    meds.forEach(med => {
      med.timeSlots.forEach(slot => {
        if (slot.taken) return;
        
        const [hours, minutes] = slot.time.split(':').map(Number);
        
        // Check if time has passed (give 30 minute grace period)
        if (
          hours < currentHour || 
          (hours === currentHour && minutes + 30 < currentMinute)
        ) {
          missedAlerts.push(`${med.name} at ${formatTime(slot.time)}`);
        }
      });
    });
    
    if (missedAlerts.length > 0) {
      await createAlert(
        user.id,
        `Missed medications: ${missedAlerts.join(', ')}`,
        'high'
      );
      
      // Update notifications
      setNotifications(prev => [
        {
          id: Date.now(),
          message: `You missed: ${missedAlerts.join(', ')}`,
          time: now.toLocaleTimeString(),
          read: false
        },
        ...prev
      ].slice(0, 10));
    }
  };

  // ==================== INITIAL LOAD ====================

  useEffect(() => {
    loadUser();
  }, []);

  useEffect(() => {
    if (user) {
      loadMedications();
      
      // Set up real-time subscription for medication tracking
      const trackingSubscription = supabase
        .channel('tracking-changes')
        .on('postgres_changes', 
          { 
            event: '*', 
            schema: 'public', 
            table: 'medication_tracking',
            filter: `user_id=eq.${user.id}`
          },
          () => {
            loadMedications();
          }
        )
        .subscribe();

      // Update current time every minute
      const interval = setInterval(() => {
        setCurrentTime(new Date());
      }, 60000);

      setRefreshInterval(interval);

      return () => {
        trackingSubscription.unsubscribe();
        if (interval) clearInterval(interval);
      };
    }
  }, [user]);

  // ==================== MEDICATION ACTIONS ====================

  const handleMarkAsTaken = async (
    medicationId: string, 
    timeSlot: string
  ): Promise<void> => {
    if (!user) return;
    
    try {
      setMarkingId(medicationId);
      setMarkingTime(timeSlot);
      
      const today = new Date().toISOString().split('T')[0];
      const success = await markMedicationAsTaken(
        medicationId,
        user.id,
        timeSlot,
        today
      );
      
      if (success) {
        // Update local state
        setMedications(prev => {
          const updated = prev.map(med => {
            if (med.id === medicationId) {
              const updatedTimeSlots = med.timeSlots.map(slot => {
                if (slot.time === timeSlot) {
                  return {
                    ...slot,
                    taken: true,
                    takenAt: new Date().toISOString()
                  };
                }
                return slot;
              });
              
              const allTaken = updatedTimeSlots.every(slot => slot.taken);
              
              return {
                ...med,
                timeSlots: updatedTimeSlots,
                allTaken
              };
            }
            return med;
          });
          
          calculateStats(updated);
          return updated;
        });
        
        showSuccess('Medication marked as taken! ✅');
      } else {
        showError('Failed to mark medication as taken');
      }
    } catch (error) {
      console.error('Error marking as taken:', error);
      showError('An error occurred');
    } finally {
      setMarkingId(null);
      setMarkingTime(null);
    }
  };

  const handleMarkAllForMedication = async (medicationId: string): Promise<void> => {
    const medication = medications.find(m => m.id === medicationId);
    if (!medication) return;
    
    const pendingSlots = medication.timeSlots.filter(slot => !slot.taken);
    
    for (const slot of pendingSlots) {
      await handleMarkAsTaken(medicationId, slot.time);
    }
  };

  // ==================== NOTIFICATION HANDLING ====================

  const markNotificationAsRead = (notificationId: number) => {
    setNotifications(prev =>
      prev.map(n =>
        n.id === notificationId ? { ...n, read: true } : n
      )
    );
  };

  const clearAllNotifications = () => {
    setNotifications([]);
  };

  // ==================== AUTH HANDLING ====================

  const handleLogout = async (): Promise<void> => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  // ==================== HELPER FUNCTIONS ====================

  const isTimePassed = (timeStr: string): boolean => {
    const [hours, minutes] = timeStr.split(':').map(Number);
    const medTime = new Date();
    medTime.setHours(hours, minutes, 0);
    return currentTime > medTime;
  };

  const getTimeStatus = (timeStr: string, taken: boolean): string => {
    if (taken) return 'taken';
    if (isTimePassed(timeStr)) return 'missed';
    return 'pending';
  };

  const unreadNotificationsCount = notifications.filter(n => !n.read).length;

  // ==================== LOADING STATE ====================

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-teal-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="relative">
            <div className="w-20 h-20 border-4 border-teal-200 border-t-teal-600 rounded-full animate-spin"></div>
            <Pill className="w-8 h-8 text-teal-600 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" />
          </div>
          <p className="mt-4 text-gray-600 font-medium">Loading your medications...</p>
        </div>
      </div>
    );
  }

  // ==================== MAIN RENDER ====================

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 to-blue-50">
      {/* Success Toast */}
      {successMessage && (
        <div className="fixed top-4 right-4 z-50 bg-green-100 border border-green-200 text-green-700 px-4 py-3 rounded-lg shadow-lg flex items-center space-x-2 animate-slideDown">
          <CheckCircle className="w-5 h-5" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Error Toast */}
      {error && (
        <div className="fixed top-4 right-4 z-50 bg-red-100 border border-red-200 text-red-700 px-4 py-3 rounded-lg shadow-lg flex items-center space-x-2 animate-slideDown">
          <AlertCircle className="w-5 h-5" />
          <span>{error}</span>
        </div>
      )}

      {/* Header */}
      <header className="bg-white/80 backdrop-blur-md border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-br from-teal-500 to-blue-500 rounded-xl flex items-center justify-center shadow-lg">
                <Heart className="w-5 h-5 text-white" />
              </div>
              <h1 className="text-xl font-bold bg-gradient-to-r from-teal-600 to-blue-600 bg-clip-text text-transparent">
                MedBuddy
              </h1>
            </div>

            <div className="flex items-center space-x-4">
              {/* Progress Indicator */}
              <div className="hidden sm:block">
                <div className="flex items-center space-x-2">
                  <div className="w-32 bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-teal-600 h-2 rounded-full transition-all duration-500"
                      style={{ width: `${stats.adherence}%` }}
                    />
                  </div>
                  <span className="text-sm font-medium text-gray-700">
                    {stats.taken}/{stats.total}
                  </span>
                </div>
              </div>
              
              {/* Notifications */}
              <div className="relative">
                <button 
                  onClick={() => setShowNotifications(!showNotifications)}
                  className="relative p-2 rounded-lg text-gray-400 hover:text-gray-500 hover:bg-gray-100 transition-all"
                >
                  <Bell className="w-5 h-5" />
                  {unreadNotificationsCount > 0 && (
                    <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
                  )}
                </button>

                {/* Notifications Panel */}
                {showNotifications && (
                  <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden z-50">
                    <div className="p-3 border-b border-gray-100 bg-gradient-to-r from-teal-600 to-blue-600 text-white flex justify-between items-center">
                      <div className="flex items-center space-x-2">
                        <Bell className="w-4 h-4" />
                        <h3 className="font-semibold text-sm">Notifications</h3>
                      </div>
                      {notifications.length > 0 && (
                        <button
                          onClick={clearAllNotifications}
                          className="text-xs bg-white/20 px-2 py-1 rounded hover:bg-white/30"
                        >
                          Clear all
                        </button>
                      )}
                    </div>
                    <div className="max-h-96 overflow-y-auto">
                      {notifications.length > 0 ? (
                        notifications.map((notif) => (
                          <div
                            key={notif.id}
                            onClick={() => markNotificationAsRead(notif.id)}
                            className={`p-3 border-b border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors ${
                              notif.read ? 'opacity-60' : ''
                            }`}
                          >
                            <p className="text-sm text-gray-800">{notif.message}</p>
                            <p className="text-xs text-gray-500 mt-1">{notif.time}</p>
                          </div>
                        ))
                      ) : (
                        <div className="text-center py-8">
                          <Bell className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                          <p className="text-sm text-gray-500">No notifications</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* User Menu */}
              <div className="flex items-center space-x-3">
                <div className="text-right hidden md:block">
                  <p className="text-sm font-medium text-gray-900">
                    {profile?.full_name || 'Patient'}
                  </p>
                  <p className="text-xs text-gray-500">Patient</p>
                </div>
                <div className="w-10 h-10 bg-gradient-to-br from-teal-100 to-blue-100 rounded-xl flex items-center justify-center text-teal-700 font-bold shadow-sm">
                  {profile?.full_name?.charAt(0) || 'P'}
                </div>
                <button
                  onClick={handleLogout}
                  className="p-2 rounded-lg text-gray-400 hover:text-gray-500 hover:bg-gray-100 transition-all"
                  title="Sign out"
                >
                  <LogOut className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Card */}
        <div className="bg-gradient-to-r from-teal-600 to-blue-600 rounded-2xl shadow-xl p-6 text-white mb-8">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-2xl font-bold mb-2">
                Hello, {profile?.full_name?.split(' ')[0] || 'there'}! 👋
              </h2>
              <p className="text-teal-100 text-sm max-w-lg">
                {stats.pending === 0 
                  ? "You've taken all your medications today. Great job! 🎉 Stay healthy!"
                  : `You have ${stats.pending} medication${stats.pending > 1 ? 's' : ''} to take today. Let's stay on track! 💪`}
              </p>
            </div>
            <div className="bg-white/20 rounded-xl p-3 backdrop-blur-sm">
              <Calendar className="w-6 h-6" />
            </div>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-3 gap-4 mt-6">
            <div className="bg-white/10 rounded-xl p-3">
              <p className="text-teal-100 text-xs mb-1">Total</p>
              <p className="text-2xl font-bold">{stats.total}</p>
            </div>
            <div className="bg-white/10 rounded-xl p-3">
              <p className="text-teal-100 text-xs mb-1">Taken</p>
              <p className="text-2xl font-bold text-green-300">{stats.taken}</p>
            </div>
            <div className="bg-white/10 rounded-xl p-3">
              <p className="text-teal-100 text-xs mb-1">Pending</p>
              <p className="text-2xl font-bold text-yellow-300">{stats.pending}</p>
            </div>
          </div>
        </div>

        {/* Medications List */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 bg-gray-50">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-gray-900">Today's Medications</h3>
                <p className="text-sm text-gray-500 mt-1">
                  {new Date().toLocaleDateString('en-US', { 
                    weekday: 'long', 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                  })}
                </p>
              </div>
              <div className="flex items-center space-x-2">
                <Activity className="w-5 h-5 text-teal-600" />
                <span className="text-sm font-medium text-gray-700">
                  {stats.adherence}% adherence
                </span>
              </div>
            </div>
          </div>

          {medications.length === 0 ? (
            <div className="px-6 py-16 text-center">
              <div className="w-20 h-20 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Pill className="w-10 h-10 text-gray-400" />
              </div>
              <h4 className="text-lg font-semibold text-gray-900 mb-2">No medications for today</h4>
              <p className="text-gray-500 max-w-sm mx-auto">
                Your caretaker hasn't added any medications yet. They'll appear here once added.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {medications.map((medication) => (
                <div key={medication.id} className="p-6 hover:bg-gray-50 transition-colors">
                  {/* Medication Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <div className="flex items-center flex-wrap gap-2">
                        <h4 className="text-lg font-bold text-gray-900">{medication.name}</h4>
                        <span className="px-2 py-1 bg-teal-100 text-teal-700 text-xs font-medium rounded-full">
                          {medication.dosage}
                        </span>
                        <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded-full capitalize">
                          {medication.frequency}
                        </span>
                      </div>
                      {medication.notes && (
                        <p className="text-sm text-gray-500 mt-2">{medication.notes}</p>
                      )}
                    </div>
                    
                    {/* Mark All Button (for multiple times) */}
                    {medication.timeSlots.length > 1 && !medication.allTaken && (
                      <button
                        onClick={() => handleMarkAllForMedication(medication.id)}
                        disabled={markingId === medication.id}
                        className="px-3 py-1.5 bg-teal-100 text-teal-700 rounded-lg text-sm font-medium hover:bg-teal-200 transition-colors disabled:opacity-50"
                      >
                        Mark All
                      </button>
                    )}
                  </div>

                  {/* Time Slots */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mt-4">
                    {medication.timeSlots.map((slot) => {
                      const status = getTimeStatus(slot.time, slot.taken);
                      const isMarking = markingId === medication.id && markingTime === slot.time;
                      
                      return (
                        <div
                          key={slot.time}
                          className={`
                            relative p-4 rounded-xl border-2 transition-all
                            ${slot.taken 
                              ? 'bg-green-50 border-green-200' 
                              : status === 'missed'
                                ? 'bg-red-50 border-red-200'
                                : 'bg-gray-50 border-gray-200 hover:border-teal-200'
                            }
                          `}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center space-x-2">
                              <Clock className={`w-4 h-4 ${
                                slot.taken 
                                  ? 'text-green-600'
                                  : status === 'missed'
                                    ? 'text-red-600'
                                    : 'text-gray-400'
                              }`} />
                              <span className={`font-medium ${
                                slot.taken 
                                  ? 'text-green-700'
                                  : status === 'missed'
                                    ? 'text-red-700'
                                    : 'text-gray-700'
                              }`}>
                                {formatTime(slot.time)}
                              </span>
                            </div>
                            {slot.taken && (
                              <CheckCircle className="w-5 h-5 text-green-600" />
                            )}
                          </div>

                          {!slot.taken && (
                            <button
                              onClick={() => handleMarkAsTaken(medication.id, slot.time)}
                              disabled={isMarking}
                              className={`
                                w-full mt-2 px-3 py-2 rounded-lg text-sm font-medium transition-all
                                ${status === 'missed'
                                  ? 'bg-red-600 text-white hover:bg-red-700'
                                  : 'bg-teal-600 text-white hover:bg-teal-700'
                                } disabled:opacity-50 disabled:cursor-not-allowed
                              `}
                            >
                              {isMarking ? (
                                <span className="flex items-center justify-center">
                                  <Loader className="w-4 h-4 animate-spin mr-2" />
                                  Marking...
                                </span>
                              ) : (
                                'Mark as Taken'
                              )}
                            </button>
                          )}

                          {slot.taken && slot.takenAt && (
                            <p className="text-xs text-green-600 mt-2">
                              Taken at {new Date(slot.takenAt).toLocaleTimeString()}
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Progress for this medication */}
                  {medication.timeSlots.length > 1 && (
                    <div className="mt-4">
                      <div className="flex items-center justify-between text-sm mb-1">
                        <span className="text-gray-600">Progress</span>
                        <span className="font-medium text-gray-900">
                          {medication.timeSlots.filter(s => s.taken).length}/{medication.timeSlots.length}
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-teal-600 h-2 rounded-full transition-all duration-500"
                          style={{ 
                            width: `${(medication.timeSlots.filter(s => s.taken).length / medication.timeSlots.length) * 100}%` 
                          }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Daily Summary Card */}
        {medications.length > 0 && (
          <div className="mt-6 bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Daily Summary</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-green-50 rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <span className="text-2xl font-bold text-green-700">{stats.taken}</span>
                </div>
                <p className="text-sm text-green-700">Medications Taken</p>
              </div>
              
              <div className="bg-yellow-50 rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <Clock className="w-5 h-5 text-yellow-600" />
                  <span className="text-2xl font-bold text-yellow-700">{stats.pending}</span>
                </div>
                <p className="text-sm text-yellow-700">Still Pending</p>
              </div>
              
              <div className="bg-blue-50 rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <Activity className="w-5 h-5 text-blue-600" />
                  <span className="text-2xl font-bold text-blue-700">{stats.adherence}%</span>
                </div>
                <p className="text-sm text-blue-700">Today's Adherence</p>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* CSS Animations */}
      <style>{`
        @keyframes slideDown {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        .animate-slideDown {
          animation: slideDown 0.3s ease-out;
        }
      `}</style>
    </div>
  );
};

export default PatientDashboard;