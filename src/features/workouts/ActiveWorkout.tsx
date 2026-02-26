import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useLiveQuery } from 'dexie-react-hooks';
import { Check, Plus, Trash2, ChevronLeft, ChevronRight, X, TrendingUp, Minus, Equal, ArrowDown, Repeat, AlertTriangle, Trophy, ArrowLeftRight, Link2 } from 'lucide-react';
import { db } from '@/db/schema';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogHeader } from '@/components/ui/dialog';
import { PageHeader } from '@/components/layout/PageHeader';
import { RestTimer } from './RestTimer';
import { CountdownTimer } from './CountdownTimer';
import { ShareWorkoutButton } from './ShareWorkoutButton';
import { useUIStore } from '@/stores/ui-store';
import { generateId, convertWeight, convertToKg, formatDuration } from '@/lib/utils';
import { getWeightRecommendation, getLastSetsForExercise } from '@/lib/weight-recommendation';
import type { SetLog, ExerciseLog, WeightRecommendation, WeightUnit } from '@/types/models';

export function ActiveWorkout() {
  const { t } = useTranslation();
  const { activeWorkout, setActiveWorkout, clearActiveWorkout, startRestTimer, settings } = useUIStore();
  const [elapsed, setElapsed] = useState(0);
  const [showSummary, setShowSummary] = useState(false);
  const [showFinishConfirm, setShowFinishConfirm] = useState(false);
  const [skippedExercises, setSkippedExercises] = useState<string[]>([]);

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

  // Mark exercise as started when navigated to
  useEffect(() => {
    const el = exerciseLogs?.[activeWorkout.currentExerciseIndex];
    if (el && !el.startedAt) {
      db.exerciseLogs.update(el.id, { startedAt: new Date() });
    }
  }, [activeWorkout.currentExerciseIndex, exerciseLogs]);

  const currentIndex = activeWorkout.currentExerciseIndex;
  const currentExerciseLog = exerciseLogs?.[currentIndex];
  const totalExercises = exerciseLogs?.length ?? 0;

  // Check which exercises are completed (have sets) and which are skipped/partial
  const getExerciseCompletionInfo = useCallback(async () => {
    if (!exerciseLogs) return { incomplete: [] as string[], allDone: false };
    const incomplete: string[] = [];
    
    // Get the workout to find planned exercises
    const wl = activeWorkout.workoutLogId ? await db.workoutLogs.get(activeWorkout.workoutLogId) : null;
    
    for (const el of exerciseLogs) {
      const setCount = await db.setLogs.where('exerciseLogId').equals(el.id).count();
      
      // Look up target sets from planned exercise
      let targetSets = 0;
      if (wl?.dayId) {
        const pe = await db.plannedExercises
          .where('dayId').equals(wl.dayId)
          .and((p) => p.exerciseId === el.exerciseId)
          .first();
        targetSets = pe?.targetSets ?? 0;
      }
      
      const isSkipped = setCount === 0;
      const isPartial = targetSets > 0 && setCount > 0 && setCount < targetSets;
      
      if (isSkipped || isPartial) {
        const exercise = await db.exercises.get(el.exerciseId);
        const name = exercise
          ? exercise.isCustom ? exercise.nameKey : t(exercise.nameKey)
          : el.exerciseId;
        if (isSkipped) {
          incomplete.push(name);
        } else {
          incomplete.push(`${name} (${setCount}/${targetSets})`);
        }
      }
    }
    return { incomplete, allDone: incomplete.length === 0 };
  }, [exerciseLogs, activeWorkout.workoutLogId, t]);

  // Find the first skipped or partially completed exercise index
  const findFirstSkippedIndex = useCallback(async (): Promise<number> => {
    if (!exerciseLogs) return -1;
    const wl = activeWorkout.workoutLogId ? await db.workoutLogs.get(activeWorkout.workoutLogId) : null;
    
    for (let i = 0; i < exerciseLogs.length; i++) {
      const el = exerciseLogs[i];
      if (!el.completedAt) {
        const setCount = await db.setLogs.where('exerciseLogId').equals(el.id).count();
        if (setCount === 0) return i;
        
        // Also return partial exercises
        if (wl?.dayId) {
          const pe = await db.plannedExercises
            .where('dayId').equals(wl.dayId)
            .and((p) => p.exerciseId === el.exerciseId)
            .first();
          if (pe && pe.targetSets > 0 && setCount < pe.targetSets) return i;
        }
      }
    }
    return -1;
  }, [exerciseLogs, activeWorkout.workoutLogId]);

  // Auto-advance: when an exercise reaches target sets, mark it complete and move to next
  const handleExerciseCompleted = useCallback(async () => {
    const el = exerciseLogs?.[currentIndex];
    if (el && !el.completedAt) {
      await db.exerciseLogs.update(el.id, { completedAt: new Date() });
    }

    // Check if there's a next exercise
    if (currentIndex < totalExercises - 1) {
      setActiveWorkout({ currentExerciseIndex: currentIndex + 1 });
    } else {
      // Last exercise done — check for skipped ones
      const skippedIdx = await findFirstSkippedIndex();
      if (skippedIdx >= 0) {
        // Navigate to skipped exercise
        setActiveWorkout({ currentExerciseIndex: skippedIdx });
      } else {
        // All done — show finish prompt
        handleFinishRequest();
      }
    }
  }, [exerciseLogs, currentIndex, totalExercises, setActiveWorkout, findFirstSkippedIndex]);

  const handleFinishRequest = useCallback(async () => {
    const info = await getExerciseCompletionInfo();
    if (!info.allDone) {
      setSkippedExercises(info.incomplete);
      setShowFinishConfirm(true);
    } else {
      // All exercises done, show all-done confirm
      setSkippedExercises([]);
      setShowFinishConfirm(true);
    }
  }, [getExerciseCompletionInfo]);

  const handleConfirmFinish = useCallback(async () => {
    if (!activeWorkout.workoutLogId) return;
    // Mark any un-completed exercise logs
    if (exerciseLogs) {
      for (const el of exerciseLogs) {
        if (!el.completedAt) {
          const setCount = await db.setLogs.where('exerciseLogId').equals(el.id).count();
          if (setCount > 0) {
            await db.exerciseLogs.update(el.id, { completedAt: new Date() });
          }
        }
      }
    }
    await db.workoutLogs.update(activeWorkout.workoutLogId, {
      completedAt: new Date(),
    });
    setShowFinishConfirm(false);
    setShowSummary(true);
  }, [activeWorkout.workoutLogId, exerciseLogs]);

  const handleDiscard = useCallback(async () => {
    if (!confirm(t('workout.discardConfirm'))) return;
    if (!activeWorkout.workoutLogId) return;

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
            <Button variant="success" size="sm" onClick={handleFinishRequest}>
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

      {/* Exercise navigation with completion dots */}
      <div className="flex items-center justify-between px-4 py-3">
        <Button
          variant="ghost"
          size="icon-sm"
          disabled={currentIndex === 0}
          onClick={() => setActiveWorkout({ currentExerciseIndex: currentIndex - 1 })}
        >
          <ChevronLeft className="h-5 w-5" />
        </Button>
        <div className="flex items-center gap-1.5">
          {exerciseLogs?.map((el, i) => (
            <button
              key={el.id}
              onClick={() => setActiveWorkout({ currentExerciseIndex: i })}
              className={`h-2.5 rounded-full transition-all touch-manipulation ${
                i === currentIndex
                  ? 'w-6 bg-primary'
                  : el.completedAt
                    ? 'w-2.5 bg-success'
                    : 'w-2.5 bg-muted-foreground/30'
              }`}
            />
          ))}
        </div>
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
          onSetLogged={(restSeconds) => {
            // Check if current exercise is part of a superset — skip rest timer if next is same group
            const nextLog = exerciseLogs?.[currentIndex + 1];
            if (
              currentExerciseLog.supersetGroup &&
              nextLog?.supersetGroup === currentExerciseLog.supersetGroup
            ) {
              // Same superset group — advance to next exercise without rest
              setActiveWorkout({ currentExerciseIndex: currentIndex + 1 });
            } else {
              startRestTimer(restSeconds ?? settings.restTimerSeconds);
            }
          }}
          onExerciseCompleted={handleExerciseCompleted}
          isInSuperset={!!currentExerciseLog.supersetGroup}
        />
      )}

      {/* Finish confirmation dialog */}
      {showFinishConfirm && (
        <Dialog open onClose={() => setShowFinishConfirm(false)}>
          <DialogHeader onClose={() => setShowFinishConfirm(false)}>
            {t('workout.finishWorkout')}
          </DialogHeader>
          <div className="p-4 space-y-4">
            {skippedExercises.length > 0 ? (
              <>
                <div className="flex items-start gap-3 p-3 rounded-lg bg-warning/10 border border-warning/20">
                  <AlertTriangle className="h-5 w-5 text-warning shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium">{t('workout.incompleteWarning')}</p>
                    <ul className="text-xs text-muted-foreground mt-1 space-y-0.5">
                      {skippedExercises.map((name, i) => (
                        <li key={i}>• {name}</li>
                      ))}
                    </ul>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" className="flex-1" onClick={() => setShowFinishConfirm(false)}>
                    {t('workout.goBack')}
                  </Button>
                  <Button variant="destructive" className="flex-1" onClick={handleConfirmFinish}>
                    {t('workout.finishAnyway')}
                  </Button>
                </div>
              </>
            ) : (
              <>
                <div className="text-center space-y-2">
                  <div className="h-14 w-14 mx-auto rounded-full bg-success/20 flex items-center justify-center">
                    <Check className="h-7 w-7 text-success" />
                  </div>
                  <p className="font-medium">{t('workout.allExercisesDone')}</p>
                  <p className="text-sm text-muted-foreground">{t('workout.confirmFinish')}</p>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" className="flex-1" onClick={() => setShowFinishConfirm(false)}>
                    {t('workout.keepGoing')}
                  </Button>
                  <Button variant="success" className="flex-1" onClick={handleConfirmFinish}>
                    {t('workout.finishWorkout')}
                  </Button>
                </div>
              </>
            )}
          </div>
        </Dialog>
      )}
    </div>
  );
}

function ExerciseCard({
  exerciseLog,
  onSetLogged,
  onExerciseCompleted,
  isInSuperset,
}: {
  exerciseLog: ExerciseLog;
  onSetLogged: (restSeconds?: number) => void;
  onExerciseCompleted: () => void;
  isInSuperset?: boolean;
}) {
  const { t } = useTranslation();
  const { settings } = useUIStore();
  // Per-exercise weight unit override
  const [localUnit, setLocalUnit] = useState<WeightUnit>(settings.weightUnit);
  const toggleUnit = () => setLocalUnit((u) => (u === 'kg' ? 'lbs' : 'kg'));
  const [showSwapDialog, setShowSwapDialog] = useState(false);

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
    getWeightRecommendation(exerciseLog.exerciseId, plannedExercise?.targetReps ?? '8-12', plannedExercise?.defaultProgression).then(setRecommendation);
    getLastSetsForExercise(exerciseLog.exerciseId).then(setLastSets);
  }, [exerciseLog.exerciseId, plannedExercise?.targetReps, plannedExercise?.defaultProgression]);

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

    onSetLogged(plannedExercise?.restSeconds);

    // Auto-advance if target sets reached
    const targetSets = plannedExercise?.targetSets ?? 0;
    if (targetSets > 0 && nextNumber >= targetSets) {
      // Short delay so the user sees the set was added
      setTimeout(() => onExerciseCompleted(), 600);
    }
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
          <div className="flex items-center gap-2">
            <CardTitle className="text-base">{exerciseName}</CardTitle>
            {isInSuperset && (
              <Badge variant="secondary" className="text-[10px] gap-0.5">
                <Link2 className="h-3 w-3" />
                Superset
              </Badge>
            )}
          </div>
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
          {/* Unit toggle + swap */}
          <div className="flex justify-between">
            <button
              onClick={() => setShowSwapDialog(true)}
              className="flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium bg-secondary text-secondary-foreground hover:bg-accent transition-colors touch-manipulation"
              title={t('workout.swapExercise')}
            >
              <ArrowLeftRight className="h-3 w-3" />
              {t('workout.swapExercise')}
            </button>
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
                weightStep={plannedExercise?.defaultProgression
                  ? convertWeight(plannedExercise.defaultProgression, localUnit)
                  : 2.5
                }
              />
            ))}
          </div>

          {/* Countdown timer for isometrics */}
          <CountdownTimer
            onComplete={(seconds) => {
              // Auto-log a time-based set
              db.setLogs.add({
                id: generateId(),
                exerciseLogId: exerciseLog.id,
                setNumber: (setLogs?.length ?? 0) + 1,
                weight: 0,
                reps: seconds,
                isWarmup: false,
                completedAt: new Date(),
                isTimeBased: true,
              });
            }}
          />

          {(() => {
            const workingSetsCount = setLogs?.filter((s) => !s.isWarmup).length ?? 0;
            const targetSets = plannedExercise?.targetSets ?? 0;
            const allSetsDone = targetSets > 0 && workingSetsCount >= targetSets;
            return (
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={handleAddSet}
                disabled={allSetsDone}
              >
                <Plus className="h-4 w-4 mr-1" />
                {allSetsDone ? t('workout.exerciseComplete') : t('workout.addSet')}
                {plannedExercise && (
                  <span className="ml-1 text-muted-foreground">
                    ({workingSetsCount}/{plannedExercise.targetSets})
                  </span>
                )}
              </Button>
            );
          })()}

          {exerciseLog.completedAt && (
            <div className="flex items-center justify-center gap-1.5 text-xs text-success font-medium pt-1">
              <Check className="h-3.5 w-3.5" />
              {t('workout.exerciseComplete')}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Swap exercise dialog */}
      {showSwapDialog && (
        <SwapExerciseDialog
          currentExerciseId={exerciseLog.exerciseId}
          exerciseLogId={exerciseLog.id}
          primaryMuscleId={exercise?.muscleGroupIds[0]}
          onSwapped={() => setShowSwapDialog(false)}
          onClose={() => setShowSwapDialog(false)}
        />
      )}
    </div>
  );
}

function SwapExerciseDialog({
  currentExerciseId,
  exerciseLogId,
  primaryMuscleId,
  onSwapped,
  onClose,
}: {
  currentExerciseId: string;
  exerciseLogId: string;
  primaryMuscleId?: string;
  onSwapped: () => void;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const [search, setSearch] = useState('');

  const exercises = useLiveQuery(async () => {
    let all = await db.exercises.toArray();
    // Prefer same muscle group
    if (primaryMuscleId) {
      all.sort((a, b) => {
        const aMatch = a.muscleGroupIds.includes(primaryMuscleId) ? 0 : 1;
        const bMatch = b.muscleGroupIds.includes(primaryMuscleId) ? 0 : 1;
        return aMatch - bMatch;
      });
    }
    return all.filter((e) => e.id !== currentExerciseId);
  }, [currentExerciseId, primaryMuscleId]);

  const filtered = exercises?.filter((e) => {
    if (!search) return true;
    const name = e.isCustom ? e.nameKey : t(e.nameKey);
    return name.toLowerCase().includes(search.toLowerCase());
  });

  const handleSwap = async (newExerciseId: string) => {
    // Delete existing sets for this exercise log
    await db.setLogs.where('exerciseLogId').equals(exerciseLogId).delete();
    // Update the exercise log to point to the new exercise
    await db.exerciseLogs.update(exerciseLogId, {
      exerciseId: newExerciseId,
      startedAt: new Date(),
      completedAt: undefined,
    });
    onSwapped();
  };

  return (
    <Dialog open onClose={onClose}>
      <DialogHeader onClose={onClose}>{t('workout.swapExercise')}</DialogHeader>
      <div className="p-3 space-y-3">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t('common.search')}
          className="w-full rounded-lg border bg-secondary/50 px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        />
        <div className="max-h-[50vh] overflow-y-auto space-y-1">
          {filtered?.map((ex) => {
            const name = ex.isCustom ? ex.nameKey : t(ex.nameKey);
            const isSameMuscle = primaryMuscleId && ex.muscleGroupIds.includes(primaryMuscleId);
            return (
              <button
                key={ex.id}
                onClick={() => handleSwap(ex.id)}
                className="w-full flex items-center gap-3 p-2.5 rounded-lg hover:bg-accent active:bg-accent/80 text-left transition-colors touch-manipulation"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{name}</p>
                </div>
                {isSameMuscle && (
                  <Badge variant="success" className="text-[10px] shrink-0">
                    {t('exerciseLibrary.primary')}
                  </Badge>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </Dialog>
  );
}

function SetRow({
  set,
  weightUnit,
  onUpdate,
  onDelete,
  weightStep = 2.5,
}: {
  set: SetLog;
  weightUnit: 'kg' | 'lbs';
  onUpdate: (updates: Partial<SetLog>) => void;
  onDelete: () => void;
  weightStep?: number;
}) {
  const { t } = useTranslation();
  const displayWeight = convertWeight(set.weight, weightUnit);
  const [weightInput, setWeightInput] = useState(String(displayWeight));
  const [repsInput, setRepsInput] = useState(String(set.reps));

  // Sync display when unit changes (per-exercise toggle)
  useEffect(() => {
    setWeightInput(String(convertWeight(set.weight, weightUnit)));
  }, [weightUnit, set.weight]);

  // Time-based sets (planks, isometrics)
  if (set.isTimeBased) {
    return (
      <div className="grid grid-cols-[32px_1fr_1fr_1fr_32px] gap-2 items-center p-1 rounded">
        <span className="text-sm font-mono text-muted-foreground text-center">{set.setNumber}</span>
        <span className="text-sm font-mono col-span-2 text-center">⏱ {set.reps}s</span>
        <span />
        <button
          className="h-8 w-8 flex items-center justify-center text-muted-foreground hover:text-destructive touch-manipulation"
          onClick={onDelete}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    );
  }

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
            const newVal = Math.max(0, parseFloat(weightInput) - weightStep);
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
            const newVal = parseFloat(weightInput) + weightStep;
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
  const [notes, setNotes] = useState('');
  const [rating, setRating] = useState(0);

  const workoutLog = useLiveQuery(() => db.workoutLogs.get(workoutLogId), [workoutLogId]);
  const exerciseLogs = useLiveQuery(
    () => db.exerciseLogs.where('workoutLogId').equals(workoutLogId).sortBy('order'),
    [workoutLogId]
  );

  // Load existing notes & rating
  useEffect(() => {
    if (workoutLog?.notes) setNotes(workoutLog.notes);
    if (workoutLog?.rating) setRating(workoutLog.rating);
  }, [workoutLog?.notes, workoutLog?.rating]);

  const [stats, setStats] = useState({ totalSets: 0, totalVolume: 0 });
  const [prs, setPrs] = useState<Array<{ exerciseName: string; type: string; value: string }>>([]);
  const [exerciseDetails, setExerciseDetails] = useState<Array<{
    name: string;
    setsDone: number;
    targetSets: number;
    duration: number;
    volume: number;
  }>>([]);

  useEffect(() => {
    if (!exerciseLogs) return;
    (async () => {
      let totalSets = 0;
      let totalVolume = 0;
      const details: typeof exerciseDetails = [];

      // Get workout to find planned exercises
      const wl = await db.workoutLogs.get(workoutLogId);

      for (const el of exerciseLogs) {
        const sets = await db.setLogs.where('exerciseLogId').equals(el.id).toArray();
        const working = sets.filter((s) => !s.isWarmup);
        totalSets += working.length;
        const vol = working.reduce((sum, s) => sum + s.weight * s.reps, 0);
        totalVolume += vol;

        const exercise = await db.exercises.get(el.exerciseId);
        const name = exercise
          ? exercise.isCustom ? exercise.nameKey : t(exercise.nameKey)
          : '...';

        let targetSets = 0;
        if (wl?.dayId) {
          const pe = await db.plannedExercises
            .where('dayId').equals(wl.dayId)
            .and((p) => p.exerciseId === el.exerciseId)
            .first();
          targetSets = pe?.targetSets ?? 0;
        }

        const duration = el.startedAt && el.completedAt
          ? el.completedAt.getTime() - el.startedAt.getTime()
          : 0;

        details.push({
          name,
          setsDone: working.length,
          targetSets,
          duration,
          volume: vol,
        });
      }
      setStats({ totalSets, totalVolume });
      setExerciseDetails(details);

      // PR detection: compare each exercise's best in this workout vs all previous workouts
      const prList: typeof prs = [];
      for (const el of exerciseLogs) {
        const thisSets = await db.setLogs.where('exerciseLogId').equals(el.id).toArray();
        const thisWorking = thisSets.filter((s) => !s.isWarmup);
        if (thisWorking.length === 0) continue;

        const exercise = await db.exercises.get(el.exerciseId);
        const exName = exercise
          ? exercise.isCustom ? exercise.nameKey : t(exercise.nameKey)
          : '...';

        const thisMaxWeight = Math.max(...thisWorking.map((s) => s.weight));
        const thisMaxVolume = Math.max(...thisWorking.map((s) => s.weight * s.reps));

        // Get all previous exercise logs for this exercise
        const prevELogs = await db.exerciseLogs
          .where('exerciseId')
          .equals(el.exerciseId)
          .toArray();
        const prevELogsFiltered = prevELogs.filter((pe) => pe.id !== el.id);

        let prevMaxWeight = 0;
        let prevMaxVolume = 0;
        for (const pe of prevELogsFiltered) {
          const pSets = await db.setLogs.where('exerciseLogId').equals(pe.id).toArray();
          for (const s of pSets.filter((s) => !s.isWarmup)) {
            if (s.weight > prevMaxWeight) prevMaxWeight = s.weight;
            if (s.weight * s.reps > prevMaxVolume) prevMaxVolume = s.weight * s.reps;
          }
        }

        if (prevELogsFiltered.length > 0 && thisMaxWeight > prevMaxWeight) {
          prList.push({
            exerciseName: exName,
            type: t('workout.prWeight'),
            value: `${convertWeight(thisMaxWeight, settings.weightUnit)} ${settings.weightUnit}`,
          });
        }
        if (prevELogsFiltered.length > 0 && thisMaxVolume > prevMaxVolume) {
          prList.push({
            exerciseName: exName,
            type: t('workout.prVolume'),
            value: `${convertWeight(thisMaxVolume, settings.weightUnit)} ${settings.weightUnit}`,
          });
        }
      }
      setPrs(prList);
    })();
  }, [exerciseLogs, workoutLogId, t, settings.weightUnit]);

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

        {/* PRs */}
        {prs.length > 0 && (
          <Card className="border-warning/40 bg-warning/5">
            <CardContent className="p-3 space-y-2">
              <div className="flex items-center gap-2">
                <Trophy className="h-5 w-5 text-warning" />
                <h3 className="text-sm font-semibold">{t('workout.personalRecords')}</h3>
              </div>
              {prs.map((pr, i) => (
                <div key={i} className="flex items-center gap-2 text-sm">
                  <span className="text-warning">🏆</span>
                  <span className="font-medium">{pr.exerciseName}</span>
                  <span className="text-muted-foreground">— {pr.type}: {pr.value}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Per-exercise breakdown */}
        {exerciseDetails.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-muted-foreground">{t('plans.exercises')}</h3>
            {exerciseDetails.map((ex, i) => {
              const isComplete = ex.targetSets > 0 ? ex.setsDone >= ex.targetSets : ex.setsDone > 0;
              const isSkipped = ex.setsDone === 0;
              return (
                <Card key={i}>
                  <CardContent className="p-3 flex items-center gap-3">
                    <div className={`h-8 w-8 rounded-full flex items-center justify-center shrink-0 ${
                      isSkipped ? 'bg-destructive/15' : isComplete ? 'bg-success/15' : 'bg-warning/15'
                    }`}>
                      {isSkipped ? (
                        <X className="h-4 w-4 text-destructive" />
                      ) : isComplete ? (
                        <Check className="h-4 w-4 text-success" />
                      ) : (
                        <AlertTriangle className="h-4 w-4 text-warning" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{ex.name}</p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        {ex.targetSets > 0 && (
                          <span>{ex.setsDone}/{ex.targetSets} {t('workout.totalSets').toLowerCase()}</span>
                        )}
                        {ex.targetSets === 0 && ex.setsDone > 0 && (
                          <span>{ex.setsDone} {t('workout.totalSets').toLowerCase()}</span>
                        )}
                        {ex.duration > 0 && (
                          <span>• {formatDuration(ex.duration)}</span>
                        )}
                        {ex.volume > 0 && (
                          <span>• {convertWeight(ex.volume, settings.weightUnit).toLocaleString()} {settings.weightUnit}</span>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Rating */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-muted-foreground">{t('workout.workoutRating')}</label>
          <div className="flex items-center gap-1">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                onClick={() => setRating(n === rating ? 0 : n)}
                className={`h-10 w-10 rounded-lg flex items-center justify-center text-lg transition-colors touch-manipulation ${
                  n <= rating
                    ? 'bg-primary/20 text-primary'
                    : 'bg-secondary/50 text-muted-foreground'
                }`}
              >
                ★
              </button>
            ))}
            {rating > 0 && (
              <span className="text-sm text-muted-foreground ml-2">{t(`workout.ratingLabel${rating}`)}</span>
            )}
          </div>
        </div>

        {/* Notes */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-muted-foreground">{t('workout.workoutNotes')}</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder={t('workout.notesPlaceholder')}
            rows={3}
            className="w-full rounded-lg border bg-secondary/50 px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
          />
        </div>

        {/* Share */}
        <ShareWorkoutButton
          data={{
            duration: formatDuration(duration),
            totalSets: stats.totalSets,
            totalVolume: convertWeight(stats.totalVolume, settings.weightUnit).toLocaleString(),
            weightUnit: settings.weightUnit,
            exercises: exerciseDetails.map((ex) => ({
              name: ex.name,
              sets: ex.setsDone,
              volume: convertWeight(ex.volume, settings.weightUnit).toLocaleString(),
            })),
            prs,
            date: workoutLog ? new Date(workoutLog.startedAt).toLocaleDateString() : '',
          }}
        />

        <Button className="w-full" size="lg" onClick={async () => {
          const updates: Record<string, unknown> = {};
          if (notes.trim()) updates.notes = notes.trim();
          if (rating > 0) updates.rating = rating;
          if (Object.keys(updates).length > 0) {
            await db.workoutLogs.update(workoutLogId, updates);
          }
          onClose();
        }}>
          {t('common.done')}
        </Button>
      </div>
    </div>
  );
}
