import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useLiveQuery } from 'dexie-react-hooks';
import { Play, ChevronRight, Dumbbell, Plus, Calendar, Clock, Check } from 'lucide-react';
import { db } from '@/db/schema';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogHeader } from '@/components/ui/dialog';
import { PageHeader } from '@/components/layout/PageHeader';
import { useUIStore } from '@/stores/ui-store';
import { ActiveWorkout } from './ActiveWorkout';
import { WorkoutDetailDialog } from './WorkoutDetailDialog';
import { generateId, formatDuration } from '@/lib/utils';
import type { WorkoutLog } from '@/types/models';

export function WorkoutPage() {
  const { t } = useTranslation();
  const { activeWorkout, setActiveWorkout } = useUIStore();
  const [showWeekPicker, setShowWeekPicker] = useState(false);
  const [showDayPicker, setShowDayPicker] = useState(false);
  const [pendingWeek, setPendingWeek] = useState<number | null>(null);
  const [selectedWorkout, setSelectedWorkout] = useState<
    (WorkoutLog & { dayName?: string; planName?: string }) | null
  >(null);

  const activePlan = useLiveQuery(() => db.trainingPlans.filter((p) => p.isActive).first());
  const days = useLiveQuery(
    () => (activePlan ? db.trainingDays.where('planId').equals(activePlan.id).sortBy('order') : []),
    [activePlan?.id]
  );

  // All workout logs for active plan — used for completion indicators
  const planLogs = useLiveQuery(
    () =>
      activePlan
        ? db.workoutLogs.where('planId').equals(activePlan.id).toArray()
        : [],
    [activePlan?.id]
  );

  // Recent workouts (last 10)
  const recentWorkouts = useLiveQuery(async () => {
    const logs = await db.workoutLogs.orderBy('startedAt').reverse().limit(10).toArray();
    const enriched = await Promise.all(
      logs.map(async (log) => {
        const day = log.dayId ? await db.trainingDays.get(log.dayId) : null;
        const plan = log.planId ? await db.trainingPlans.get(log.planId) : null;
        // Check if workout is partial (has exercises with 0 sets)
        let isPartial = false;
        if (log.completedAt) {
          const eLogs = await db.exerciseLogs.where('workoutLogId').equals(log.id).toArray();
          for (const el of eLogs) {
            const setCount = await db.setLogs.where('exerciseLogId').equals(el.id).count();
            if (setCount === 0) { isPartial = true; break; }
          }
        }
        return { ...log, dayName: day?.name, planName: plan?.name, isPartial };
      })
    );
    return enriched;
  });

  // Determine next week number
  const [nextWeek, setNextWeek] = useState(1);

  useEffect(() => {
    if (!activePlan || !planLogs) return;
    if (planLogs.length === 0) {
      setNextWeek(1);
    } else {
      const maxWeek = Math.max(...planLogs.map((l) => l.weekNumber ?? 1));
      const weekLogs = planLogs.filter((l) => l.weekNumber === maxWeek && l.completedAt);
      const allDone = !!(days && weekLogs.length >= days.length);
      if (allDone) {
        setNextWeek(Math.min(maxWeek + 1, activePlan.weekCount));
      } else {
        setNextWeek(maxWeek);
      }
    }
  }, [activePlan, days, planLogs]);

  // Completion helpers
  const getWeekCompletedDays = (week: number) =>
    (planLogs ?? []).filter((l) => l.weekNumber === week && l.completedAt).length;

  const isDayDoneInWeek = (dayId: string, week: number) =>
    (planLogs ?? []).some((l) => l.dayId === dayId && l.weekNumber === week && l.completedAt);

  const handleWeekSelected = (week: number) => {
    setPendingWeek(week);
    setShowWeekPicker(false);
    setShowDayPicker(true);
  };

  const startWorkout = useCallback(
    async (dayId: string, weekNumber: number) => {
      const workoutId = generateId();
      await db.workoutLogs.add({
        id: workoutId,
        dayId,
        planId: activePlan?.id,
        weekNumber,
        startedAt: new Date(),
      });

      // Pre-populate exercise logs from plan
      const plannedExercises = await db.plannedExercises
        .where('dayId')
        .equals(dayId)
        .sortBy('order');

      for (const pe of plannedExercises) {
        await db.exerciseLogs.add({
          id: generateId(),
          workoutLogId: workoutId,
          exerciseId: pe.exerciseId,
          order: pe.order,
        });
      }

      setActiveWorkout({ isActive: true, workoutLogId: workoutId, currentExerciseIndex: 0 });
      setShowWeekPicker(false);
      setShowDayPicker(false);
      setPendingWeek(null);
    },
    [activePlan, setActiveWorkout]
  );

  if (activeWorkout.isActive && activeWorkout.workoutLogId) {
    return <ActiveWorkout />;
  }

  return (
    <div>
      <PageHeader title={t('workout.title')} />

      <div className="p-4 space-y-4">
        {!activePlan ? (
          <div className="text-center py-12 text-muted-foreground">
            <Dumbbell className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p className="font-medium">{t('workout.noActivePlan')}</p>
            <p className="text-sm mt-1">{t('workout.setActivePlan')}</p>
          </div>
        ) : (
          <>
            {/* Active plan info */}
            <div className="text-center">
              <h2 className="font-semibold text-lg">{activePlan.name}</h2>
              <p className="text-sm text-muted-foreground">
                {t('workout.weekNum', { week: nextWeek })} / {activePlan.weekCount}
              </p>
            </div>

            {/* Start new workout button */}
            <Button
              size="lg"
              className="w-full h-14 text-base"
              onClick={() => setShowWeekPicker(true)}
            >
              <Plus className="h-5 w-5 mr-2" />
              {t('workout.newWorkout')}
            </Button>

            {/* Recent workouts */}
            <div className="space-y-2">
              <h3 className="text-sm font-medium text-muted-foreground">
                {t('workout.recentWorkouts')}
              </h3>

              {(!recentWorkouts || recentWorkouts.length === 0) && (
                <div className="text-center py-6 text-muted-foreground">
                  <Calendar className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">{t('workout.noWorkoutsYet')}</p>
                </div>
              )}

              {recentWorkouts?.map((w) => {
                const duration =
                  w.completedAt && w.startedAt
                    ? new Date(w.completedAt).getTime() - new Date(w.startedAt).getTime()
                    : null;
                return (
                  <Card
                    key={w.id}
                    className="cursor-pointer active:scale-[0.98] transition-transform touch-manipulation"
                    onClick={() => setSelectedWorkout(w)}
                  >
                    <CardContent className="p-3 flex items-center gap-3">
                      <div
                        className={`h-10 w-10 rounded-lg flex items-center justify-center ${
                          w.completedAt && !w.isPartial
                            ? 'bg-success/10 text-success'
                            : w.completedAt && w.isPartial
                              ? 'bg-warning/10 text-warning'
                              : 'bg-muted/30 text-muted-foreground'
                        }`}
                      >
                        <Dumbbell className="h-5 w-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {w.dayName ?? t('workout.title')}
                        </p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span>{new Date(w.startedAt).toLocaleDateString()}</span>
                          {duration && (
                            <>
                              <span>•</span>
                              <span className="flex items-center gap-0.5">
                                <Clock className="h-3 w-3" />
                                {formatDuration(duration)}
                              </span>
                            </>
                          )}
                          {w.isPartial && (
                            <>
                              <span>•</span>
                              <span className="text-warning">{t('workout.partial')}</span>
                            </>
                          )}
                          {w.planName && (
                            <>
                              <span>•</span>
                              <span className="truncate">{w.planName}</span>
                            </>
                          )}
                        </div>
                      </div>
                      {w.weekNumber && (
                        <span className="text-xs text-muted-foreground shrink-0">
                          W{w.weekNumber}
                        </span>
                      )}
                      <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* Week picker dialog (Step 1) */}
      {showWeekPicker && activePlan && (
        <Dialog open onClose={() => setShowWeekPicker(false)}>
          <DialogHeader onClose={() => setShowWeekPicker(false)}>
            {t('workout.selectWeek')}
          </DialogHeader>

          <div className="space-y-2 py-2">
            {Array.from({ length: activePlan.weekCount }, (_, i) => i + 1).map((week) => {
              const isSuggested = week === nextWeek;
              const completedDays = getWeekCompletedDays(week);
              const totalDays = days?.length ?? 0;
              const isWeekDone = totalDays > 0 && completedDays >= totalDays;
              return (
                <button
                  key={week}
                  onClick={() => handleWeekSelected(week)}
                  className={`w-full flex items-center justify-between gap-3 p-4 rounded-lg text-left transition-colors touch-manipulation ${
                    isSuggested
                      ? 'bg-primary/10 hover:bg-primary/20 ring-1 ring-primary/30'
                      : 'hover:bg-accent active:bg-accent/80'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`h-10 w-10 rounded-lg flex items-center justify-center font-bold ${
                        isWeekDone
                          ? 'bg-success/20 text-success'
                          : isSuggested
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-secondary text-secondary-foreground'
                      }`}
                    >
                      {isWeekDone ? <Check className="h-5 w-5" /> : week}
                    </div>
                    <div>
                      <p className="font-medium">
                        {t('workout.weekNum', { week })}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {completedDays}/{totalDays} {t('workout.daysCompleted')}
                      </p>
                      {isSuggested && !isWeekDone && (
                        <p className="text-xs text-primary">{t('workout.suggestedWeek')}</p>
                      )}
                    </div>
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted-foreground" />
                </button>
              );
            })}
          </div>
        </Dialog>
      )}

      {/* Day picker dialog (Step 2) */}
      {showDayPicker && activePlan && pendingWeek !== null && (
        <Dialog
          open
          onClose={() => {
            setShowDayPicker(false);
            setPendingWeek(null);
          }}
        >
          <DialogHeader
            onClose={() => {
              setShowDayPicker(false);
              setPendingWeek(null);
            }}
          >
            {t('workout.selectDay')} — {t('workout.weekNum', { week: pendingWeek })}
          </DialogHeader>

          <div className="space-y-2 py-2">
            {days?.map((day) => {
              const done = isDayDoneInWeek(day.id, pendingWeek);
              return (
                <button
                  key={day.id}
                  onClick={() => startWorkout(day.id, pendingWeek)}
                  className="w-full flex items-center justify-between gap-3 p-4 rounded-lg hover:bg-accent active:bg-accent/80 text-left transition-colors touch-manipulation"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`h-10 w-10 rounded-lg flex items-center justify-center ${
                        done
                          ? 'bg-success/20 text-success'
                          : 'bg-primary/10 text-primary'
                      }`}
                    >
                      {done ? <Check className="h-5 w-5" /> : <Play className="h-5 w-5" />}
                    </div>
                    <div>
                      <p className="font-medium">{day.name}</p>
                      <DayExerciseCount dayId={day.id} />
                    </div>
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted-foreground" />
                </button>
              );
            })}
          </div>
        </Dialog>
      )}

      {/* Workout detail dialog */}
      {selectedWorkout && (
        <WorkoutDetailDialog
          workout={selectedWorkout}
          onClose={() => setSelectedWorkout(null)}
        />
      )}
    </div>
  );
}

function DayExerciseCount({ dayId }: { dayId: string }) {
  const { t } = useTranslation();
  const count = useLiveQuery(
    () => db.plannedExercises.where('dayId').equals(dayId).count(),
    [dayId]
  );
  return (
    <p className="text-xs text-muted-foreground">
      {count ?? 0} {t('plans.exercises').toLowerCase()}
    </p>
  );
}
