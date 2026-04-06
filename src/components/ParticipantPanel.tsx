import { useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import VsRows from '@/components/VsRows';
import StreakCoinCard from '@/components/StreakCoinCard';

interface ParticipantPanelProps {
  name: string;
  charity: string;
  participantId: string;
  otherName: string;
  ownPcts: { sugarFree: number; sugar: number };
  otherPcts: { sugarFree: number; sugar: number };
  quarterStreak: number;
  totalStreak: number;
  bestStreak: number;
  otherQuarterStreak: number;
  initial: string;
  sugarItemsThisPeriod: number;
  disabled: boolean;
  disabledMessage: string;
  onLog: (participantId: string, type: 'SUGAR') => Promise<void>;
}

export default function ParticipantPanel({
  name,
  charity,
  participantId,
  otherName,
  ownPcts,
  otherPcts,
  quarterStreak,
  totalStreak,
  bestStreak,
  otherQuarterStreak,
  initial,
  sugarItemsThisPeriod,
  disabled,
  disabledMessage,
  onLog,
}: ParticipantPanelProps) {
  const sugarDebounceRef = useRef(false);

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

  const freeSugarAvailable = sugarItemsThisPeriod === 0;

  return (
    <div className="rounded-lg border border-border bg-card p-4 space-y-3">
      <div className="flex items-baseline justify-between">
        <h3 className="font-bold text-foreground text-base">
          {name} — <span className="text-muted-foreground font-normal text-sm">{charity}</span>
        </h3>
      </div>

      <StreakCoinCard
        name={name}
        initial={initial}
        quarterStreak={quarterStreak}
        totalStreak={totalStreak}
        bestStreak={bestStreak}
        otherQuarterStreak={otherQuarterStreak}
      />

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
            className="w-full justify-center border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground"
            onClick={handleSugar}
            aria-label={`Report ${name}'s sugar item`}
          >
            🔴 Report my Sugar Item
            {freeSugarAvailable && (
              <span className="ml-1 text-xs text-muted-foreground">(free this period)</span>
            )}
          </Button>
        </div>
      )}
    </div>
  );
}
