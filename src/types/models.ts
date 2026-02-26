export type MuscleGroup = {
  id: string;
  nameKey: string; // i18n key, e.g. "muscles.chest"
};

export type Exercise = {
  id: string;
  nameKey: string; // i18n key for built-in, raw name for custom
  muscleGroupIds: string[]; // first element is the primary muscle group
  isCustom: boolean;
  isFavorite?: boolean;
  notes?: string;
  description?: string; // for custom exercises
  videoUrl?: string; // optional tutorial video link
};

export type PeriodizationPhase = {
  name: string;
  type: 'strength' | 'hypertrophy' | 'endurance' | 'deload';
  weeks: number;
};

export type TrainingPlan = {
  id: string;
  name: string;
  description?: string;
  weekCount: number;
  createdAt: Date;
  updatedAt: Date;
  isActive: boolean;
  phases?: PeriodizationPhase[];
};

export type TrainingDay = {
  id: string;
  planId: string;
  name: string;
  order: number;
};

export type PlannedExercise = {
  id: string;
  dayId: string;
  exerciseId: string;
  order: number;
  targetSets: number;
  targetReps: string; // e.g. "8-12"
  initialWeight?: number; // starting weight in kg for first workout
  defaultProgression?: number; // weight increment per session in kg (e.g. 0.5)
  restSeconds?: number;
  notes?: string;
  supersetGroup?: number; // exercises with the same group number form a superset
};

export type WorkoutLog = {
  id: string;
  dayId?: string;
  planId?: string;
  weekNumber?: number;
  startedAt: Date;
  completedAt?: Date;
  notes?: string;
  bodyweight?: number;
  readinessEnergy?: number; // 1-5
  readinessSleep?: number;  // 1-5
  rating?: number;          // 1-5 post-workout self-assessment
};

export type ExerciseLog = {
  id: string;
  workoutLogId: string;
  exerciseId: string;
  order: number;
  startedAt?: Date;
  completedAt?: Date;
  supersetGroup?: number;
};

export type SetLog = {
  id: string;
  exerciseLogId: string;
  setNumber: number;
  weight: number; // always in kg
  reps: number;
  rpe?: number;
  isWarmup: boolean;
  completedAt: Date;
  isTimeBased?: boolean; // true for planks/isometrics — reps stores seconds
};

export type WeightUnit = 'kg' | 'lbs';
export type ThemeMode = 'light' | 'dark' | 'system';
export type Language = 'pl' | 'en';

export type AppSettings = {
  weightUnit: WeightUnit;
  theme: ThemeMode;
  language: Language;
  restTimerSeconds: number;
  restTimerSound: boolean;
  restTimerVibrate: boolean;
  pushNotifications: boolean;
};

export type WeightRecommendation = {
  weight: number;
  direction: 'increase' | 'maintain' | 'deload';
};

export type ExportPlanData = {
  version: number;
  exportedAt: string;
  plan: TrainingPlan;
  days: TrainingDay[];
  plannedExercises: PlannedExercise[];
  exercises: Exercise[];
};

export type ExportFullData = {
  version: number;
  exportedAt: string;
  plans: TrainingPlan[];
  days: TrainingDay[];
  plannedExercises: PlannedExercise[];
  exercises: Exercise[];
  muscleGroups: MuscleGroup[];
  workoutLogs: WorkoutLog[];
  exerciseLogs: ExerciseLog[];
  setLogs: SetLog[];
  bodyMeasurements?: BodyMeasurement[];
  settings: AppSettings;
};

export type BodyMeasurement = {
  id: string;
  date: Date;
  bodyweight?: number; // kg
  chest?: number; // cm
  waist?: number; // cm
  hips?: number; // cm
  bicepLeft?: number;
  bicepRight?: number;
  thighLeft?: number;
  thighRight?: number;
  calfLeft?: number;
  calfRight?: number;
  neck?: number;
  bodyFatPercent?: number;
  notes?: string;
};
