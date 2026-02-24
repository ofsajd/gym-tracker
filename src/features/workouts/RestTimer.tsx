import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Timer, X } from 'lucide-react';
import { useUIStore } from '@/stores/ui-store';
import { formatTimerSeconds } from '@/lib/utils';

export function RestTimer() {
  const { t } = useTranslation();
  const { activeWorkout, clearRestTimer, settings } = useUIStore();
  const [remaining, setRemaining] = useState(0);

  useEffect(() => {
    if (!activeWorkout.restTimerEnd) {
      setRemaining(0);
      return;
    }

    const update = () => {
      const diff = Math.max(0, activeWorkout.restTimerEnd! - Date.now());
      setRemaining(Math.ceil(diff / 1000));

      if (diff <= 0) {
        // Timer done
        if (settings.restTimerVibrate && 'vibrate' in navigator) {
          navigator.vibrate([200, 100, 200]);
        }
        if (settings.restTimerSound) {
          try {
            const ctx = new AudioContext();
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.frequency.value = 880;
            gain.gain.value = 0.3;
            osc.start();
            osc.stop(ctx.currentTime + 0.3);
          } catch {
            // ignore
          }
        }
        if (settings.pushNotifications && 'Notification' in window && Notification.permission === 'granted') {
          try {
            new Notification(t('workout.restTimerDone'), {
              body: t('workout.restTimerDoneBody'),
              icon: '/icon-192.png',
              tag: 'rest-timer',
            });
          } catch {
            // ignore
          }
        }
        clearRestTimer();
      }
    };

    update();
    const interval = setInterval(update, 100);
    return () => clearInterval(interval);
  }, [activeWorkout.restTimerEnd, clearRestTimer, settings]);

  if (!activeWorkout.restTimerEnd || remaining === 0) return null;

  const totalSeconds = settings.restTimerSeconds;
  const progress = ((totalSeconds - remaining) / totalSeconds) * 100;

  return (
    <div className="mx-4 my-2 bg-primary/10 rounded-xl p-3 relative overflow-hidden">
      <div
        className="absolute inset-y-0 left-0 bg-primary/20 transition-all duration-100"
        style={{ width: `${progress}%` }}
      />
      <div className="relative flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Timer className="h-5 w-5 text-primary" />
          <span className="text-sm font-medium">{t('workout.restTimer')}</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-2xl font-mono font-bold">{formatTimerSeconds(remaining)}</span>
          <button
            onClick={clearRestTimer}
            className="text-muted-foreground hover:text-foreground touch-manipulation"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
