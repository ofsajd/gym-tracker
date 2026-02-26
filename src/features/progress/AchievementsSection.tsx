import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { db } from '@/db/schema';
import { Card, CardContent } from '@/components/ui/card';

type Achievement = {
  id: string;
  icon: string;
  titleKey: string;
  descKey: string;
  unlocked: boolean;
  progress?: string;
};

export function AchievementsSection() {
  const { t } = useTranslation();
  const [achievements, setAchievements] = useState<Achievement[]>([]);

  useEffect(() => {
    (async () => {
      const allWorkouts = await db.workoutLogs.filter((w) => !!w.completedAt).toArray();
      const totalWorkouts = allWorkouts.length;

      // Streak calculation (week-based)
      const { startOfWeek, subWeeks } = await import('date-fns');
      const workoutWeeks = new Set(
        allWorkouts.map((w) => startOfWeek(w.completedAt!, { weekStartsOn: 1 }).getTime())
      );
      let streak = 0;
      let week = startOfWeek(new Date(), { weekStartsOn: 1 });
      if (!workoutWeeks.has(week.getTime())) {
        week = subWeeks(week, 1);
      }
      while (workoutWeeks.has(week.getTime())) {
        streak++;
        week = subWeeks(week, 1);
      }

      // Max week streak ever
      const sortedWeeks = [...workoutWeeks].sort((a, b) => a - b);
      let maxStreak = 0;
      let currentStreak = 1;
      const ONE_WEEK = 7 * 86400000;
      for (let i = 1; i < sortedWeeks.length; i++) {
        const diff = sortedWeeks[i] - sortedWeeks[i - 1];
        if (diff === ONE_WEEK) {
          currentStreak++;
        } else {
          maxStreak = Math.max(maxStreak, currentStreak);
          currentStreak = 1;
        }
      }
      maxStreak = Math.max(maxStreak, currentStreak);

      // Total volume
      const allSetLogs = await db.setLogs.toArray();
      const totalVolume = allSetLogs
        .filter((s) => !s.isWarmup)
        .reduce((sum, s) => sum + s.weight * s.reps, 0);

      // Unique exercises
      const allExLogs = await db.exerciseLogs.toArray();
      const uniqueExercises = new Set(allExLogs.map((e) => e.exerciseId));

      // Unique workout days of the week
      const daysOfWeek = new Set(
        allWorkouts.map((w) => w.completedAt!.getDay())
      );

      const achList: Achievement[] = [
        {
          id: 'first_workout',
          icon: '🎯',
          titleKey: 'achievements.firstWorkout',
          descKey: 'achievements.firstWorkoutDesc',
          unlocked: totalWorkouts >= 1,
          progress: `${Math.min(totalWorkouts, 1)}/1`,
        },
        {
          id: 'ten_workouts',
          icon: '💪',
          titleKey: 'achievements.tenWorkouts',
          descKey: 'achievements.tenWorkoutsDesc',
          unlocked: totalWorkouts >= 10,
          progress: `${Math.min(totalWorkouts, 10)}/10`,
        },
        {
          id: 'fifty_workouts',
          icon: '🔥',
          titleKey: 'achievements.fiftyWorkouts',
          descKey: 'achievements.fiftyWorkoutsDesc',
          unlocked: totalWorkouts >= 50,
          progress: `${Math.min(totalWorkouts, 50)}/50`,
        },
        {
          id: 'hundred_workouts',
          icon: '👑',
          titleKey: 'achievements.hundredWorkouts',
          descKey: 'achievements.hundredWorkoutsDesc',
          unlocked: totalWorkouts >= 100,
          progress: `${Math.min(totalWorkouts, 100)}/100`,
        },
        {
          id: 'streak_3',
          icon: '🔥',
          titleKey: 'achievements.streak3',
          descKey: 'achievements.streak3Desc',
          unlocked: maxStreak >= 3,
          progress: `${Math.min(maxStreak, 3)}/3`,
        },
        {
          id: 'streak_8',
          icon: '⚡',
          titleKey: 'achievements.streak8',
          descKey: 'achievements.streak8Desc',
          unlocked: maxStreak >= 8,
          progress: `${Math.min(maxStreak, 8)}/8`,
        },
        {
          id: 'streak_12',
          icon: '🏆',
          titleKey: 'achievements.streak12',
          descKey: 'achievements.streak12Desc',
          unlocked: maxStreak >= 12,
          progress: `${Math.min(maxStreak, 12)}/12`,
        },
        {
          id: 'volume_1000',
          icon: '🏋️',
          titleKey: 'achievements.volume1000',
          descKey: 'achievements.volume1000Desc',
          unlocked: totalVolume >= 1000000,
          progress: `${Math.floor(totalVolume / 1000).toLocaleString()}/1,000,000 kg`,
        },
        {
          id: 'variety_10',
          icon: '🎨',
          titleKey: 'achievements.variety10',
          descKey: 'achievements.variety10Desc',
          unlocked: uniqueExercises.size >= 10,
          progress: `${Math.min(uniqueExercises.size, 10)}/10`,
        },
        {
          id: 'variety_30',
          icon: '🌈',
          titleKey: 'achievements.variety30',
          descKey: 'achievements.variety30Desc',
          unlocked: uniqueExercises.size >= 30,
          progress: `${Math.min(uniqueExercises.size, 30)}/30`,
        },
        {
          id: 'every_day_type',
          icon: '📅',
          titleKey: 'achievements.everyDayType',
          descKey: 'achievements.everyDayTypeDesc',
          unlocked: daysOfWeek.size >= 7,
          progress: `${daysOfWeek.size}/7`,
        },
      ];

      setAchievements(achList);
    })();
  }, []);

  const unlocked = achievements.filter((a) => a.unlocked).length;

  if (achievements.length === 0) return null;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-muted-foreground">{t('achievements.title')}</h3>
        <span className="text-xs text-muted-foreground">
          {unlocked}/{achievements.length}
        </span>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {achievements.map((ach) => (
          <Card
            key={ach.id}
            className={ach.unlocked ? '' : 'opacity-40'}
          >
            <CardContent className="p-3 text-center">
              <span className="text-2xl">{ach.icon}</span>
              <p className="text-xs font-medium mt-1">{t(ach.titleKey)}</p>
              <p className="text-[10px] text-muted-foreground">{t(ach.descKey)}</p>
              {ach.progress && (
                <p className="text-[10px] font-mono text-primary mt-0.5">{ach.progress}</p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
