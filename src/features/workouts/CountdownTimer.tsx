import { useState, useEffect, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Timer, Play, Square, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatTimerSeconds } from '@/lib/utils';

type Props = {
  onComplete?: (durationSeconds: number) => void;
};

const PRESETS = [30, 45, 60, 90, 120];

export function CountdownTimer({ onComplete }: Props) {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [duration, setDuration] = useState(60);
  const [remaining, setRemaining] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const startedAtRef = useRef<number>(0);
  const targetRef = useRef<number>(0);

  const start = useCallback(() => {
    startedAtRef.current = Date.now();
    targetRef.current = Date.now() + duration * 1000;
    setRemaining(duration);
    setIsRunning(true);
  }, [duration]);

  const stop = useCallback(() => {
    setIsRunning(false);
    const elapsed = Math.round((Date.now() - startedAtRef.current) / 1000);
    onComplete?.(elapsed);
    setRemaining(0);
  }, [onComplete]);

  const reset = useCallback(() => {
    setIsRunning(false);
    setRemaining(0);
  }, []);

  useEffect(() => {
    if (!isRunning) return;

    const interval = setInterval(() => {
      const diff = Math.max(0, Math.ceil((targetRef.current - Date.now()) / 1000));
      setRemaining(diff);

      if (diff <= 0) {
        setIsRunning(false);
        // Vibrate + sound
        if ('vibrate' in navigator) {
          navigator.vibrate([200, 100, 200, 100, 200]);
        }
        try {
          const ctx = new AudioContext();
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.frequency.value = 880;
          gain.gain.value = 0.3;
          osc.start();
          osc.stop(ctx.currentTime + 0.5);
        } catch {
          // ignore
        }
        const elapsed = Math.round(duration);
        onComplete?.(elapsed);
        clearInterval(interval);
      }
    }, 100);

    return () => clearInterval(interval);
  }, [isRunning, duration, onComplete]);

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium bg-secondary text-secondary-foreground hover:bg-accent transition-colors touch-manipulation"
      >
        <Timer className="h-3 w-3" />
        {t('workout.countdownTimer')}
      </button>
    );
  }

  const progress = duration > 0 ? ((duration - remaining) / duration) * 100 : 0;

  return (
    <div className="bg-secondary/50 rounded-lg p-3 space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Timer className="h-4 w-4 text-primary" />
          <span className="text-xs font-medium">{t('workout.countdownTimer')}</span>
        </div>
        <button
          onClick={() => { reset(); setIsOpen(false); }}
          className="text-xs text-muted-foreground"
        >
          ✕
        </button>
      </div>

      {!isRunning && remaining === 0 && (
        <div className="flex gap-1.5 flex-wrap">
          {PRESETS.map((sec) => (
            <button
              key={sec}
              onClick={() => setDuration(sec)}
              className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors touch-manipulation ${
                duration === sec
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-secondary text-secondary-foreground hover:bg-accent'
              }`}
            >
              {formatTimerSeconds(sec)}
            </button>
          ))}
        </div>
      )}

      {(isRunning || remaining > 0) && (
        <div className="relative">
          <div className="h-2 bg-secondary rounded-full overflow-hidden">
            <div
              className="h-full bg-primary transition-all duration-100 rounded-full"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="text-center mt-2">
            <span className="text-3xl font-mono font-bold">{formatTimerSeconds(remaining)}</span>
          </div>
        </div>
      )}

      <div className="flex gap-2">
        {!isRunning && remaining === 0 && (
          <Button size="sm" className="flex-1" onClick={start}>
            <Play className="h-3 w-3 mr-1" />
            {t('workout.startTimer')}
          </Button>
        )}
        {isRunning && (
          <Button size="sm" variant="destructive" className="flex-1" onClick={stop}>
            <Square className="h-3 w-3 mr-1" />
            {t('workout.stopTimer')}
          </Button>
        )}
        {!isRunning && remaining > 0 && (
          <>
            <Button size="sm" variant="outline" className="flex-1" onClick={reset}>
              <RotateCcw className="h-3 w-3 mr-1" />
              {t('common.reset')}
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
