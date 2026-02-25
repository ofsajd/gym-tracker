import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db/schema';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select } from '@/components/ui/select';
import { useUIStore } from '@/stores/ui-store';
import { convertWeight } from '@/lib/utils';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

type ComparisonRow = {
  exercise: string;
  week1Volume: number;
  week2Volume: number;
  week1MaxWeight: number;
  week2MaxWeight: number;
};

export function WeekComparison() {
  const { t } = useTranslation();
  const { settings } = useUIStore();
  const [week1, setWeek1] = useState('');
  const [week2, setWeek2] = useState('');
  const [data, setData] = useState<ComparisonRow[]>([]);

  const activePlan = useLiveQuery(() => db.trainingPlans.filter((p) => p.isActive).first());

  // Get available weeks for the active plan
  const weekOptions = useLiveQuery(async () => {
    if (!activePlan) return [];
    const logs = await db.workoutLogs
      .where('planId')
      .equals(activePlan.id)
      .filter((w) => !!w.completedAt && !!w.weekNumber)
      .toArray();

    const weekNums = [...new Set(logs.map((l) => l.weekNumber!))].sort((a, b) => a - b);
    return weekNums.map((w) => ({
      value: String(w),
      label: `${t('workout.weekNum', { week: w })}`,
    }));
  }, [activePlan?.id]);

  // Build comparison data
  useEffect(() => {
    if (!week1 || !week2 || !activePlan) {
      setData([]);
      return;
    }

    (async () => {
      const getWeekData = async (weekNum: number) => {
        const logs = await db.workoutLogs
          .where('planId')
          .equals(activePlan.id)
          .filter((w) => w.weekNumber === weekNum && !!w.completedAt)
          .toArray();

        const exerciseMap = new Map<string, { volume: number; maxWeight: number }>();

        for (const log of logs) {
          const eLogs = await db.exerciseLogs.where('workoutLogId').equals(log.id).toArray();
          for (const el of eLogs) {
            const sets = await db.setLogs.where('exerciseLogId').equals(el.id).toArray();
            const working = sets.filter((s) => !s.isWarmup);
            const vol = working.reduce((sum, s) => sum + s.weight * s.reps, 0);
            const maxW = working.length > 0 ? Math.max(...working.map((s) => s.weight)) : 0;

            const exercise = await db.exercises.get(el.exerciseId);
            const name = exercise
              ? exercise.isCustom ? exercise.nameKey : el.exerciseId
              : el.exerciseId;

            const existing = exerciseMap.get(name) || { volume: 0, maxWeight: 0 };
            exerciseMap.set(name, {
              volume: existing.volume + vol,
              maxWeight: Math.max(existing.maxWeight, maxW),
            });
          }
        }
        return exerciseMap;
      };

      const w1Data = await getWeekData(parseInt(week1));
      const w2Data = await getWeekData(parseInt(week2));

      const allExercises = new Set([...w1Data.keys(), ...w2Data.keys()]);
      const rows: ComparisonRow[] = [];

      for (const exId of allExercises) {
        const exercise = await db.exercises.get(exId);
        const name = exercise
          ? exercise.isCustom ? exercise.nameKey : t(exercise.nameKey)
          : exId;

        const w1 = w1Data.get(exId) || { volume: 0, maxWeight: 0 };
        const w2 = w2Data.get(exId) || { volume: 0, maxWeight: 0 };

        rows.push({
          exercise: name.length > 15 ? name.slice(0, 13) + '…' : name,
          week1Volume: convertWeight(w1.volume, settings.weightUnit),
          week2Volume: convertWeight(w2.volume, settings.weightUnit),
          week1MaxWeight: convertWeight(w1.maxWeight, settings.weightUnit),
          week2MaxWeight: convertWeight(w2.maxWeight, settings.weightUnit),
        });
      }

      setData(rows);
    })();
  }, [week1, week2, activePlan, settings.weightUnit, t]);

  if (!activePlan) return null;
  if (!weekOptions || weekOptions.length < 2) return null;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">{t('progress.weeklyComparison')}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex gap-2">
          <Select
            options={[{ value: '', label: `${t('workout.selectWeek')} 1` }, ...weekOptions]}
            value={week1}
            onChange={(e) => setWeek1(e.target.value)}
          />
          <Select
            options={[{ value: '', label: `${t('workout.selectWeek')} 2` }, ...weekOptions]}
            value={week2}
            onChange={(e) => setWeek2(e.target.value)}
          />
        </div>

        {data.length > 0 && (
          <>
            {/* Volume comparison chart */}
            <div className="h-52">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis type="number" tick={{ fontSize: 9 }} stroke="var(--muted-foreground)" />
                  <YAxis
                    dataKey="exercise"
                    type="category"
                    tick={{ fontSize: 9 }}
                    stroke="var(--muted-foreground)"
                    width={70}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'var(--card)',
                      border: '1px solid var(--border)',
                      borderRadius: '8px',
                      fontSize: '11px',
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: '10px' }} />
                  <Bar
                    dataKey="week1Volume"
                    name={`W${week1} vol`}
                    fill="var(--primary)"
                    radius={[0, 4, 4, 0]}
                    barSize={8}
                  />
                  <Bar
                    dataKey="week2Volume"
                    name={`W${week2} vol`}
                    fill="var(--success)"
                    radius={[0, 4, 4, 0]}
                    barSize={8}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Table with delta */}
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-1.5 text-muted-foreground">{t('plans.exercises')}</th>
                    <th className="text-right p-1.5 text-muted-foreground">W{week1}</th>
                    <th className="text-right p-1.5 text-muted-foreground">W{week2}</th>
                    <th className="text-right p-1.5 text-muted-foreground">Δ</th>
                  </tr>
                </thead>
                <tbody>
                  {data.map((row, i) => {
                    const delta = row.week2Volume - row.week1Volume;
                    return (
                      <tr key={i} className="border-b last:border-0">
                        <td className="p-1.5 font-medium">{row.exercise}</td>
                        <td className="p-1.5 text-right font-mono">{row.week1Volume}</td>
                        <td className="p-1.5 text-right font-mono">{row.week2Volume}</td>
                        <td className={`p-1.5 text-right font-mono ${delta > 0 ? 'text-success' : delta < 0 ? 'text-destructive' : ''}`}>
                          {delta > 0 ? '+' : ''}{delta}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
