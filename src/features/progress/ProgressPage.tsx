import { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useLiveQuery } from 'dexie-react-hooks';
import { TrendingUp, BarChart3, Flame, Dumbbell, Trophy, Calculator, ChevronLeft, ChevronRight, Clock } from 'lucide-react';
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
import { Dialog, DialogHeader } from '@/components/ui/dialog';
import { PageHeader } from '@/components/layout/PageHeader';
import { useUIStore } from '@/stores/ui-store';
import { AchievementsSection } from './AchievementsSection';
import { MuscleHeatmap } from './MuscleHeatmap';
import { StreakGrid } from './StreakGrid';
import { WeekComparison } from './WeekComparison';
import { WorkoutDetailDialog } from '../workouts/WorkoutDetailDialog';
import { convertWeight, formatDuration } from '@/lib/utils';
import {
  format,
  startOfDay,
  startOfMonth,
  endOfMonth,
  addMonths,
  subMonths,
  eachDayOfInterval,
  isSameDay,
  isSameMonth,
  getDay,
  startOfWeek,
  subWeeks,
} from 'date-fns';
import { pl, enUS, type Locale } from 'date-fns/locale';

type ChartPoint = {
  date: string;
  weight: number;
  volume: number;
  reps: number;
};

type PeriodOption = '30' | '90' | '180' | 'all';

// Epley formula: 1RM = w × (1 + r / 30)
function estimate1RM(weight: number, reps: number): number {
  if (reps <= 0 || weight <= 0) return 0;
  if (reps === 1) return weight;
  return Math.round(weight * (1 + reps / 30) * 10) / 10;
}

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

  // All completed workouts for overview stats
  const completedWorkouts = useLiveQuery(
    () => db.workoutLogs.filter((w) => !!w.completedAt).toArray()
  );

  // Overall stats
  const totalWorkouts = completedWorkouts?.length ?? 0;

  const [totalVolume, setTotalVolume] = useState(0);
  useEffect(() => {
    if (!completedWorkouts || completedWorkouts.length === 0) {
      setTotalVolume(0);
      return;
    }
    (async () => {
      const workoutIds = completedWorkouts.map((w) => w.id);
      let vol = 0;
      for (const wId of workoutIds) {
        const eLogs = await db.exerciseLogs.where('workoutLogId').equals(wId).toArray();
        for (const el of eLogs) {
          const sets = await db.setLogs.where('exerciseLogId').equals(el.id).toArray();
          vol += sets.filter((s) => !s.isWarmup).reduce((sum, s) => sum + s.weight * s.reps, 0);
        }
      }
      setTotalVolume(vol);
    })();
  }, [completedWorkouts]);

  // Streak calculation (consecutive weeks with at least 1 workout)
  const streak = useMemo(() => {
    if (!completedWorkouts || completedWorkouts.length === 0) return 0;
    // Build set of week-start timestamps that have workouts
    const workoutWeeks = new Set(
      completedWorkouts.map((w) =>
        startOfWeek(w.completedAt!, { weekStartsOn: 1 }).getTime()
      )
    );
    let count = 0;
    let week = startOfWeek(new Date(), { weekStartsOn: 1 });
    // If current week has no workout yet, start from previous week
    if (!workoutWeeks.has(week.getTime())) {
      week = subWeeks(week, 1);
    }
    while (workoutWeeks.has(week.getTime())) {
      count++;
      week = subWeeks(week, 1);
    }
    return count;
  }, [completedWorkouts]);

  // Monthly calendar state
  const [calendarMonth, setCalendarMonth] = useState(() => startOfMonth(new Date()));
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);

  // Build month grid with workout day info
  const workoutDaySet = useMemo(() => {
    return new Set(
      (completedWorkouts ?? []).map((w) => startOfDay(w.completedAt!).getTime())
    );
  }, [completedWorkouts]);

  const calendarGrid = useMemo(() => {
    const monthStart = startOfMonth(calendarMonth);
    const monthEnd = endOfMonth(calendarMonth);
    const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });
    const today = startOfDay(new Date());

    // getDay returns 0=Sunday. We want Monday=0. So shift: (getDay + 6) % 7
    const startDayOfWeek = (getDay(monthStart) + 6) % 7;

    // Pad the start with nulls for alignment
    const grid: (null | { date: Date; hasWorkout: boolean; isToday: boolean; inMonth: boolean })[] = [];
    for (let i = 0; i < startDayOfWeek; i++) {
      grid.push(null);
    }
    for (const d of daysInMonth) {
      grid.push({
        date: d,
        hasWorkout: workoutDaySet.has(d.getTime()),
        isToday: isSameDay(d, today),
        inMonth: true,
      });
    }
    // Pad end to fill last row
    while (grid.length % 7 !== 0) {
      grid.push(null);
    }
    return grid;
  }, [calendarMonth, workoutDaySet]);

  // Exercise options
  const exerciseOptions = (exercises ?? [])
    .map((ex) => ({
      value: ex.id,
      label: ex.isCustom ? ex.nameKey : t(ex.nameKey),
    }))
    .sort((a, b) => a.label.localeCompare(b.label));

  const muscleOptions = [
    { value: '', label: t('progress.selectMuscle') },
    ...(muscleGroups ?? []).map((mg) => ({
      value: mg.id,
      label: t(mg.nameKey),
    })),
  ];

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

        const sets = await db.setLogs.where('exerciseLogId').equals(el.id).toArray();
        const workingSets = sets.filter((s) => !s.isWarmup);
        if (workingSets.length === 0) continue;

        const maxW = Math.max(...workingSets.map((s) => s.weight));
        const totalVol = workingSets.reduce((sum, s) => sum + s.weight * s.reps, 0);
        const totalReps = workingSets.reduce((sum, s) => sum + s.reps, 0);

        points.push({
          date: format(workout.completedAt, 'dd MMM', { locale: dateLocale }),
          weight: convertWeight(maxW, settings.weightUnit),
          volume: convertWeight(totalVol, settings.weightUnit),
          reps: totalReps,
        });
      }

      points.sort((a, b) => a.date.localeCompare(b.date));
      setChartData(points);
    };

    loadData();
  }, [selectedExerciseId, period, settings.weightUnit, dateLocale]);

  // Exercise-specific stats
  const maxWeight = chartData.length > 0 ? Math.max(...chartData.map((p) => p.weight)) : 0;
  const avgVolume =
    chartData.length > 0
      ? Math.round(chartData.reduce((sum, p) => sum + p.volume, 0) / chartData.length)
      : 0;

  // 1RM estimate from best set in chart data
  const [best1RM, setBest1RM] = useState(0);
  useEffect(() => {
    if (!selectedExerciseId) {
      setBest1RM(0);
      return;
    }
    (async () => {
      const eLogs = await db.exerciseLogs
        .where('exerciseId')
        .equals(selectedExerciseId)
        .toArray();
      let best = 0;
      for (const el of eLogs) {
        const sets = await db.setLogs.where('exerciseLogId').equals(el.id).toArray();
        for (const s of sets.filter((s) => !s.isWarmup)) {
          const est = estimate1RM(s.weight, s.reps);
          if (est > best) best = est;
        }
      }
      setBest1RM(best);
    })();
  }, [selectedExerciseId]);

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
        {/* Overview stats — always visible */}
        <div className="grid grid-cols-3 gap-3">
          <Card>
            <CardContent className="p-3 text-center">
              <Dumbbell className="h-5 w-5 mx-auto mb-1 text-primary" />
              <p className="text-xl font-bold">{totalWorkouts}</p>
              <p className="text-xs text-muted-foreground">{t('progress.totalWorkouts')}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 text-center">
              <Trophy className="h-5 w-5 mx-auto mb-1 text-warning" />
              <p className="text-xl font-bold">
                {convertWeight(totalVolume, settings.weightUnit).toLocaleString()}
              </p>
              <p className="text-xs text-muted-foreground">
                {t('progress.totalVolAll')} ({settings.weightUnit})
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 text-center">
              <Flame className="h-5 w-5 mx-auto mb-1 text-destructive" />
              <p className="text-xl font-bold">{streak}</p>
              <p className="text-xs text-muted-foreground">{t('progress.streak')}</p>
            </CardContent>
          </Card>
        </div>

        {/* Monthly calendar */}
        <Card>
          <CardContent className="p-3 space-y-2">
            {/* Month navigation */}
            <div className="flex items-center justify-between">
              <Button variant="ghost" size="icon-sm" onClick={() => setCalendarMonth((m) => subMonths(m, 1))}>
                <ChevronLeft className="h-5 w-5" />
              </Button>
              <span className="text-sm font-semibold capitalize">
                {format(calendarMonth, 'LLLL yyyy', { locale: dateLocale })}
              </span>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => setCalendarMonth((m) => addMonths(m, 1))}
                disabled={isSameMonth(calendarMonth, new Date())}
              >
                <ChevronRight className="h-5 w-5" />
              </Button>
            </div>

            {/* Day names header */}
            <div className="grid grid-cols-7 gap-1 text-center">
              {(['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const).map((day) => (
                <span key={day} className="text-[10px] font-medium text-muted-foreground">
                  {t(`progress.day_${day}`)}
                </span>
              ))}
            </div>

            {/* Calendar grid */}
            <div className="grid grid-cols-7 gap-1">
              {calendarGrid.map((cell, i) =>
                cell === null ? (
                  <div key={i} className="aspect-square" />
                ) : (
                  <button
                    key={i}
                    onClick={() => cell.hasWorkout && setSelectedDay(cell.date)}
                    className={`aspect-square rounded-md flex items-center justify-center text-[10px] font-mono transition-colors touch-manipulation ${
                      cell.hasWorkout
                        ? 'bg-primary text-primary-foreground cursor-pointer active:bg-primary/80'
                        : cell.isToday
                          ? 'ring-1 ring-primary text-foreground'
                          : 'bg-secondary/50 text-muted-foreground'
                    }`}
                  >
                    {cell.date.getDate()}
                  </button>
                )
              )}
            </div>
          </CardContent>
        </Card>

        {/* Day detail dialog */}
        {selectedDay && (
          <DayDetailDialog
            date={selectedDay}
            dateLocale={dateLocale}
            onClose={() => setSelectedDay(null)}
          />
        )}

        {/* Muscle heatmap */}
        <MuscleHeatmap />

        {/* Streak grid */}
        <StreakGrid />

        {/* Week comparison */}
        <WeekComparison />

        {/* Achievements */}
        <AchievementsSection />

        {/* Exercise analysis section */}
        <h3 className="text-sm font-medium text-muted-foreground pt-2">
          {t('progress.exerciseAnalysis')}
        </h3>

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

        {/* Exercise-specific stats */}
        {selectedExerciseId && chartData.length > 0 && (
          <div className="grid grid-cols-3 gap-3">
            <Card>
              <CardContent className="p-3 text-center">
                <p className="text-xl font-bold">{maxWeight > 0 ? maxWeight : '—'}</p>
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
                <Calculator className="h-4 w-4 mx-auto mb-0.5 text-primary" />
                <p className="text-xl font-bold">
                  {best1RM > 0 ? convertWeight(best1RM, settings.weightUnit) : '—'}
                </p>
                <p className="text-xs text-muted-foreground">{t('progress.estimated1RM')}</p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* View toggle */}
        {selectedExerciseId && chartData.length > 0 && (
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
        )}

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
                <CardTitle className="text-sm">
                  {t('progress.weightProgress')} ({settings.weightUnit})
                </CardTitle>
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
                <CardTitle className="text-sm">
                  {t('progress.volumeProgress')} ({settings.weightUnit})
                </CardTitle>
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

/* Day detail dialog — shows workouts for a specific day */
function DayDetailDialog({
  date,
  dateLocale,
  onClose,
}: {
  date: Date;
  dateLocale: Locale;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const { settings } = useUIStore();

  type DayWorkout = {
    workout: import('@/types/models').WorkoutLog;
    dayName?: string;
    planName?: string;
    duration: number;
    totalSets: number;
    totalVolume: number;
    isPartial: boolean;
  };

  const [dayWorkouts, setDayWorkouts] = useState<DayWorkout[]>([]);
  const [selectedWorkout, setSelectedWorkout] = useState<DayWorkout | null>(null);

  useEffect(() => {
    (async () => {
      const dayStart = startOfDay(date);

      const allWorkouts = await db.workoutLogs.filter((w) => {
        if (!w.completedAt) return false;
        return isSameDay(startOfDay(w.completedAt), dayStart);
      }).toArray();

      const results: DayWorkout[] = [];
      for (const workout of allWorkouts) {
        const day = workout.dayId ? await db.trainingDays.get(workout.dayId) : null;
        const plan = workout.planId ? await db.trainingPlans.get(workout.planId) : null;

        const dur = workout.startedAt && workout.completedAt
          ? workout.completedAt.getTime() - workout.startedAt.getTime()
          : 0;

        const eLogs = await db.exerciseLogs.where('workoutLogId').equals(workout.id).toArray();
        let totalSets = 0;
        let totalVolume = 0;
        let isPartial = false;
        for (const el of eLogs) {
          const sets = await db.setLogs.where('exerciseLogId').equals(el.id).toArray();
          const working = sets.filter((s) => !s.isWarmup);
          if (working.length === 0) isPartial = true;
          totalSets += working.length;
          totalVolume += working.reduce((sum, s) => sum + s.weight * s.reps, 0);
        }

        results.push({
          workout,
          dayName: day?.name,
          planName: plan?.name,
          duration: dur,
          totalSets,
          totalVolume,
          isPartial,
        });
      }
      setDayWorkouts(results);
    })();
  }, [date]);

  if (selectedWorkout) {
    return (
      <WorkoutDetailDialog
        workout={{ ...selectedWorkout.workout, dayName: selectedWorkout.dayName, planName: selectedWorkout.planName }}
        onClose={() => setSelectedWorkout(null)}
      />
    );
  }

  return (
    <Dialog open onClose={onClose}>
      <DialogHeader onClose={onClose}>
        {format(date, 'd MMMM yyyy', { locale: dateLocale })}
      </DialogHeader>
      <div className="p-4 space-y-2">
        {dayWorkouts.length === 0 ? (
          <p className="text-center text-muted-foreground text-sm py-4">
            {t('progress.noExerciseData')}
          </p>
        ) : (
          dayWorkouts.map((dw) => (
            <Card
              key={dw.workout.id}
              className="cursor-pointer active:scale-[0.98] transition-transform touch-manipulation"
              onClick={() => setSelectedWorkout(dw)}
            >
              <CardContent className="p-3 space-y-1.5">
                <div className="flex items-center gap-2">
                  <div
                    className={`h-9 w-9 rounded-lg flex items-center justify-center shrink-0 ${
                      dw.isPartial
                        ? 'bg-warning/10 text-warning'
                        : 'bg-success/10 text-success'
                    }`}
                  >
                    <Dumbbell className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {dw.dayName ?? t('workout.title')}
                    </p>
                    {dw.planName && (
                      <p className="text-[10px] text-muted-foreground truncate">{dw.planName}</p>
                    )}
                  </div>
                  {dw.workout.rating && (
                    <span className="text-xs text-warning shrink-0">
                      {'★'.repeat(dw.workout.rating)}
                    </span>
                  )}
                  <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                </div>
                <div className="flex items-center gap-3 text-xs text-muted-foreground pl-11">
                  {dw.duration > 0 && (
                    <span className="flex items-center gap-0.5">
                      <Clock className="h-3 w-3" />
                      {formatDuration(dw.duration)}
                    </span>
                  )}
                  <span>{dw.totalSets} {t('workout.totalSets').toLowerCase()}</span>
                  <span>
                    {convertWeight(dw.totalVolume, settings.weightUnit).toLocaleString()} {settings.weightUnit}
                  </span>
                  {dw.isPartial && (
                    <span className="text-warning">{t('workout.partial')}</span>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </Dialog>
  );
}
