import Dexie, { type EntityTable } from 'dexie';
import type {
  MuscleGroup,
  Exercise,
  TrainingPlan,
  TrainingDay,
  PlannedExercise,
  WorkoutLog,
  ExerciseLog,
  SetLog,
  BodyMeasurement,
} from '@/types/models';

class GymDatabase extends Dexie {
  muscleGroups!: EntityTable<MuscleGroup, 'id'>;
  exercises!: EntityTable<Exercise, 'id'>;
  trainingPlans!: EntityTable<TrainingPlan, 'id'>;
  trainingDays!: EntityTable<TrainingDay, 'id'>;
  plannedExercises!: EntityTable<PlannedExercise, 'id'>;
  workoutLogs!: EntityTable<WorkoutLog, 'id'>;
  exerciseLogs!: EntityTable<ExerciseLog, 'id'>;
  setLogs!: EntityTable<SetLog, 'id'>;
  bodyMeasurements!: EntityTable<BodyMeasurement, 'id'>;

  constructor() {
    super('GymTrackerDB');

    this.version(2).stores({
      muscleGroups: 'id, nameKey',
      exercises: 'id, nameKey, isCustom, *muscleGroupIds',
      trainingPlans: 'id, isActive, createdAt',
      trainingDays: 'id, planId, order',
      plannedExercises: 'id, dayId, exerciseId, order',
      workoutLogs: 'id, dayId, planId, startedAt, completedAt, [planId+startedAt]',
      exerciseLogs: 'id, workoutLogId, exerciseId',
      setLogs: 'id, exerciseLogId',
    });

    this.version(3).stores({
      muscleGroups: 'id, nameKey',
      exercises: 'id, nameKey, isCustom, isFavorite, *muscleGroupIds',
      trainingPlans: 'id, isActive, createdAt',
      trainingDays: 'id, planId, order',
      plannedExercises: 'id, dayId, exerciseId, order',
      workoutLogs: 'id, dayId, planId, startedAt, completedAt, [planId+startedAt]',
      exerciseLogs: 'id, workoutLogId, exerciseId',
      setLogs: 'id, exerciseLogId',
    });

    this.version(4).stores({
      muscleGroups: 'id, nameKey',
      exercises: 'id, nameKey, isCustom, isFavorite, *muscleGroupIds',
      trainingPlans: 'id, isActive, createdAt',
      trainingDays: 'id, planId, order',
      plannedExercises: 'id, dayId, exerciseId, order',
      workoutLogs: 'id, dayId, planId, startedAt, completedAt, [planId+startedAt]',
      exerciseLogs: 'id, workoutLogId, exerciseId',
      setLogs: 'id, exerciseLogId',
      bodyMeasurements: 'id, date',
    });

    // v5: optional new fields (supersetGroup, readiness, phases, isTimeBased) — no index changes needed
    this.version(5).stores({
      muscleGroups: 'id, nameKey',
      exercises: 'id, nameKey, isCustom, isFavorite, *muscleGroupIds',
      trainingPlans: 'id, isActive, createdAt',
      trainingDays: 'id, planId, order',
      plannedExercises: 'id, dayId, exerciseId, order',
      workoutLogs: 'id, dayId, planId, startedAt, completedAt, [planId+startedAt]',
      exerciseLogs: 'id, workoutLogId, exerciseId',
      setLogs: 'id, exerciseLogId',
      bodyMeasurements: 'id, date',
    });
  }
}

export const db = new GymDatabase();
