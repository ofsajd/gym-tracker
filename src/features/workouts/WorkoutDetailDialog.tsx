import { useTranslation } from 'react-i18next';
import { useLiveQuery } from 'dexie-react-hooks';
import { Dumbbell, Clock, Calendar, Trophy } from 'lucide-react';
import { db } from '@/db/schema';
import { Dialog, DialogHeader } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { useUIStore } from '@/stores/ui-store';
import { convertWeight, formatDuration } from '@/lib/utils';
import type { WorkoutLog, SetLog } from '@/types/models';

type SetLogMap = Record<string, SetLog[]>;

type Props = {
  workout: WorkoutLog & { dayName?: string; planName?: string };
  onClose: () => void;
};

export function WorkoutDetailDialog({ workout, onClose }: Props) {
  const { t } = useTranslation();
  const { settings } = useUIStore();
  const unit = settings.weightUnit;

  const exerciseLogs = useLiveQuery(
    () => db.exerciseLogs.where('workoutLogId').equals(workout.id).sortBy('order'),
    [workout.id]
  );

  const exercises = useLiveQuery(() => db.exercises.toArray());
  const muscleGroups = useLiveQuery(() => db.muscleGroups.toArray());

  const setLogsByExercise = useLiveQuery(async (): Promise<SetLogMap> => {
    if (!exerciseLogs) return {};
    const map: SetLogMap = {};
    for (const el of exerciseLogs) {
      map[el.id] = await db.setLogs
        .where('exerciseLogId')
        .equals(el.id)
        .sortBy('setNumber');
    }
    return map;
  }, [exerciseLogs]);

  const duration =
    workout.completedAt && workout.startedAt
      ? new Date(workout.completedAt).getTime() - new Date(workout.startedAt).getTime()
      : null;

  // Calculate totals
  const totalVolume =
    setLogsByExercise
      ? Object.values(setLogsByExercise)
          .flat()
          .filter((s) => !s.isWarmup)
          .reduce((sum, s) => sum + s.weight * s.reps, 0)
      : 0;

  const totalSets = setLogsByExercise
    ? Object.values(setLogsByExercise)
        .flat()
        .filter((s) => !s.isWarmup).length
    : 0;

  return (
    <Dialog open onClose={onClose} className="max-h-[90vh]">
      <DialogHeader onClose={onClose}>
        {workout.dayName ?? t('workout.title')}
      </DialogHeader>

      <div className="space-y-4 overflow-y-auto max-h-[75vh] pb-4">
        {/* Summary header */}
        <div className="flex items-center gap-3 flex-wrap text-sm text-muted-foreground">
          <span className="flex items-center gap-1">
            <Calendar className="h-4 w-4" />
            {new Date(workout.startedAt).toLocaleDateString()}
          </span>
          {duration && (
            <span className="flex items-center gap-1">
              <Clock className="h-4 w-4" />
              {formatDuration(duration)}
            </span>
          )}
          {workout.weekNumber && (
            <span>{t('workout.weekNum', { week: workout.weekNumber })}</span>
          )}
          {workout.planName && (
            <Badge variant="secondary">{workout.planName}</Badge>
          )}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-2">
          <Card>
            <CardContent className="p-3 text-center">
              <p className="text-xs text-muted-foreground">{t('workout.totalVolume')}</p>
              <p className="text-lg font-bold font-mono">
                {convertWeight(totalVolume, unit).toFixed(0)} {unit}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 text-center">
              <p className="text-xs text-muted-foreground">{t('workout.totalSets')}</p>
              <p className="text-lg font-bold font-mono">{totalSets}</p>
            </CardContent>
          </Card>
        </div>

        {/* Exercise details */}
        {exerciseLogs?.map((el) => {
          const exercise = exercises?.find((e) => e.id === el.exerciseId);
          const exName = exercise
            ? exercise.isCustom
              ? exercise.nameKey
              : t(exercise.nameKey)
            : '...';
          const sets = setLogsByExercise?.[el.id] ?? [];
          const exMuscles = exercise?.muscleGroupIds
            .map((mgId) => muscleGroups?.find((m) => m.id === mgId))
            .filter(Boolean) ?? [];

          return (
            <Card key={el.id}>
              <CardContent className="p-3 space-y-2">
                <div>
                  <div className="flex items-center gap-2">
                    <Dumbbell className="h-4 w-4 text-primary shrink-0" />
                    <p className="text-sm font-semibold">{exName}</p>
                  </div>
                  {exMuscles.length > 0 && (
                    <div className="flex gap-1 mt-1 ml-6 flex-wrap">
                      {exMuscles.map((mg) => (
                        <Badge key={mg!.id} variant="secondary" className="text-[10px]">
                          {t(mg!.nameKey)}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>

                {sets.length > 0 ? (
                  <div className="ml-6 space-y-0.5">
                    <div className="grid grid-cols-[24px_1fr_1fr_1fr] gap-2 text-[10px] text-muted-foreground uppercase tracking-wider">
                      <span>#</span>
                      <span>{t('common.weight')}</span>
                      <span>{t('common.reps')}</span>
                      <span>{t('workout.type')}</span>
                    </div>
                    {sets.map((s) => (
                      <div
                        key={s.id}
                        className={`grid grid-cols-[24px_1fr_1fr_1fr] gap-2 text-sm font-mono ${
                          s.isWarmup ? 'opacity-50' : ''
                        }`}
                      >
                        <span className="text-muted-foreground">{s.setNumber}</span>
                        <span>
                          {convertWeight(s.weight, unit)} {unit}
                        </span>
                        <span>{s.reps}</span>
                        <span className="text-xs">
                          {s.isWarmup ? t('workout.warmupShort') : t('workout.workingSet')}
                        </span>
                      </div>
                    ))}
                    {/* Best set indicator */}
                    {(() => {
                      const workingSets = sets.filter((s) => !s.isWarmup);
                      if (workingSets.length === 0) return null;
                      const best = workingSets.reduce((a, b) =>
                        a.weight * a.reps > b.weight * b.reps ? a : b
                      );
                      return (
                        <div className="flex items-center gap-1 mt-1 text-xs text-primary">
                          <Trophy className="h-3 w-3" />
                          <span>
                            {t('workout.bestSet')}: {convertWeight(best.weight, unit)} {unit} × {best.reps}
                          </span>
                        </div>
                      );
                    })()}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground ml-6">{t('common.noData')}</p>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </Dialog>
  );
}
