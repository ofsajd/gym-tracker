import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useLiveQuery } from 'dexie-react-hooks';
import { Check, Plus, Trash2, ChevronLeft, ChevronRight, X, TrendingUp, Minus, Equal, ArrowDown, Repeat } from 'lucide-react';
import { db } from '@/db/schema';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { PageHeader } from '@/components/layout/PageHeader';
import { RestTimer } from './RestTimer';
import { useUIStore } from '@/stores/ui-store';
import { generateId, convertWeight, convertToKg, formatDuration } from '@/lib/utils';
import { getWeightRecommendation, getLastSetsForExercise } from '@/lib/weight-recommendation';
import type { SetLog, ExerciseLog, WeightRecommendation, WeightUnit } from '@/types/models';

export function ActiveWorkout() {
  const { t } = useTranslation();
  const { activeWorkout, setActiveWorkout, clearActiveWorkout, startRestTimer, settings } = useUIStore();
  const [elapsed, setElapsed] = useState(0);
  const [showSummary, setShowSummary] = useState(false);

  const workoutLog = useLiveQuery(
    () => (activeWorkout.workoutLogId ? db.workoutLogs.get(activeWorkout.workoutLogId) : undefined),
    [activeWorkout.workoutLogId]
  );

  const exerciseLogs = useLiveQuery(
    () =>
      activeWorkout.workoutLogId
        ? db.exerciseLogs.where('workoutLogId').equals(activeWorkout.workoutLogId).sortBy('order')
        : [],
    [activeWorkout.workoutLogId]
  );

  // Elapsed timer
  useEffect(() => {
    if (!workoutLog?.startedAt) return;
    const interval = setInterval(() => {
      setElapsed(Date.now() - workoutLog.startedAt.getTime());
    }, 1000);
    return () => clearInterval(interval);
  }, [workoutLog?.startedAt]);

  // Wake lock
  useEffect(() => {
    let wakeLock: WakeLockSentinel | null = null;
    const requestWakeLock = async () => {
      try {
        if ('wakeLock' in navigator) {
          wakeLock = await navigator.wakeLock.request('screen');
        }
      } catch {
        // Silently fail
      }
    };
    requestWakeLock();
    return () => {
      wakeLock?.release();
    };
  }, []);

  const currentIndex = activeWorkout.currentExerciseIndex;
  const currentExerciseLog = exerciseLogs?.[currentIndex];
  const totalExercises = exerciseLogs?.length ?? 0;

  const handleFinish = useCallback(async () => {
    if (!activeWorkout.workoutLogId) return;
    await db.workoutLogs.update(activeWorkout.workoutLogId, {
      completedAt: new Date(),
    });
    setShowSummary(true);
  }, [activeWorkout.workoutLogId]);

  const handleDiscard = useCallback(async () => {
    if (!confirm(t('workout.discardConfirm'))) return;
    if (!activeWorkout.workoutLogId) return;

    // Delete all set logs
    const eLogs = await db.exerciseLogs
      .where('workoutLogId')
      .equals(activeWorkout.workoutLogId)
      .toArray();
    for (const el of eLogs) {
      await db.setLogs.where('exerciseLogId').equals(el.id).delete();
    }
    await db.exerciseLogs.where('workoutLogId').equals(activeWorkout.workoutLogId).delete();
    await db.workoutLogs.delete(activeWorkout.workoutLogId);
    clearActiveWorkout();
  }, [activeWorkout.workoutLogId, clearActiveWorkout, t]);

  const handleCloseSummary = () => {
    setShowSummary(false);
    clearActiveWorkout();
  };

  if (showSummary && activeWorkout.workoutLogId) {
    return <WorkoutSummary workoutLogId={activeWorkout.workoutLogId} onClose={handleCloseSummary} />;
  }

  return (
    <div>
      <PageHeader
        title={t('workout.activeWorkout')}
        action={
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={handleDiscard}>
              <X className="h-4 w-4" />
            </Button>
            <Button variant="success" size="sm" onClick={handleFinish}>
              <Check className="h-4 w-4 mr-1" />
              {t('workout.finishWorkout')}
            </Button>
          </div>
        }
      />

      {/* Timer bar */}
      <div className="px-4 py-2 flex items-center justify-between text-sm border-b bg-card">
        <span className="text-muted-foreground">{t('workout.duration')}</span>
        <span className="font-mono font-semibold">{formatDuration(elapsed)}</span>
      </div>

      {/* Rest timer */}
      <RestTimer />

      {/* Exercise navigation */}
      <div className="flex items-center justify-between px-4 py-3">
        <Button
          variant="ghost"
          size="icon-sm"
          disabled={currentIndex === 0}
          onClick={() => setActiveWorkout({ currentExerciseIndex: currentIndex - 1 })}
        >
          <ChevronLeft className="h-5 w-5" />
        </Button>
        <span className="text-sm font-medium">
          {currentIndex + 1} / {totalExercises}
        </span>
        <Button
          variant="ghost"
          size="icon-sm"
          disabled={currentIndex >= totalExercises - 1}
          onClick={() => setActiveWorkout({ currentExerciseIndex: currentIndex + 1 })}
        >
          <ChevronRight className="h-5 w-5" />
        </Button>
      </div>

      {/* Current exercise */}
      {currentExerciseLog && (
        <ExerciseCard
          exerciseLog={currentExerciseLog}
          onSetLogged={() => {
            const restSeconds = settings.restTimerSeconds;
            startRestTimer(restSeconds);
          }}
        />
      )}
    </div>
  );
}

function ExerciseCard({
  exerciseLog,
  onSetLogged,
}: {
  exerciseLog: ExerciseLog;
  onSetLogged: () => void;
}) {
  const { t } = useTranslation();
  const { settings } = useUIStore();
  // Per-exercise weight unit override
  const [localUnit, setLocalUnit] = useState<WeightUnit>(settings.weightUnit);
  const toggleUnit = () => setLocalUnit((u) => (u === 'kg' ? 'lbs' : 'kg'));

  const exercise = useLiveQuery(
    () => db.exercises.get(exerciseLog.exerciseId),
    [exerciseLog.exerciseId]
  );

  const setLogs = useLiveQuery(
    () => db.setLogs.where('exerciseLogId').equals(exerciseLog.id).sortBy('setNumber'),
    [exerciseLog.id]
  );

  const [recommendation, setRecommendation] = useState<WeightRecommendation | null>(null);
  const [lastSets, setLastSets] = useState<SetLog[]>([]);

  // Get planned exercise config
  const plannedExercise = useLiveQuery(async () => {
    // Find the workout log to get dayId
    const workoutLog = await db.workoutLogs.get(exerciseLog.workoutLogId);
    if (!workoutLog?.dayId) return null;
    return db.plannedExercises
      .where('dayId')
      .equals(workoutLog.dayId)
      .and((pe) => pe.exerciseId === exerciseLog.exerciseId)
      .first();
  }, [exerciseLog.workoutLogId, exerciseLog.exerciseId]);

  useEffect(() => {
    getWeightRecommendation(exerciseLog.exerciseId, plannedExercise?.targetReps ?? '8-12').then(setRecommendation);
    getLastSetsForExercise(exerciseLog.exerciseId).then(setLastSets);
  }, [exerciseLog.exerciseId, plannedExercise?.targetReps]);

  const exerciseName = exercise
    ? exercise.isCustom
      ? exercise.nameKey
      : t(exercise.nameKey)
    : '...';

  const handleAddSet = async () => {
    const nextNumber = (setLogs?.length ?? 0) + 1;
    const recWeight = recommendation?.weight ?? lastSets[0]?.weight ?? plannedExercise?.initialWeight ?? 0;

    await db.setLogs.add({
      id: generateId(),
      exerciseLogId: exerciseLog.id,
      setNumber: nextNumber,
      weight: recWeight,
      reps: parseInt(plannedExercise?.targetReps?.split('-')[0] ?? '8', 10) || 8,
      isWarmup: false,
      completedAt: new Date(),
    });

    onSetLogged();
  };

  const handleUpdateSet = async (setId: string, updates: Partial<SetLog>) => {
    await db.setLogs.update(setId, updates);
  };

  const handleDeleteSet = async (setId: string) => {
    await db.setLogs.delete(setId);
  };

  const directionIcon = {
    increase: <TrendingUp className="h-3 w-3 text-success" />,
    maintain: <Equal className="h-3 w-3 text-warning" />,
    deload: <ArrowDown className="h-3 w-3 text-destructive" />,
  };

  return (
    <div className="px-4 space-y-3">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">{exerciseName}</CardTitle>
          {plannedExercise && (
            <p className="text-xs text-muted-foreground">
              {plannedExercise.targetSets} × {plannedExercise.targetReps}{' '}
              {plannedExercise.restSeconds && `• ${plannedExercise.restSeconds}${t('common.seconds')} ${t('common.rest').toLowerCase()}`}
            </p>
          )}
          {recommendation && (
            <div className="flex items-center gap-2 mt-1">
              <Badge variant={recommendation.direction === 'increase' ? 'success' : recommendation.direction === 'deload' ? 'destructive' : 'warning'}>
                {directionIcon[recommendation.direction]}
                <span className="ml-1">
                  {t('workout.recommended')}: {convertWeight(recommendation.weight, localUnit)} {localUnit}
                </span>
              </Badge>
            </div>
          )}
        </CardHeader>

        <CardContent className="space-y-2">
          {/* Unit toggle */}
          <div className="flex justify-end">
            <button
              onClick={toggleUnit}
              className="flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium bg-secondary text-secondary-foreground hover:bg-accent transition-colors touch-manipulation"
              title={t('workout.switchUnit')}
            >
              <Repeat className="h-3 w-3" />
              {localUnit.toUpperCase()}
            </button>
          </div>

          {/* Previous session info */}
          {lastSets.length > 0 && (
            <div className="bg-secondary/50 rounded-lg p-2 mb-2">
              <p className="text-xs text-muted-foreground mb-1">{t('workout.previousWeight')}:</p>
              <div className="flex gap-2 flex-wrap">
                {lastSets.filter((s) => !s.isWarmup).map((s) => (
                  <span key={s.id} className="text-xs font-mono bg-secondary px-2 py-0.5 rounded">
                    {convertWeight(s.weight, localUnit)}{localUnit} × {s.reps}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Set logs */}
          <div className="space-y-1.5">
            {/* Header */}
            <div className="grid grid-cols-[32px_1fr_1fr_1fr_32px] gap-2 text-xs text-muted-foreground px-1">
              <span>#</span>
              <span>{t('common.weight')}</span>
              <span>{t('common.reps')}</span>
              <span className="text-center">{t('workout.type')}</span>
              <span></span>
            </div>

            {setLogs?.map((set) => (
              <SetRow
                key={set.id}
                set={set}
                weightUnit={localUnit}
                onUpdate={(updates) => handleUpdateSet(set.id, updates)}
                onDelete={() => handleDeleteSet(set.id)}
              />
            ))}
          </div>

          <Button variant="outline" size="sm" className="w-full" onClick={handleAddSet}>
            <Plus className="h-4 w-4 mr-1" />
            {t('workout.addSet')}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

function SetRow({
  set,
  weightUnit,
  onUpdate,
  onDelete,
}: {
  set: SetLog;
  weightUnit: 'kg' | 'lbs';
  onUpdate: (updates: Partial<SetLog>) => void;
  onDelete: () => void;
}) {
  const { t } = useTranslation();
  const displayWeight = convertWeight(set.weight, weightUnit);
  const [weightInput, setWeightInput] = useState(String(displayWeight));
  const [repsInput, setRepsInput] = useState(String(set.reps));

  return (
    <div
      className={`grid grid-cols-[32px_1fr_1fr_1fr_32px] gap-2 items-center p-1 rounded ${
        set.isWarmup ? 'opacity-60' : ''
      }`}
    >
      <span className="text-sm font-mono text-muted-foreground text-center">{set.setNumber}</span>

      {/* Weight with steppers */}
      <div className="flex items-center gap-0.5">
        <button
          className="h-8 w-7 flex items-center justify-center rounded bg-secondary text-xs font-semibold active:bg-accent touch-manipulation"
          onClick={() => {
            const newVal = Math.max(0, parseFloat(weightInput) - 2.5);
            setWeightInput(String(newVal));
            onUpdate({ weight: convertToKg(newVal, weightUnit) });
          }}
        >
          <Minus className="h-3 w-3" />
        </button>
        <input
          type="text"
          inputMode="decimal"
          value={weightInput}
          onChange={(e) => setWeightInput(e.target.value)}
          onBlur={() => {
            const val = parseFloat(weightInput) || 0;
            setWeightInput(String(val));
            onUpdate({ weight: convertToKg(val, weightUnit) });
          }}
          className="h-8 w-14 text-center text-sm font-mono bg-secondary rounded px-0.5"
        />
        <button
          className="h-8 w-7 flex items-center justify-center rounded bg-secondary text-xs font-semibold active:bg-accent touch-manipulation"
          onClick={() => {
            const newVal = parseFloat(weightInput) + 2.5;
            setWeightInput(String(newVal));
            onUpdate({ weight: convertToKg(newVal, weightUnit) });
          }}
        >
          <Plus className="h-3 w-3" />
        </button>
      </div>

      {/* Reps with steppers */}
      <div className="flex items-center gap-0.5">
        <button
          className="h-8 w-7 flex items-center justify-center rounded bg-secondary text-xs font-semibold active:bg-accent touch-manipulation"
          onClick={() => {
            const newVal = Math.max(0, parseInt(repsInput, 10) - 1);
            setRepsInput(String(newVal));
            onUpdate({ reps: newVal });
          }}
        >
          <Minus className="h-3 w-3" />
        </button>
        <input
          type="text"
          inputMode="numeric"
          value={repsInput}
          onChange={(e) => setRepsInput(e.target.value)}
          onBlur={() => {
            const val = parseInt(repsInput, 10) || 0;
            setRepsInput(String(val));
            onUpdate({ reps: val });
          }}
          className="h-8 w-10 text-center text-sm font-mono bg-secondary rounded px-0.5"
        />
        <button
          className="h-8 w-7 flex items-center justify-center rounded bg-secondary text-xs font-semibold active:bg-accent touch-manipulation"
          onClick={() => {
            const newVal = parseInt(repsInput, 10) + 1;
            setRepsInput(String(newVal));
            onUpdate({ reps: newVal });
          }}
        >
          <Plus className="h-3 w-3" />
        </button>
      </div>

      {/* Warmup toggle */}
      <button
        className={`h-8 text-xs rounded px-2 touch-manipulation ${
          set.isWarmup ? 'bg-warning/20 text-warning' : 'bg-secondary text-muted-foreground'
        }`}
        onClick={() => onUpdate({ isWarmup: !set.isWarmup })}
        title={set.isWarmup ? t('workout.warmupShort') : t('workout.workingSet')}
      >
        {set.isWarmup ? t('workout.warmupShort') : t('workout.workingSet')}
      </button>

      {/* Delete */}
      <button
        className="h-8 w-8 flex items-center justify-center text-muted-foreground hover:text-destructive touch-manipulation"
        onClick={onDelete}
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

function WorkoutSummary({ workoutLogId, onClose }: { workoutLogId: string; onClose: () => void }) {
  const { t } = useTranslation();
  const { settings } = useUIStore();

  const workoutLog = useLiveQuery(() => db.workoutLogs.get(workoutLogId), [workoutLogId]);
  const exerciseLogs = useLiveQuery(
    () => db.exerciseLogs.where('workoutLogId').equals(workoutLogId).sortBy('order'),
    [workoutLogId]
  );

  const [stats, setStats] = useState({ totalSets: 0, totalVolume: 0 });

  useEffect(() => {
    if (!exerciseLogs) return;
    (async () => {
      let totalSets = 0;
      let totalVolume = 0;
      for (const el of exerciseLogs) {
        const sets = await db.setLogs.where('exerciseLogId').equals(el.id).toArray();
        const working = sets.filter((s) => !s.isWarmup);
        totalSets += working.length;
        totalVolume += working.reduce((sum, s) => sum + s.weight * s.reps, 0);
      }
      setStats({ totalSets, totalVolume });
    })();
  }, [exerciseLogs]);

  const duration = workoutLog?.startedAt && workoutLog?.completedAt
    ? workoutLog.completedAt.getTime() - workoutLog.startedAt.getTime()
    : 0;

  return (
    <div>
      <PageHeader title={t('workout.summary')} />
      <div className="p-4 space-y-4">
        <div className="grid grid-cols-3 gap-3">
          <Card>
            <CardContent className="p-3 text-center">
              <p className="text-2xl font-bold">{formatDuration(duration)}</p>
              <p className="text-xs text-muted-foreground">{t('workout.duration')}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 text-center">
              <p className="text-2xl font-bold">{stats.totalSets}</p>
              <p className="text-xs text-muted-foreground">{t('workout.totalSets')}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 text-center">
              <p className="text-2xl font-bold">
                {convertWeight(stats.totalVolume, settings.weightUnit).toLocaleString()}
              </p>
              <p className="text-xs text-muted-foreground">
                {t('workout.totalVolume')} ({settings.weightUnit})
              </p>
            </CardContent>
          </Card>
        </div>

        <Button className="w-full" size="lg" onClick={onClose}>
          {t('common.done')}
        </Button>
      </div>
    </div>
  );
}
