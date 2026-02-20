// components/caretaker/CaretakerDashboard.tsx
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Pill,
  Clock,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Bell,
  LogOut,
  Menu,
  Search,
  RefreshCw,
  Plus,
  Trash2,
  X,
  Calendar,
  FileText,
  Activity,
  Heart,
  ChevronDown,
  Filter,
  User,
  Loader
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import {
  getMedications,
  deleteMedication,
  updateMedication,
  getMedicationsWithTodayStatus,
  getCurrentUser,
  getUserProfile,
  formatTime,
  addMedication,
  getAlerts,
  markAlertAsRead,
  checkMissedMedications,
  createAlert
} from '../../lib/database';
import type { Medication, MedicationWithTracking, Profile, Alert } from '../../types';

// ==================== TYPES ====================

interface MedicationRow {
  id: string;
  name: string;
  dosage: string;
  frequency: string;
  time: string;
  type: string;
  notes: string;
  refill_date: string;
  isNew?: boolean;
  status?: 'taken' | 'pending' | 'missed';
  lastTaken?: string;
  takenTimes?: string[];
}

interface Stats {
  totalMeds: number;
  takenToday: number;
  missedToday: number;
  pendingToday: number;
  adherence: number;
}

// ==================== MAIN COMPONENT ====================

const CaretakerDashboard: React.FC = () => {
  // ==================== STATE ====================
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(false);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [showFilters, setShowFilters] = useState<boolean>(false);
  const [medications, setMedications] = useState<Medication[]>([]);
  const [medicationsWithStatus, setMedicationsWithStatus] = useState<MedicationWithTracking[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [todayDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [showAlertPanel, setShowAlertPanel] = useState<boolean>(false);
  const [showDeleteModal, setShowDeleteModal] = useState<boolean>(false);
  const [medicationToDelete, setMedicationToDelete] = useState<MedicationRow | null>(null);
  const [successMessage, setSuccessMessage] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  
  // Medication table rows
  const [medicationRows, setMedicationRows] = useState<MedicationRow[]>([]);
  const [editingCell, setEditingCell] = useState<{rowId: string, field: string} | null>(null);
  const [editValue, setEditValue] = useState<string>('');
  const [savingRow, setSavingRow] = useState<string | null>(null);
  const [pendingSave, setPendingSave] = useState<{rowId: string, field: string, value: string} | null>(null);

  // Refs for focus management
  const inputRef = useRef<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>(null);
  const cellRefs = useRef<Map<string, HTMLTableCellElement>>(new Map());

  // Stats
  const [stats, setStats] = useState<Stats>({
    totalMeds: 0,
    takenToday: 0,
    missedToday: 0,
    pendingToday: 0,
    adherence: 0
  });

  const navigate = useNavigate();

  // ==================== UTILITY FUNCTIONS ====================

  const isTimePassed = useCallback((timeStr: string): boolean => {
    if (!timeStr) return false;
    const [hours, minutes] = timeStr.split(':').map(Number);
    const medTime = new Date();
    medTime.setHours(hours, minutes, 0);
    return new Date() > medTime;
  }, []);

  const calculateStats = useCallback((rows: MedicationRow[]) => {
    const total = rows.length;
    const taken = rows.filter(m => m.status === 'taken').length;
    const missed = rows.filter(m => m.status === 'missed').length;
    const pending = rows.filter(m => m.status === 'pending').length;
    const adherence = total > 0 ? Math.round((taken / total) * 100) : 0;

    setStats({
      totalMeds: total,
      takenToday: taken,
      missedToday: missed,
      pendingToday: pending,
      adherence
    });
  }, []);

  const showSuccess = (message: string) => {
    setSuccessMessage(message);
    setTimeout(() => setSuccessMessage(''), 3000);
  };

  const showError = (message: string) => {
    setErrorMessage(message);
    setTimeout(() => setErrorMessage(''), 3000);
  };

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

  const loadAlerts = async (userId: string): Promise<void> => {
    const userAlerts = await getAlerts(userId);
    setAlerts(userAlerts);
  };

  const loadData = async (): Promise<void> => {
    if (!user) return;

    try {
      setLoading(true);
      
      // Get all medications
      const meds = await getMedications(user.id);
      setMedications(meds);
      
      // Get today's status for medications
      const medsWithStatus = await getMedicationsWithTodayStatus(user.id, todayDate);
      setMedicationsWithStatus(medsWithStatus);
      
      // Get detailed tracking for today
      const { data: tracking } = await supabase
        .from('medication_tracking')
        .select('*')
        .eq('user_id', user.id)
        .eq('tracking_date', todayDate);
      
      // Load alerts
      await loadAlerts(user.id);
      
      // Convert to rows with status and taken times
      const rows: MedicationRow[] = meds.map(med => {
        const todayStatus = medsWithStatus.find(m => m.id === med.id);
        const medTracking = tracking?.filter(t => t.medication_id === med.id) || [];
        
        let status: 'taken' | 'pending' | 'missed' = 'pending';
        let takenTimes: string[] = [];
        let lastTaken: string | undefined;
        
        if (todayStatus?.taken) {
          status = 'taken';
          takenTimes = medTracking.filter(t => t.taken).map(t => t.scheduled_time);
          const lastTakenRecord = medTracking
            .filter(t => t.taken)
            .sort((a, b) => 
              new Date(b.taken_at || '').getTime() - new Date(a.taken_at || '').getTime()
            )[0];
          if (lastTakenRecord?.taken_at) {
            lastTaken = new Date(lastTakenRecord.taken_at).toLocaleTimeString();
          }
        } else {
          const firstTime = med.time.split(',')[0].trim();
          status = isTimePassed(firstTime) ? 'missed' : 'pending';
        }

        return {
          id: med.id,
          name: med.name,
          dosage: med.dosage,
          frequency: med.frequency,
          time: med.time,
          type: med.type,
          notes: med.notes || '',
          refill_date: med.refill_date || '',
          status,
          takenTimes,
          lastTaken
        };
      });
      
      setMedicationRows(rows);
      calculateStats(rows);
      setLastUpdated(new Date());

    } catch (error) {
      console.error('Error loading data:', error);
      showError('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  // Initial load
  useEffect(() => {
    loadUser();
  }, []);

  // Load data when user is available
  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user]);

  // ==================== REAL-TIME SUBSCRIPTIONS ====================

  useEffect(() => {
    if (!user) return;

    // Subscribe to medication_tracking changes
    const trackingSubscription = supabase
      .channel('caretaker-tracking-changes')
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'medication_tracking',
          filter: `user_id=eq.${user.id}`
        },
        async (payload) => {
          console.log('Tracking changed:', payload);
          
          // Reload data to get fresh status
          await loadData();
          
          // Show notification and create alert
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            const newTracking = payload.new as any;
            if (newTracking.taken) {
              // Find the medication name
              const medication = medications.find(m => m.id === newTracking.medication_id);
              if (medication) {
                const timeFormatted = formatTime(newTracking.scheduled_time);
                showSuccess(`✅ ${medication.name} was taken at ${timeFormatted}`);
                
                // Create alert for caretaker
                await createAlert(
                  user.id,
                  `${medication.name} was taken at ${timeFormatted}`,
                  'low'
                );
              }
            }
          }
        }
      )
      .subscribe();

    // Subscribe to alerts changes
    const alertsSubscription = supabase
      .channel('caretaker-alerts-changes')
      .on('postgres_changes', 
        { event: 'INSERT', schema: 'public', table: 'alerts', filter: `user_id=eq.${user.id}` },
        (payload) => {
          setAlerts(prev => [payload.new as Alert, ...prev]);
        }
      )
      .subscribe();

    // Auto-refresh every 30 seconds as backup
    const interval = setInterval(async () => {
      await checkMissedMedications(user.id);
      await loadData();
    }, 30000);

    return () => {
      trackingSubscription.unsubscribe();
      alertsSubscription.unsubscribe();
      clearInterval(interval);
    };
  }, [user, medications]);

  // Process pending saves
  useEffect(() => {
    const processPendingSave = async () => {
      if (!pendingSave || !user) return;

      const { rowId, field, value } = pendingSave;
      
      // Update local state immediately
      setMedicationRows(prev => 
        prev.map(row => {
          if (row.id === rowId) {
            return { ...row, [field]: value };
          }
          return row;
        })
      );

      // If it's a new row and all required fields are filled, save to database
      const row = medicationRows.find(r => r.id === rowId);
      if (row?.isNew && (field === 'name' || field === 'dosage' || field === 'time')) {
        const updatedRow = { ...row, [field]: value };
        const requiredFields = ['name', 'dosage', 'time'];
        const allRequiredFilled = requiredFields.every(f => updatedRow[f as keyof MedicationRow]);
        
        if (allRequiredFilled && user) {
          setSavingRow(rowId);
          try {
            const newMedication = await addMedication({
              user_id: user.id,
              name: updatedRow.name,
              dosage: updatedRow.dosage,
              frequency: updatedRow.frequency,
              time: updatedRow.time,
              type: updatedRow.type,
              notes: updatedRow.notes || null,
              refill_date: updatedRow.refill_date || null
            });

            // Replace temporary ID with real ID
            setMedicationRows(prev => 
              prev.map(r => r.id === rowId ? { 
                ...r, 
                id: newMedication.id,
                isNew: false
              } : r)
            );

            showSuccess('Medication added successfully');
            
            // Reload data to get fresh status
            await loadData();
          } catch (error) {
            console.error('Error saving medication:', error);
            showError('Failed to save medication');
          } finally {
            setSavingRow(null);
          }
        }
      } else if (!row?.isNew && user) {
        // Update existing medication in database
        setSavingRow(rowId);
        try {
          await updateMedication(rowId, {
            [field]: value
          });
          showSuccess('Medication updated');
        } catch (error) {
          console.error('Error updating medication:', error);
          showError('Failed to update medication');
        } finally {
          setSavingRow(null);
        }
      }

      setPendingSave(null);
    };

    processPendingSave();
  }, [pendingSave, user, medicationRows]);

  // Focus input when editing starts
  useEffect(() => {
    if (editingCell && inputRef.current) {
      inputRef.current.focus();
    }
  }, [editingCell]);

  // ==================== MEDICATION CRUD ====================

  const addNewRow = (): void => {
    const newRow: MedicationRow = {
      id: `new-${Date.now()}`,
      name: '',
      dosage: '',
      frequency: 'Daily',
      time: '',
      type: 'Other',
      notes: '',
      refill_date: '',
      isNew: true,
      status: 'pending'
    };
    setMedicationRows([newRow, ...medicationRows]);
    setEditingCell({ rowId: newRow.id, field: 'name' });
    setEditValue('');
  };

  const handleCellClick = (rowId: string, field: string, currentValue: string): void => {
    // Don't allow editing while saving
    if (savingRow === rowId) return;
    
    setEditingCell({ rowId, field });
    setEditValue(currentValue || '');
  };

  const handleCellChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>): void => {
    setEditValue(e.target.value);
  };

  const saveCell = (rowId: string, field: string, value: string): void => {
    setPendingSave({ rowId, field, value });
  };

  const handleCellBlur = (): void => {
    if (!editingCell) return;
    
    const { rowId, field } = editingCell;
    
    // Only save if value changed
    const currentRow = medicationRows.find(r => r.id === rowId);
    if (currentRow && currentRow[field as keyof MedicationRow] !== editValue) {
      saveCell(rowId, field, editValue);
    }
    
    setEditingCell(null);
    setEditValue('');
  };

  const handleKeyDown = (e: React.KeyboardEvent, rowId: string, field: string): void => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleCellBlur();
      
      // Find next cell to edit (down arrow behavior)
      setTimeout(() => {
        const rows = filteredRows;
        const currentIndex = rows.findIndex(r => r.id === rowId);
        if (currentIndex < rows.length - 1) {
          const nextRow = rows[currentIndex + 1];
          const nextCellId = `cell-${nextRow.id}-${field}`;
          const nextCell = cellRefs.current.get(nextCellId);
          if (nextCell) {
            nextCell.click();
          }
        }
      }, 10);
    } else if (e.key === 'Tab') {
      e.preventDefault();
      handleCellBlur();
      
      // Find next cell in the same row
      setTimeout(() => {
        const fields: (keyof MedicationRow)[] = ['name', 'dosage', 'frequency', 'time', 'type'];
        const currentFieldIndex = fields.indexOf(field as keyof MedicationRow);
        
        if (e.shiftKey) {
          // Shift+Tab: move to previous field
          if (currentFieldIndex > 0) {
            const prevField = fields[currentFieldIndex - 1];
            const prevCellId = `cell-${rowId}-${prevField}`;
            const prevCell = cellRefs.current.get(prevCellId);
            if (prevCell) {
              prevCell.click();
            }
          } else {
            // Move to previous row's last field
            const rows = filteredRows;
            const currentIndex = rows.findIndex(r => r.id === rowId);
            if (currentIndex > 0) {
              const prevRow = rows[currentIndex - 1];
              const prevField = fields[fields.length - 1];
              const prevCellId = `cell-${prevRow.id}-${prevField}`;
              const prevCell = cellRefs.current.get(prevCellId);
              if (prevCell) {
                prevCell.click();
              }
            }
          }
        } else {
          // Tab: move to next field
          if (currentFieldIndex < fields.length - 1) {
            const nextField = fields[currentFieldIndex + 1];
            const nextCellId = `cell-${rowId}-${nextField}`;
            const nextCell = cellRefs.current.get(nextCellId);
            if (nextCell) {
              nextCell.click();
            }
          } else {
            // Move to next row's first field
            const rows = filteredRows;
            const currentIndex = rows.findIndex(r => r.id === rowId);
            if (currentIndex < rows.length - 1) {
              const nextRow = rows[currentIndex + 1];
              const nextField = fields[0];
              const nextCellId = `cell-${nextRow.id}-${nextField}`;
              const nextCell = cellRefs.current.get(nextCellId);
              if (nextCell) {
                nextCell.click();
              }
            }
          }
        }
      }, 10);
    } else if (e.key === 'Escape') {
      setEditingCell(null);
      setEditValue('');
    }
  };

  const confirmDelete = (row: MedicationRow): void => {
    setMedicationToDelete(row);
    setShowDeleteModal(true);
  };

  const handleDelete = async (): Promise<void> => {
    if (!medicationToDelete) return;

    if (medicationToDelete.isNew) {
      // Just remove from UI
      setMedicationRows(prev => prev.filter(r => r.id !== medicationToDelete.id));
      setShowDeleteModal(false);
      setMedicationToDelete(null);
      showSuccess('Medication removed');
      calculateStats(medicationRows.filter(r => r.id !== medicationToDelete.id));
    } else {
      // Delete from database
      try {
        setLoading(true);
        const success = await deleteMedication(medicationToDelete.id);
        
        if (success) {
          const updatedRows = medicationRows.filter(r => r.id !== medicationToDelete.id);
          setMedicationRows(updatedRows);
          setShowDeleteModal(false);
          setMedicationToDelete(null);
          showSuccess('Medication deleted successfully');
          calculateStats(updatedRows);
        } else {
          showError('Failed to delete medication');
        }
      } catch (error) {
        console.error('Error deleting medication:', error);
        showError('Failed to delete medication');
      } finally {
        setLoading(false);
      }
    }
  };

  // ==================== ALERT HANDLING ====================

  const handleMarkAlertAsRead = async (alertId: string): Promise<void> => {
    await markAlertAsRead(alertId);
    setAlerts(prev => 
      prev.map(alert => 
        alert.id === alertId ? { ...alert, read: true } : alert
      )
    );
  };

  const handleMarkAllAlertsAsRead = async (): Promise<void> => {
    for (const alert of alerts.filter(a => !a.read)) {
      await markAlertAsRead(alert.id);
    }
    setAlerts(prev => prev.map(alert => ({ ...alert, read: true })));
  };

  // ==================== AUTH HANDLING ====================

  const handleLogout = async (): Promise<void> => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  // ==================== FILTERING ====================

  const filteredRows = medicationRows.filter(row => {
    const matchesSearch = 
      row.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      row.type.toLowerCase().includes(searchTerm.toLowerCase()) ||
      row.dosage.toLowerCase().includes(searchTerm.toLowerCase());

    if (filterStatus === 'all') return matchesSearch;
    return matchesSearch && row.status === filterStatus;
  });

  const unreadAlertsCount = alerts.filter(a => !a.read).length;

  // ==================== RENDER FUNCTIONS ====================

  const renderCell = (row: MedicationRow, field: string, value: string, placeholder: string = ''): React.ReactNode => {
    const isEditing = editingCell?.rowId === row.id && editingCell.field === field;
    const isSaving = savingRow === row.id;
    const cellId = `cell-${row.id}-${field}`;
    
    if (isSaving) {
      return (
        <div className="flex items-center space-x-2">
          <Loader className="w-4 h-4 animate-spin text-blue-600" />
          <span className="text-xs text-gray-500">Saving...</span>
        </div>
      );
    }
    
    if (isEditing) {
      if (field === 'frequency') {
        return (
          <select
            ref={inputRef as React.RefObject<HTMLSelectElement>}
            value={editValue}
            onChange={handleCellChange}
            onBlur={handleCellBlur}
            onKeyDown={(e) => handleKeyDown(e, row.id, field)}
            className="w-full px-2 py-1 border-2 border-blue-500 rounded-lg focus:outline-none bg-white shadow-sm"
            autoFocus
          >
            <option value="Daily">Daily</option>
            <option value="Twice daily">Twice daily</option>
            <option value="Three times daily">Three times daily</option>
            <option value="Every 4 hours">Every 4 hours</option>
            <option value="Weekly">Weekly</option>
            <option value="As needed">As needed</option>
          </select>
        );
      } else if (field === 'type') {
        return (
          <select
            ref={inputRef as React.RefObject<HTMLSelectElement>}
            value={editValue}
            onChange={handleCellChange}
            onBlur={handleCellBlur}
            onKeyDown={(e) => handleKeyDown(e, row.id, field)}
            className="w-full px-2 py-1 border-2 border-blue-500 rounded-lg focus:outline-none bg-white shadow-sm"
            autoFocus
          >
            <option value="Blood Pressure">Blood Pressure</option>
            <option value="Diabetes">Diabetes</option>
            <option value="Cholesterol">Cholesterol</option>
            <option value="Pain Relief">Pain Relief</option>
            <option value="Antibiotic">Antibiotic</option>
            <option value="Heart Medication">Heart Medication</option>
            <option value="Thyroid">Thyroid</option>
            <option value="Other">Other</option>
          </select>
        );
      } else if (field === 'notes') {
        return (
          <textarea
            ref={inputRef as React.RefObject<HTMLTextAreaElement>}
            value={editValue}
            onChange={handleCellChange}
            onBlur={handleCellBlur}
            onKeyDown={(e) => handleKeyDown(e, row.id, field)}
            className="w-full px-2 py-1 border-2 border-blue-500 rounded-lg focus:outline-none bg-white shadow-sm"
            rows={2}
            placeholder={placeholder}
            autoFocus
          />
        );
      } else if (field === 'refill_date') {
        return (
          <input
            ref={inputRef as React.RefObject<HTMLInputElement>}
            type="date"
            value={editValue}
            onChange={handleCellChange}
            onBlur={handleCellBlur}
            onKeyDown={(e) => handleKeyDown(e, row.id, field)}
            className="w-full px-2 py-1 border-2 border-blue-500 rounded-lg focus:outline-none bg-white shadow-sm"
            autoFocus
          />
        );
      } else if (field === 'time') {
        return (
          <input
            ref={inputRef as React.RefObject<HTMLInputElement>}
            type="text"
            value={editValue}
            onChange={handleCellChange}
            onBlur={handleCellBlur}
            onKeyDown={(e) => handleKeyDown(e, row.id, field)}
            className="w-full px-2 py-1 border-2 border-blue-500 rounded-lg focus:outline-none bg-white shadow-sm"
            placeholder="e.g., 08:00, 20:00"
            autoFocus
          />
        );
      } else {
        return (
          <input
            ref={inputRef as React.RefObject<HTMLInputElement>}
            type="text"
            value={editValue}
            onChange={handleCellChange}
            onBlur={handleCellBlur}
            onKeyDown={(e) => handleKeyDown(e, row.id, field)}
            className="w-full px-2 py-1 border-2 border-blue-500 rounded-lg focus:outline-none bg-white shadow-sm"
            placeholder={placeholder}
            autoFocus
          />
        );
      }
    }
    
    // Display value with status indicator for medication name
    if (field === 'name' && row.status) {
      const statusColors = {
        taken: 'text-green-600',
        pending: 'text-yellow-600',
        missed: 'text-red-600'
      };
      
      return (
        <td 
          ref={el => {
            if (el) {
              cellRefs.current.set(cellId, el);
            } else {
              cellRefs.current.delete(cellId);
            }
          }}
          onClick={() => handleCellClick(row.id, field, value)}
          className={`px-6 py-4 cursor-text group hover:bg-gray-50 transition-colors ${!value ? 'text-gray-400' : ''}`}
        >
          <div className="flex items-center space-x-2">
            <span className={`font-medium ${statusColors[row.status] || ''}`}>
              {value || placeholder}
            </span>
            {row.isNew && (
              <span className="px-1.5 py-0.5 bg-blue-100 text-blue-600 text-xs rounded-full">New</span>
            )}
          </div>
        </td>
      );
    }
    
    return (
      <td
        ref={el => {
          if (el) {
            cellRefs.current.set(cellId, el);
          } else {
            cellRefs.current.delete(cellId);
          }
        }}
        onClick={() => handleCellClick(row.id, field, value)}
        className={`px-6 py-4 cursor-text group hover:bg-gray-50 transition-colors ${!value ? 'text-gray-400' : ''}`}
      >
        {field === 'time' && value ? formatTime(value) : value || placeholder}
      </td>
    );
  };

  const getStatusBadge = (status?: string, takenTimes?: string[]): React.ReactNode => {
    switch (status) {
      case 'taken':
        return (
          <div className="space-y-1">
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
              <CheckCircle className="w-3 h-3 mr-1" />
              Taken
            </span>
            {takenTimes && takenTimes.length > 0 && (
              <div className="text-xs text-green-600">
                {takenTimes.map(t => formatTime(t)).join(', ')}
              </div>
            )}
          </div>
        );
      case 'missed':
        return (
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700">
            <XCircle className="w-3 h-3 mr-1" />
            Missed
          </span>
        );
      case 'pending':
        return (
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700">
            <Clock className="w-3 h-3 mr-1" />
            Pending
          </span>
        );
      default:
        return null;
    }
  };

  // ==================== LOADING STATE ====================

  if (loading && medications.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <div className="relative">
            <div className="w-20 h-20 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
            <Pill className="w-8 h-8 text-blue-600 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" />
          </div>
          <p className="mt-4 text-gray-600 font-medium">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  // ==================== MAIN RENDER ====================

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
      {/* Success Toast */}
      {successMessage && (
        <div className="fixed top-4 right-4 z-50 bg-green-100 border border-green-200 text-green-700 px-4 py-3 rounded-lg shadow-lg flex items-center space-x-2 animate-slideDown">
          <CheckCircle className="w-5 h-5" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Error Toast */}
      {errorMessage && (
        <div className="fixed top-4 right-4 z-50 bg-red-100 border border-red-200 text-red-700 px-4 py-3 rounded-lg shadow-lg flex items-center space-x-2 animate-slideDown">
          <AlertTriangle className="w-5 h-5" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm z-20 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed top-0 left-0 z-30 h-full w-72 bg-white shadow-2xl transform transition-transform duration-300 ease-in-out
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0
      `}>
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="p-6 border-b border-gray-100">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
                <Heart className="w-6 h-6 text-white" />
              </div>
              <div>
                <span className="text-xl font-bold text-gray-900">MedBuddy</span>
                <p className="text-xs text-gray-500">Caretaker Portal</p>
              </div>
            </div>
          </div>

          {/* Profile */}
          <div className="px-6 py-4 border-b border-gray-100">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-xl flex items-center justify-center text-blue-700 font-bold text-lg">
                {profile?.full_name?.charAt(0) || 'C'}
              </div>
              <div>
                <p className="font-semibold text-gray-900">{profile?.full_name || 'Caretaker'}</p>
                <p className="text-xs text-gray-500">{profile?.email}</p>
              </div>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="p-4">
            <div className="bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl p-4 text-white">
              <p className="text-sm opacity-90 mb-2">Today's Adherence</p>
              <p className="text-3xl font-bold mb-1">{stats.adherence}%</p>
              <div className="w-full bg-white/20 rounded-full h-2 mb-3">
                <div 
                  className="bg-white rounded-full h-2 transition-all duration-500"
                  style={{ width: `${stats.adherence}%` }}
                />
              </div>
              <div className="grid grid-cols-3 gap-2 text-xs">
                <div>
                  <p className="opacity-90">Taken</p>
                  <p className="font-bold">{stats.takenToday}</p>
                </div>
                <div>
                  <p className="opacity-90">Pending</p>
                  <p className="font-bold">{stats.pendingToday}</p>
                </div>
                <div>
                  <p className="opacity-90">Missed</p>
                  <p className="font-bold">{stats.missedToday}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Last Updated */}
          <div className="px-4 py-2 text-xs text-gray-500 text-center">
            Last updated: {lastUpdated.toLocaleTimeString()}
          </div>

          {/* Logout */}
          <div className="p-4 border-t border-gray-100 mt-auto">
            <button
              onClick={handleLogout}
              className="w-full flex items-center px-4 py-3 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-xl transition-all"
            >
              <LogOut className="w-5 h-5 mr-3 text-gray-400" />
              Sign out
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="lg:ml-72 min-h-screen">
        {/* Header */}
        <header className="bg-white/80 backdrop-blur-md border-b border-gray-200 sticky top-0 z-10">
          <div className="flex items-center justify-between px-6 py-4">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 rounded-lg text-gray-400 hover:text-gray-500 hover:bg-gray-100"
            >
              <Menu className="w-6 h-6" />
            </button>

            <div className="flex-1 lg:flex-none">
              <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                Caretaker Dashboard
              </h1>
            </div>

            <div className="flex items-center space-x-3">
              <button
                onClick={() => loadData()}
                className="p-2 rounded-lg text-gray-400 hover:text-gray-500 hover:bg-gray-100 transition-all"
                title="Refresh"
              >
                <RefreshCw className="w-5 h-5" />
              </button>

              <div className="relative">
                <button
                  onClick={() => setShowAlertPanel(!showAlertPanel)}
                  className="relative p-2 rounded-lg text-gray-400 hover:text-gray-500 hover:bg-gray-100 transition-all"
                >
                  <Bell className="w-5 h-5" />
                  {unreadAlertsCount > 0 && (
                    <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
                  )}
                </button>

                {/* Alert Panel */}
                {showAlertPanel && (
                  <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden z-50">
                    <div className="p-3 border-b border-gray-100 bg-gradient-to-r from-blue-600 to-indigo-600 text-white flex justify-between items-center">
                      <div className="flex items-center space-x-2">
                        <Bell className="w-4 h-4" />
                        <h3 className="font-semibold text-sm">Notifications</h3>
                      </div>
                      <div className="flex items-center space-x-2">
                        {unreadAlertsCount > 0 && (
                          <button
                            onClick={handleMarkAllAlertsAsRead}
                            className="text-xs bg-white/20 px-2 py-1 rounded hover:bg-white/30"
                          >
                            Mark all read
                          </button>
                        )}
                        <button
                          onClick={() => setShowAlertPanel(false)}
                          className="p-1 hover:bg-white/20 rounded"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                    <div className="max-h-96 overflow-y-auto">
                      {alerts.length > 0 ? (
                        alerts.map((alert) => (
                          <div
                            key={alert.id}
                            onClick={() => handleMarkAlertAsRead(alert.id)}
                            className={`p-3 border-b border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors ${
                              alert.read ? 'opacity-60' : ''
                            }`}
                          >
                            <div className="flex items-start space-x-2">
                              <div className={`mt-0.5 w-2 h-2 rounded-full flex-shrink-0 ${
                                alert.severity === 'high' ? 'bg-red-500' :
                                alert.severity === 'medium' ? 'bg-yellow-500' : 'bg-blue-500'
                              }`} />
                              <div className="flex-1">
                                <p className="text-sm text-gray-800">{alert.message}</p>
                                <p className="text-xs text-gray-500 mt-1">
                                  {new Date(alert.created_at).toLocaleTimeString()}
                                </p>
                              </div>
                              {!alert.read && (
                                <span className="w-2 h-2 bg-blue-600 rounded-full"></span>
                              )}
                            </div>
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

              <div className="w-10 h-10 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-xl flex items-center justify-center text-blue-700 font-bold shadow-sm">
                {profile?.full_name?.charAt(0) || 'C'}
              </div>
            </div>
          </div>
        </header>

        {/* Dashboard Content */}
        <div className="p-6 space-y-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-all">
              <div className="flex items-center justify-between mb-2">
                <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                  <Pill className="w-6 h-6 text-blue-600" />
                </div>
                <span className="text-3xl font-bold text-gray-800">{stats.totalMeds}</span>
              </div>
              <h3 className="text-gray-600 font-medium">Total Medications</h3>
            </div>

            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-all">
              <div className="flex items-center justify-between mb-2">
                <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                  <CheckCircle className="w-6 h-6 text-green-600" />
                </div>
                <span className="text-3xl font-bold text-gray-800">{stats.takenToday}</span>
              </div>
              <h3 className="text-gray-600 font-medium">Taken Today</h3>
            </div>

            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-all">
              <div className="flex items-center justify-between mb-2">
                <div className="w-12 h-12 bg-yellow-100 rounded-xl flex items-center justify-center">
                  <Clock className="w-6 h-6 text-yellow-600" />
                </div>
                <span className="text-3xl font-bold text-gray-800">{stats.pendingToday}</span>
              </div>
              <h3 className="text-gray-600 font-medium">Pending</h3>
            </div>

            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-all">
              <div className="flex items-center justify-between mb-2">
                <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center">
                  <XCircle className="w-6 h-6 text-red-600" />
                </div>
                <span className="text-3xl font-bold text-gray-800">{stats.missedToday}</span>
              </div>
              <h3 className="text-gray-600 font-medium">Missed</h3>
            </div>
          </div>

          {/* Medications Section */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-6 border-b border-gray-100">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-xl flex items-center justify-center">
                    <Pill className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-900">Medications</h3>
                    <p className="text-sm text-gray-500">Click any cell to edit • Use Tab/Enter to navigate • Real-time updates</p>
                  </div>
                </div>

                <button
                  onClick={addNewRow}
                  className="flex items-center justify-center px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all shadow-lg hover:shadow-xl"
                >
                  <Plus className="w-5 h-5 mr-2" />
                  Add Medication
                </button>
              </div>
            </div>

            {/* Search and Filter */}
            <div className="px-6 py-4 border-b border-gray-100 bg-gray-50">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search medications by name, type, or dosage..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                  />
                </div>
                
                <div className="relative">
                  <button
                    onClick={() => setShowFilters(!showFilters)}
                    className="px-4 py-3 bg-white border border-gray-200 rounded-xl flex items-center space-x-2 hover:bg-gray-50 transition-all"
                  >
                    <Filter className="w-5 h-5 text-gray-400" />
                    <span className="text-sm text-gray-600">Filter by Status</span>
                    <ChevronDown className="w-4 h-4 text-gray-400" />
                  </button>
                  
                  {showFilters && (
                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-xl border border-gray-100 z-10">
                      {['all', 'taken', 'pending', 'missed'].map((status) => (
                        <button
                          key={status}
                          onClick={() => {
                            setFilterStatus(status);
                            setShowFilters(false);
                          }}
                          className={`w-full text-left px-4 py-3 text-sm hover:bg-gray-50 first:rounded-t-xl last:rounded-b-xl ${
                            filterStatus === status ? 'bg-blue-50 text-blue-600' : 'text-gray-700'
                          }`}
                        >
                          {status.charAt(0).toUpperCase() + status.slice(1)}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Medications Table */}
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Medication</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Dosage</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Frequency</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Time</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Type</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Last Taken</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-100">
                  {filteredRows.length > 0 ? (
                    filteredRows.map((row) => (
                      <tr 
                        key={row.id} 
                        className={`hover:bg-gray-50 transition-colors group ${
                          row.isNew ? 'bg-blue-50/50' : ''
                        }`}
                      >
                        <td className="px-6 py-4 whitespace-nowrap">
                          {getStatusBadge(row.status, row.takenTimes)}
                        </td>
                        {renderCell(row, 'name', row.name, 'Enter medication name')}
                        {renderCell(row, 'dosage', row.dosage, 'e.g., 10mg')}
                        {renderCell(row, 'frequency', row.frequency, 'Frequency')}
                        {renderCell(row, 'time', row.time, '08:00')}
                        {renderCell(row, 'type', row.type, 'Type')}
                        <td className="px-6 py-4">
                          {row.lastTaken ? (
                            <span className="text-sm text-gray-600">{row.lastTaken}</span>
                          ) : (
                            <span className="text-sm text-gray-400">Not taken yet</span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <button
                            onClick={() => confirmDelete(row)}
                            className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                            title="Delete medication"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={8} className="px-6 py-12 text-center">
                        <div className="flex flex-col items-center">
                          <Pill className="w-12 h-12 text-gray-300 mb-3" />
                          <p className="text-gray-500 font-medium mb-2">No medications found</p>
                          <p className="text-sm text-gray-400 mb-4">
                            {searchTerm ? 'Try adjusting your search' : 'Click the "Add Medication" button to get started'}
                          </p>
                          {!searchTerm && (
                            <button
                              onClick={addNewRow}
                              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                            >
                              Add Your First Medication
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </main>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && medicationToDelete && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowDeleteModal(false)} />
          <div className="relative min-h-screen flex items-center justify-center p-4">
            <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 animate-scaleIn">
              <div className="flex items-center space-x-3 text-red-600 mb-4">
                <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center">
                  <AlertTriangle className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold text-gray-900">Delete Medication</h3>
              </div>

              <p className="text-gray-600 mb-6">
                Are you sure you want to delete <span className="font-semibold text-gray-900">{medicationToDelete.name || 'this medication'}</span>? 
                This action cannot be undone.
              </p>

              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setShowDeleteModal(false)}
                  className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDelete}
                  disabled={loading}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center"
                >
                  {loading ? (
                    <>
                      <Loader className="w-4 h-4 animate-spin mr-2" />
                      Deleting...
                    </>
                  ) : (
                    'Delete'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

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
        
        @keyframes slideLeft {
          from {
            opacity: 0;
            transform: translateX(20px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
        
        @keyframes scaleIn {
          from {
            opacity: 0;
            transform: scale(0.9);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
        
        .animate-slideDown {
          animation: slideDown 0.3s ease-out;
        }
        
        .animate-slideLeft {
          animation: slideLeft 0.3s ease-out;
        }
        
        .animate-scaleIn {
          animation: scaleIn 0.2s ease-out;
        }
      `}</style>
    </div>
  );
};

export default CaretakerDashboard;