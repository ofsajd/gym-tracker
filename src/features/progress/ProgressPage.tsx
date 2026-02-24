import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useLiveQuery } from 'dexie-react-hooks';
import { TrendingUp, BarChart3 } from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from 'recharts';
import { db } from '@/db/schema';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select } from '@/components/ui/select';
import { PageHeader } from '@/components/layout/PageHeader';
import { useUIStore } from '@/stores/ui-store';
import { convertWeight } from '@/lib/utils';
import { format } from 'date-fns';
import { pl, enUS } from 'date-fns/locale';

type ChartPoint = {
  date: string;
  weight: number;
  volume: number;
  reps: number;
};

type PeriodOption = '30' | '90' | '180' | 'all';

export function ProgressPage() {
  const { t } = useTranslation();
  const { settings } = useUIStore();
  const [selectedExerciseId, setSelectedExerciseId] = useState('');
  const [selectedMuscle, setSelectedMuscle] = useState('');
  const [period, setPeriod] = useState<PeriodOption>('90');
  const [chartData, setChartData] = useState<ChartPoint[]>([]);
  const [view, setView] = useState<'chart' | 'table'>('chart');

  const exercises = useLiveQuery(() => db.exercises.toArray());
  const muscleGroups = useLiveQuery(() => db.muscleGroups.toArray());
  const dateLocale = settings.language === 'pl' ? pl : enUS;

  // Build exercise options
  const exerciseOptions = (exercises ?? []).map((ex) => ({
    value: ex.id,
    label: ex.isCustom ? ex.nameKey : t(ex.nameKey),
  })).sort((a, b) => a.label.localeCompare(b.label));

  const muscleOptions = [
    { value: '', label: t('progress.selectMuscle') },
    ...(muscleGroups ?? []).map((mg) => ({
      value: mg.id,
      label: t(mg.nameKey),
    })),
  ];

  // Filter exercises by muscle group
  const filteredExerciseOptions = selectedMuscle
    ? exerciseOptions.filter((opt) => {
        const ex = exercises?.find((e) => e.id === opt.value);
        return ex?.muscleGroupIds.includes(selectedMuscle);
      })
    : exerciseOptions;

  // Build chart data
  useEffect(() => {
    if (!selectedExerciseId) {
      setChartData([]);
      return;
    }

    const loadData = async () => {
      let fromDate: Date | null = null;
      if (period !== 'all') {
        fromDate = new Date();
        fromDate.setDate(fromDate.getDate() - parseInt(period));
      }

      const exerciseLogs = await db.exerciseLogs
        .where('exerciseId')
        .equals(selectedExerciseId)
        .toArray();

      const points: ChartPoint[] = [];

      for (const el of exerciseLogs) {
        const workout = await db.workoutLogs.get(el.workoutLogId);
        if (!workout?.completedAt) continue;
        if (fromDate && workout.completedAt < fromDate) continue;

        const sets = await db.setLogs
          .where('exerciseLogId')
          .equals(el.id)
          .toArray();

        const workingSets = sets.filter((s) => !s.isWarmup);
        if (workingSets.length === 0) continue;

        const maxWeight = Math.max(...workingSets.map((s) => s.weight));
        const totalVolume = workingSets.reduce((sum, s) => sum + s.weight * s.reps, 0);
        const totalReps = workingSets.reduce((sum, s) => sum + s.reps, 0);

        points.push({
          date: format(workout.completedAt, 'dd MMM', { locale: dateLocale }),
          weight: convertWeight(maxWeight, settings.weightUnit),
          volume: convertWeight(totalVolume, settings.weightUnit),
          reps: totalReps,
        });
      }

      points.sort((a, b) => a.date.localeCompare(b.date));
      setChartData(points);
    };

    loadData();
  }, [selectedExerciseId, period, settings.weightUnit, dateLocale]);

  // Stats
  const maxWeight = chartData.length > 0 ? Math.max(...chartData.map((p) => p.weight)) : 0;
  const avgVolume =
    chartData.length > 0
      ? Math.round(chartData.reduce((sum, p) => sum + p.volume, 0) / chartData.length)
      : 0;

  const workoutCount = useLiveQuery(
    () => db.workoutLogs.filter((w) => !!w.completedAt).count()
  );

  const periodOptions = [
    { value: '30', label: t('progress.last30days') },
    { value: '90', label: t('progress.last90days') },
    { value: '180', label: t('progress.last6months') },
    { value: 'all', label: t('progress.allTime') },
  ];

  return (
    <div>
      <PageHeader title={t('progress.title')} />

      <div className="p-4 space-y-4">
        {/* Stats cards */}
        <div className="grid grid-cols-3 gap-3">
          <Card>
            <CardContent className="p-3 text-center">
              <p className="text-xl font-bold">
                {maxWeight > 0 ? maxWeight : '—'}
              </p>
              <p className="text-xs text-muted-foreground">{t('progress.maxWeight')}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 text-center">
              <p className="text-xl font-bold">{avgVolume > 0 ? avgVolume : '—'}</p>
              <p className="text-xs text-muted-foreground">{t('progress.avgVolume')}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 text-center">
              <p className="text-xl font-bold">{workoutCount ?? 0}</p>
              <p className="text-xs text-muted-foreground">{t('progress.totalWorkouts')}</p>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <div className="space-y-2">
          <Select
            options={muscleOptions}
            value={selectedMuscle}
            onChange={(e) => {
              setSelectedMuscle(e.target.value);
              setSelectedExerciseId('');
            }}
          />
          <Select
            options={[{ value: '', label: t('progress.selectExercise') }, ...filteredExerciseOptions]}
            value={selectedExerciseId}
            onChange={(e) => setSelectedExerciseId(e.target.value)}
          />
          <Select
            options={periodOptions}
            value={period}
            onChange={(e) => setPeriod(e.target.value as PeriodOption)}
          />
        </div>

        {/* View toggle */}
        <div className="flex gap-2">
          <Button
            variant={view === 'chart' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setView('chart')}
          >
            <TrendingUp className="h-4 w-4 mr-1" />
            {t('progress.weightProgress')}
          </Button>
          <Button
            variant={view === 'table' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setView('table')}
          >
            <BarChart3 className="h-4 w-4 mr-1" />
            {t('progress.history')}
          </Button>
        </div>

        {/* Content */}
        {!selectedExerciseId ? (
          <div className="text-center py-8 text-muted-foreground">
            <TrendingUp className="h-10 w-10 mx-auto mb-2 opacity-50" />
            <p>{t('progress.selectExercise')}</p>
          </div>
        ) : chartData.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <p>{t('progress.noHistory')}</p>
            <p className="text-sm mt-1">{t('progress.startTraining')}</p>
          </div>
        ) : view === 'chart' ? (
          <div className="space-y-4">
            {/* Weight chart */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">{t('progress.weightProgress')} ({settings.weightUnit})</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                      <XAxis dataKey="date" tick={{ fontSize: 10 }} stroke="var(--muted-foreground)" />
                      <YAxis tick={{ fontSize: 10 }} stroke="var(--muted-foreground)" />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'var(--card)',
                          border: '1px solid var(--border)',
                          borderRadius: '8px',
                          fontSize: '12px',
                        }}
                      />
                      <Line
                        type="monotone"
                        dataKey="weight"
                        stroke="var(--primary)"
                        strokeWidth={2}
                        dot={{ fill: 'var(--primary)', r: 3 }}
                        activeDot={{ r: 5 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Volume chart */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">{t('progress.volumeProgress')} ({settings.weightUnit})</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                      <XAxis dataKey="date" tick={{ fontSize: 10 }} stroke="var(--muted-foreground)" />
                      <YAxis tick={{ fontSize: 10 }} stroke="var(--muted-foreground)" />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'var(--card)',
                          border: '1px solid var(--border)',
                          borderRadius: '8px',
                          fontSize: '12px',
                        }}
                      />
                      <Bar dataKey="volume" fill="var(--primary)" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
        ) : (
          /* Table view */
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-3 text-muted-foreground font-medium">{t('common.day')}</th>
                      <th className="text-right p-3 text-muted-foreground font-medium">{t('common.weight')}</th>
                      <th className="text-right p-3 text-muted-foreground font-medium">{t('common.reps')}</th>
                      <th className="text-right p-3 text-muted-foreground font-medium">{t('progress.volumeProgress')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {chartData.map((row, i) => (
                      <tr key={i} className="border-b last:border-0">
                        <td className="p-3">{row.date}</td>
                        <td className="p-3 text-right font-mono">{row.weight}</td>
                        <td className="p-3 text-right font-mono">{row.reps}</td>
                        <td className="p-3 text-right font-mono">{row.volume.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
