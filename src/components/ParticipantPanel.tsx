import { useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import VsRows from '@/components/VsRows';

interface ParticipantPanelProps {
  name: string;
  charity: string;
  participantId: string;
  otherName: string;
  ownPcts: { sugarFree: number; sugar: number; freeDay: number };
  otherPcts: { sugarFree: number; sugar: number; freeDay: number };
  freeDayUsedToday: boolean;
  freeDaysRemaining: number;
  disabled: boolean;
  disabledMessage: string;
  onLog: (participantId: string, type: 'SUGAR' | 'FREE_DAY') => Promise<void>;
}

export default function ParticipantPanel({
  name,
  charity,
  participantId,
  otherName,
  ownPcts,
  otherPcts,
  freeDayUsedToday,
  freeDaysRemaining,
  disabled,
  disabledMessage,
  onLog,
}: ParticipantPanelProps) {
  const sugarDebounceRef = useRef(false);

  const handleFreeDay = useCallback(async () => {
    if (disabled || freeDayUsedToday || freeDaysRemaining <= 0) return;
    await onLog(participantId, 'FREE_DAY');
  }, [disabled, freeDayUsedToday, freeDaysRemaining, participantId, onLog]);

  const handleSugar = useCallback(async () => {
    if (disabled || sugarDebounceRef.current) return;
    sugarDebounceRef.current = true;
    try {
      await onLog(participantId, 'SUGAR');
    } finally {
      setTimeout(() => {
        sugarDebounceRef.current = false;
      }, 2000);
    }
  }, [disabled, participantId, onLog]);

  return (
    <div className="rounded-lg border border-border bg-card p-4 space-y-3">
      <div className="flex items-baseline justify-between">
        <h3 className="font-bold text-foreground text-base">
          {name} — <span className="text-muted-foreground font-normal text-sm">{charity}</span>
        </h3>
      </div>

      <VsRows
        ownName={name}
        otherName={otherName}
        ownPcts={ownPcts}
        otherPcts={otherPcts}
      />

      {disabled ? (
        <p className="text-sm text-muted-foreground text-center py-2">{disabledMessage}</p>
      ) : (
        <div className="flex flex-col gap-2">
          <Button
            variant="outline"
            className="w-full justify-center border-success text-success hover:bg-success hover:text-success-foreground"
            onClick={handleFreeDay}
            disabled={freeDayUsedToday || freeDaysRemaining <= 0}
            aria-label={`Report ${name}'s free day`}
          >
            🟢 Report my Free Day
            {freeDayUsedToday && <span className="ml-1 text-xs">(used today)</span>}
          </Button>
          <Button
            variant="outline"
            className="w-full justify-center border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground"
            onClick={handleSugar}
            aria-label={`Report ${name}'s sugar item`}
          >
            🔴 Report my Sugar Item
          </Button>
        </div>
      )}
    </div>
  );
}
