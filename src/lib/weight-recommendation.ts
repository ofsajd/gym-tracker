import { db } from '@/db/schema';
import type { SetLog, Exercise, WeightRecommendation } from '@/types/models';

// Upper body muscle groups get smaller increments
const UPPER_BODY_GROUPS = ['mg-chest', 'mg-back', 'mg-shoulders', 'mg-biceps', 'mg-triceps', 'mg-forearms', 'mg-traps'];
const LOWER_BODY_GROUPS = ['mg-quads', 'mg-hamstrings', 'mg-glutes', 'mg-calves'];

function getIncrement(exercise: Exercise): number {
  const hasLower = exercise.muscleGroupIds.some((id) => LOWER_BODY_GROUPS.includes(id));
  const hasUpper = exercise.muscleGroupIds.some((id) => UPPER_BODY_GROUPS.includes(id));
  // Primary = first muscle group listed
  if (hasLower && !hasUpper) return 5;
  if (hasLower && hasUpper) return 2.5; // compound like deadlift
  return 2.5;
}

export async function getWeightRecommendation(
  exerciseId: string,
  targetReps: string
): Promise<WeightRecommendation | null> {
  // Get exercise for muscle group info
  const exercise = await db.exercises.get(exerciseId);
  if (!exercise) return null;

  // Get last 5 exercise logs for this exercise
  const exerciseLogs = await db.exerciseLogs
    .where('exerciseId')
    .equals(exerciseId)
    .toArray();

  if (exerciseLogs.length === 0) return null;

  // Get workout logs to sort by date
  const workoutIds = [...new Set(exerciseLogs.map((el) => el.workoutLogId))];
  const workoutLogs = await db.workoutLogs.bulkGet(workoutIds);
  
  // Sort exercise logs by workout date (most recent first)
  const sortedLogs = exerciseLogs
    .map((el) => ({
      ...el,
      workout: workoutLogs.find((wl) => wl?.id === el.workoutLogId),
    }))
    .filter((el) => el.workout?.completedAt)
    .sort((a, b) => {
      const aDate = a.workout!.completedAt!.getTime();
      const bDate = b.workout!.completedAt!.getTime();
      return bDate - aDate;
    })
    .slice(0, 5);

  if (sortedLogs.length === 0) return null;

  // Get set logs for the most recent session
  const lastLog = sortedLogs[0];
  const lastSets = await db.setLogs
    .where('exerciseLogId')
    .equals(lastLog.id)
    .toArray();

  const workingSets = lastSets.filter((s) => !s.isWarmup).sort((a, b) => a.setNumber - b.setNumber);

  if (workingSets.length === 0) return null;

  // Parse target reps range
  const [minReps, maxReps] = parseRepRange(targetReps);
  const lastWeight = workingSets[0].weight;
  const increment = getIncrement(exercise);

  // Check if all sets were completed within rep range
  const allInRange = workingSets.every((s) => s.reps >= minReps && s.reps <= maxReps);
  const allAboveMin = workingSets.every((s) => s.reps >= minReps);
  const anyBelowMin = workingSets.some((s) => s.reps < minReps);

  if (allInRange && workingSets.every((s) => s.reps >= maxReps)) {
    // All sets at top of range — increase
    return {
      weight: lastWeight + increment,
      direction: 'increase',
    };
  } else if (allAboveMin) {
    // All sets at or above minimum reps — maintain
    return {
      weight: lastWeight,
      direction: 'maintain',
    };
  } else if (anyBelowMin) {
    // Some sets below minimum — check how many
    const failedCount = workingSets.filter((s) => s.reps < minReps).length;
    if (failedCount >= workingSets.length / 2) {
      // Failed more than half — deload
      return {
        weight: Math.round((lastWeight * 0.9) / 2.5) * 2.5, // Round down to nearest 2.5
        direction: 'deload',
      };
    }
    return {
      weight: lastWeight,
      direction: 'maintain',
    };
  }

  return {
    weight: lastWeight,
    direction: 'maintain',
  };
}

function parseRepRange(repStr: string): [number, number] {
  const parts = repStr.split('-').map((p) => parseInt(p.trim(), 10));
  if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
    return [parts[0], parts[1]];
  }
  const single = parseInt(repStr, 10);
  if (!isNaN(single)) return [single, single];
  return [8, 12]; // Default
}

export async function getLastSetsForExercise(exerciseId: string): Promise<SetLog[]> {
  const exerciseLogs = await db.exerciseLogs
    .where('exerciseId')
    .equals(exerciseId)
    .toArray();

  if (exerciseLogs.length === 0) return [];

  const workoutIds = [...new Set(exerciseLogs.map((el) => el.workoutLogId))];
  const workoutLogs = await db.workoutLogs.bulkGet(workoutIds);

  const sortedLogs = exerciseLogs
    .map((el) => ({
      ...el,
      workout: workoutLogs.find((wl) => wl?.id === el.workoutLogId),
    }))
    .filter((el) => el.workout?.completedAt)
    .sort((a, b) => {
      const aDate = a.workout!.completedAt!.getTime();
      const bDate = b.workout!.completedAt!.getTime();
      return bDate - aDate;
    });

  if (sortedLogs.length === 0) return [];

  return db.setLogs
    .where('exerciseLogId')
    .equals(sortedLogs[0].id)
    .sortBy('setNumber');
}
