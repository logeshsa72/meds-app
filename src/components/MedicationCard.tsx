// src/components/MedicationCard.tsx
import React from 'react';
import { Medication } from '../types';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { formatTime } from '../lib/utils';
import { Clock, CheckCircle, AlertCircle } from 'lucide-react';

interface MedicationCardProps {
  medication: Medication;
  onMarkAsTaken: (id: string) => void;
  onDelete: (id: string) => void;
  isMarking?: boolean;
  isDeleting?: boolean;
}

const MedicationCard: React.FC<MedicationCardProps> = ({
  medication,
  onMarkAsTaken,
  onDelete,
  isMarking,
  isDeleting,
}) => {
  const isLate = !medication.takenToday && medication.time < new Date().toTimeString().slice(0, 5);

  return (
    <Card className={cn(
      'transition-all',
      medication.takenToday && 'bg-green-50 border-green-200',
      isLate && 'border-red-300 bg-red-50'
    )}>
      <CardHeader>
        <CardTitle className="flex justify-between items-center">
          <span>{medication.name}</span>
          <span className="text-sm font-normal text-gray-600">{medication.dosage}</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <div className="flex items-center text-sm text-gray-600">
            <Clock className="w-4 h-4 mr-2" />
            <span>Every {medication.frequency} at {formatTime(medication.time)}</span>
          </div>
          {medication.takenToday ? (
            <div className="flex items-center text-sm text-green-600">
              <CheckCircle className="w-4 h-4 mr-2" />
              <span>Taken today at {medication.lastTaken ? new Date(medication.lastTaken).toLocaleTimeString() : ''}</span>
            </div>
          ) : (
            <div className="flex items-center text-sm text-yellow-600">
              <AlertCircle className="w-4 h-4 mr-2" />
              <span>Not taken today</span>
            </div>
          )}
        </div>
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onDelete(medication.id)}
          disabled={isDeleting}
        >
          Delete
        </Button>
        <Button
          variant={medication.takenToday ? 'outline' : 'default'}
          size="sm"
          onClick={() => onMarkAsTaken(medication.id)}
          disabled={medication.takenToday || isMarking}
        >
          {medication.takenToday ? 'Taken' : 'Mark as Taken'}
        </Button>
      </CardFooter>
    </Card>
  );
};

export default MedicationCard;