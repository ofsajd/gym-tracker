import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useLiveQuery } from 'dexie-react-hooks';
import { Play, ChevronRight, Dumbbell, Plus, Calendar, Clock } from 'lucide-react';
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
  const [showDayPicker, setShowDayPicker] = useState(false);
  const [selectedWorkout, setSelectedWorkout] = useState<
    (WorkoutLog & { dayName?: string; planName?: string }) | null
  >(null);
  const [showWeekPicker, setShowWeekPicker] = useState(false);
  const [pendingDayId, setPendingDayId] = useState<string | null>(null);

  const activePlan = useLiveQuery(() => db.trainingPlans.filter((p) => p.isActive).first());
  const days = useLiveQuery(
    () => (activePlan ? db.trainingDays.where('planId').equals(activePlan.id).sortBy('order') : []),
    [activePlan?.id]
  );

  // Recent workouts (last 10)
  const recentWorkouts = useLiveQuery(async () => {
    const logs = await db.workoutLogs.orderBy('startedAt').reverse().limit(10).toArray();
    // Enrich with day names
    const enriched = await Promise.all(
      logs.map(async (log) => {
        const day = log.dayId ? await db.trainingDays.get(log.dayId) : null;
        const plan = log.planId ? await db.trainingPlans.get(log.planId) : null;
        return { ...log, dayName: day?.name, planName: plan?.name };
      })
    );
    return enriched;
  });

  // Determine next week number and completed weeks info
  const [nextWeek, setNextWeek] = useState(1);

  useEffect(() => {
    if (!activePlan) return;
    db.workoutLogs
      .where('planId')
      .equals(activePlan.id)
      .toArray()
      .then((logs) => {
        if (logs.length === 0) {
          setNextWeek(1);
        } else {
          const maxWeek = Math.max(...logs.map((l) => l.weekNumber ?? 1));
          const weekLogs = logs.filter((l) => l.weekNumber === maxWeek && l.completedAt);
          const allDone = !!(days && weekLogs.length >= days.length);
          if (allDone) {
            setNextWeek(Math.min(maxWeek + 1, activePlan.weekCount));
          } else {
            setNextWeek(maxWeek);
          }
        }
      });
  }, [activePlan, days]);

  const handleDaySelected = (dayId: string) => {
    setPendingDayId(dayId);
    setShowDayPicker(false);
    setShowWeekPicker(true);
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
      setShowDayPicker(false);
      setShowWeekPicker(false);
      setPendingDayId(null);
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
              onClick={() => setShowDayPicker(true)}
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
                          w.completedAt
                            ? 'bg-success/10 text-success'
                            : 'bg-warning/10 text-warning'
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

      {/* Day picker dialog */}
      {showDayPicker && (
        <Dialog open onClose={() => setShowDayPicker(false)}>
          <DialogHeader onClose={() => setShowDayPicker(false)}>
            {t('workout.selectDay')}
          </DialogHeader>

          <div className="space-y-2 py-2">
            {days?.map((day) => (
              <button
                key={day.id}
                onClick={() => handleDaySelected(day.id)}
                className="w-full flex items-center justify-between gap-3 p-4 rounded-lg hover:bg-accent active:bg-accent/80 text-left transition-colors touch-manipulation"
              >
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Play className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">{day.name}</p>
                    <DayExerciseCount dayId={day.id} />
                  </div>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground" />
              </button>
            ))}
          </div>
        </Dialog>
      )}

      {/* Week picker dialog */}
      {showWeekPicker && activePlan && pendingDayId && (
        <Dialog
          open
          onClose={() => {
            setShowWeekPicker(false);
            setPendingDayId(null);
          }}
        >
          <DialogHeader
            onClose={() => {
              setShowWeekPicker(false);
              setPendingDayId(null);
            }}
          >
            {t('workout.selectWeek')}
          </DialogHeader>

          <div className="space-y-2 py-2">
            {Array.from({ length: activePlan.weekCount }, (_, i) => i + 1).map((week) => {
              const isSuggested = week === nextWeek;
              return (
                <button
                  key={week}
                  onClick={() => startWorkout(pendingDayId, week)}
                  className={`w-full flex items-center justify-between gap-3 p-4 rounded-lg text-left transition-colors touch-manipulation ${
                    isSuggested
                      ? 'bg-primary/10 hover:bg-primary/20 ring-1 ring-primary/30'
                      : 'hover:bg-accent active:bg-accent/80'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`h-10 w-10 rounded-lg flex items-center justify-center font-bold ${
                        isSuggested
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-secondary text-secondary-foreground'
                      }`}
                    >
                      {week}
                    </div>
                    <div>
                      <p className="font-medium">
                        {t('workout.weekNum', { week })}
                      </p>
                      {isSuggested && (
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
