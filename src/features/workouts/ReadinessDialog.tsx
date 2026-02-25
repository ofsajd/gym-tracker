import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Moon, Zap } from 'lucide-react';
import { Dialog, DialogHeader } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

type Props = {
  open: boolean;
  onSubmit: (data: { energy: number; sleep: number }) => void;
  onSkip: () => void;
};

function StarRating({ value, onChange, icon: Icon }: {
  value: number;
  onChange: (v: number) => void;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          onClick={() => onChange(n)}
          className={`h-10 w-10 rounded-lg flex items-center justify-center transition-colors touch-manipulation ${
            n <= value
              ? 'bg-primary text-primary-foreground'
              : 'bg-secondary text-muted-foreground hover:bg-accent'
          }`}
        >
          <Icon className="h-5 w-5" />
        </button>
      ))}
    </div>
  );
}

export function ReadinessDialog({ open, onSubmit, onSkip }: Props) {
  const { t } = useTranslation();
  const [energy, setEnergy] = useState(3);
  const [sleep, setSleep] = useState(3);

  if (!open) return null;

  return (
    <Dialog open onClose={onSkip}>
      <DialogHeader onClose={onSkip}>{t('workout.readinessCheck')}</DialogHeader>
      <div className="p-4 space-y-4">
        <p className="text-sm text-muted-foreground text-center">
          {t('workout.readinessDesc')}
        </p>

        <div className="space-y-3">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-warning" />
              <label className="text-sm font-medium">{t('workout.energyLevel')}</label>
            </div>
            <StarRating value={energy} onChange={setEnergy} icon={Zap} />
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <Moon className="h-4 w-4 text-primary" />
              <label className="text-sm font-medium">{t('workout.sleepQuality')}</label>
            </div>
            <StarRating value={sleep} onChange={setSleep} icon={Moon} />
          </div>
        </div>

        <div className="flex gap-2">
          <Button variant="outline" className="flex-1" onClick={onSkip}>
            {t('common.skip')}
          </Button>
          <Button className="flex-1" onClick={() => onSubmit({ energy, sleep })}>
            {t('workout.startWorkout')}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
