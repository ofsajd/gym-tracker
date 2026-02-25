import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { subDays } from 'date-fns';
import { db } from '@/db/schema';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

type MuscleVolume = {
  muscleId: string;
  nameKey: string;
  sets: number;
};

type Period = '7' | '14' | '30';

export function MuscleHeatmap() {
  const { t } = useTranslation();
  const [period, setPeriod] = useState<Period>('7');
  const [muscleData, setMuscleData] = useState<MuscleVolume[]>([]);

  useEffect(() => {
    (async () => {
      const fromDate = subDays(new Date(), parseInt(period));

      // Get completed workouts in the period
      const workouts = await db.workoutLogs
        .filter((w) => !!w.completedAt && w.completedAt >= fromDate)
        .toArray();

      if (workouts.length === 0) {
        setMuscleData([]);
        return;
      }

      const workoutIds = new Set(workouts.map((w) => w.id));
      const allExLogs = await db.exerciseLogs.toArray();
      const periodExLogs = allExLogs.filter((el) => workoutIds.has(el.workoutLogId));

      // Count sets per muscle group
      const muscleSets: Record<string, number> = {};
      const allExercises = await db.exercises.toArray();
      const exerciseMap = new Map(allExercises.map((e) => [e.id, e]));

      for (const el of periodExLogs) {
        const setCount = await db.setLogs
          .where('exerciseLogId')
          .equals(el.id)
          .filter((s) => !s.isWarmup)
          .count();
        if (setCount === 0) continue;

        const exercise = exerciseMap.get(el.exerciseId);
        if (!exercise) continue;

        for (const mgId of exercise.muscleGroupIds) {
          muscleSets[mgId] = (muscleSets[mgId] || 0) + setCount;
        }
      }

      const allMuscles = await db.muscleGroups.toArray();
      const data: MuscleVolume[] = allMuscles.map((mg) => ({
        muscleId: mg.id,
        nameKey: mg.nameKey,
        sets: muscleSets[mg.id] || 0,
      }));

      data.sort((a, b) => b.sets - a.sets);
      setMuscleData(data);
    })();
  }, [period]);

  const maxSets = Math.max(...muscleData.map((m) => m.sets), 1);

  if (muscleData.length === 0) return null;

  return (
    <Card>
      <CardContent className="p-3 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium">{t('progress.muscleHeatmap')}</h3>
          <div className="flex gap-1">
            {(['7', '14', '30'] as Period[]).map((p) => (
              <Button
                key={p}
                variant={period === p ? 'default' : 'outline'}
                size="sm"
                className="h-7 text-xs px-2"
                onClick={() => setPeriod(p)}
              >
                {p}{t('common.day').charAt(0).toLowerCase()}
              </Button>
            ))}
          </div>
        </div>

        <div className="space-y-1.5">
          {muscleData.map((m) => {
            const pct = (m.sets / maxSets) * 100;
            const intensity =
              pct >= 80 ? 'bg-destructive/70' :
              pct >= 50 ? 'bg-warning/70' :
              pct >= 20 ? 'bg-primary/50' :
              m.sets > 0 ? 'bg-primary/20' : 'bg-secondary/50';
            return (
              <div key={m.muscleId} className="flex items-center gap-2">
                <span className="text-xs w-20 truncate text-muted-foreground">
                  {t(m.nameKey)}
                </span>
                <div className="flex-1 h-5 bg-secondary rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${intensity}`}
                    style={{ width: `${Math.max(pct, m.sets > 0 ? 8 : 0)}%` }}
                  />
                </div>
                <span className="text-xs font-mono w-8 text-right text-muted-foreground">
                  {m.sets}
                </span>
              </div>
            );
          })}
        </div>

        <p className="text-[10px] text-muted-foreground text-center">
          {t('progress.setsPerMuscle')}
        </p>
      </CardContent>
    </Card>
  );
}
