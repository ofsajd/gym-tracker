import { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { subWeeks, startOfWeek, addDays, startOfDay, format } from 'date-fns';
import { pl, enUS } from 'date-fns/locale';
import { db } from '@/db/schema';
import { Card, CardContent } from '@/components/ui/card';
import { useUIStore } from '@/stores/ui-store';

const WEEKS = 26; // ~6 months

export function StreakGrid() {
  const { t } = useTranslation();
  const { settings } = useUIStore();
  const dateLocale = settings.language === 'pl' ? pl : enUS;
  const [workoutDays, setWorkoutDays] = useState<Map<number, number>>(new Map());

  useEffect(() => {
    (async () => {
      const fromDate = subWeeks(new Date(), WEEKS);
      const workouts = await db.workoutLogs
        .filter((w) => !!w.completedAt && w.completedAt >= fromDate)
        .toArray();

      const dayMap = new Map<number, number>();
      for (const w of workouts) {
        const day = startOfDay(w.completedAt!).getTime();
        dayMap.set(day, (dayMap.get(day) || 0) + 1);
      }
      setWorkoutDays(dayMap);
    })();
  }, []);

  // Build grid: WEEKS columns × 7 rows (Mon–Sun)
  const grid = useMemo(() => {
    const today = startOfDay(new Date());
    const gridStart = startOfWeek(subWeeks(today, WEEKS - 1), { weekStartsOn: 1 });
    const cells: Array<{ date: Date; count: number }> = [];

    for (let w = 0; w < WEEKS; w++) {
      for (let d = 0; d < 7; d++) {
        const date = addDays(startOfWeek(addDays(gridStart, w * 7), { weekStartsOn: 1 }), d);
        if (date > today) {
          cells.push({ date, count: -1 }); // future
        } else {
          const ts = startOfDay(date).getTime();
          cells.push({ date, count: workoutDays.get(ts) || 0 });
        }
      }
    }
    return cells;
  }, [workoutDays]);

  // Month labels
  const monthLabels = useMemo(() => {
    const today = startOfDay(new Date());
    const gridStart = startOfWeek(subWeeks(today, WEEKS - 1), { weekStartsOn: 1 });
    const labels: Array<{ label: string; col: number }> = [];
    let lastMonth = -1;

    for (let w = 0; w < WEEKS; w++) {
      const weekDate = addDays(gridStart, w * 7);
      const month = weekDate.getMonth();
      if (month !== lastMonth) {
        labels.push({
          label: format(weekDate, 'LLL', { locale: dateLocale }),
          col: w,
        });
        lastMonth = month;
      }
    }
    return labels;
  }, [dateLocale]);

  const totalInPeriod = [...workoutDays.values()].reduce((a, b) => a + b, 0);

  const getIntensityClass = (count: number) => {
    if (count < 0) return 'bg-transparent';
    if (count === 0) return 'bg-secondary/60';
    if (count === 1) return 'bg-primary/30';
    if (count === 2) return 'bg-primary/60';
    return 'bg-primary';
  };

  const dayLabels = ['', t('progress.day_tue'), '', t('progress.day_thu'), '', t('progress.day_sat'), ''];

  return (
    <Card>
      <CardContent className="p-3 space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium text-muted-foreground">{t('progress.streakTracker')}</h3>
          <span className="text-xs text-muted-foreground">
            {totalInPeriod} {t('progress.workoutsInPeriod')}
          </span>
        </div>

        <div className="overflow-x-auto">
          {/* Month labels */}
          <div className="flex ml-6">
            {monthLabels.map((m, i) => (
              <span
                key={i}
                className="text-[9px] text-muted-foreground capitalize"
                style={{
                  position: 'relative',
                  left: `${m.col * 12}px`,
                  marginRight: i < monthLabels.length - 1
                    ? `${(monthLabels[i + 1]?.col - m.col) * 12 - 24}px`
                    : 0,
                }}
              >
                {m.label}
              </span>
            ))}
          </div>

          <div className="flex gap-0">
            {/* Day labels */}
            <div className="flex flex-col gap-[2px] mr-1 shrink-0">
              {dayLabels.map((label, i) => (
                <span key={i} className="text-[9px] text-muted-foreground h-[10px] w-5 text-right leading-[10px]">
                  {label}
                </span>
              ))}
            </div>

            {/* Grid */}
            <div
              className="grid gap-[2px]"
              style={{
                gridTemplateRows: 'repeat(7, 10px)',
                gridTemplateColumns: `repeat(${WEEKS}, 10px)`,
                gridAutoFlow: 'column',
              }}
            >
              {grid.map((cell, i) => (
                <div
                  key={i}
                  className={`rounded-[2px] ${getIntensityClass(cell.count)}`}
                  title={
                    cell.count >= 0
                      ? `${format(cell.date, 'dd MMM yyyy', { locale: dateLocale })}: ${cell.count} ${t('progress.totalWorkouts').toLowerCase()}`
                      : ''
                  }
                />
              ))}
            </div>
          </div>

          {/* Legend */}
          <div className="flex items-center gap-1 mt-1.5 justify-end">
            <span className="text-[9px] text-muted-foreground">{t('progress.less')}</span>
            {[0, 1, 2, 3].map((level) => (
              <div
                key={level}
                className={`h-[10px] w-[10px] rounded-[2px] ${getIntensityClass(level)}`}
              />
            ))}
            <span className="text-[9px] text-muted-foreground">{t('progress.more')}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
