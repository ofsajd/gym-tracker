import { db } from './schema';
import { exerciseVideoUrls } from './exercise-videos';
import type { MuscleGroup, Exercise } from '@/types/models';

const MUSCLE_GROUPS: MuscleGroup[] = [
  { id: 'mg-chest', nameKey: 'muscles.chest' },
  { id: 'mg-back', nameKey: 'muscles.back' },
  { id: 'mg-shoulders', nameKey: 'muscles.shoulders' },
  { id: 'mg-biceps', nameKey: 'muscles.biceps' },
  { id: 'mg-triceps', nameKey: 'muscles.triceps' },
  { id: 'mg-quads', nameKey: 'muscles.quads' },
  { id: 'mg-hamstrings', nameKey: 'muscles.hamstrings' },
  { id: 'mg-glutes', nameKey: 'muscles.glutes' },
  { id: 'mg-calves', nameKey: 'muscles.calves' },
  { id: 'mg-abs', nameKey: 'muscles.abs' },
  { id: 'mg-forearms', nameKey: 'muscles.forearms' },
  { id: 'mg-traps', nameKey: 'muscles.traps' },
];

const EXERCISES: Exercise[] = [
  // Chest
  { id: 'ex-bench-press', nameKey: 'exercises.benchPress', muscleGroupIds: ['mg-chest', 'mg-triceps', 'mg-shoulders'], isCustom: false },
  { id: 'ex-incline-bench', nameKey: 'exercises.inclineBenchPress', muscleGroupIds: ['mg-chest', 'mg-triceps', 'mg-shoulders'], isCustom: false },
  { id: 'ex-decline-bench', nameKey: 'exercises.declineBenchPress', muscleGroupIds: ['mg-chest', 'mg-triceps'], isCustom: false },
  { id: 'ex-db-bench', nameKey: 'exercises.dumbbellBenchPress', muscleGroupIds: ['mg-chest', 'mg-triceps'], isCustom: false },
  { id: 'ex-db-incline-bench', nameKey: 'exercises.dumbbellInclineBench', muscleGroupIds: ['mg-chest', 'mg-triceps', 'mg-shoulders'], isCustom: false },
  { id: 'ex-chest-fly', nameKey: 'exercises.chestFly', muscleGroupIds: ['mg-chest'], isCustom: false },
  { id: 'ex-cable-crossover', nameKey: 'exercises.cableCrossover', muscleGroupIds: ['mg-chest'], isCustom: false },
  { id: 'ex-dips-chest', nameKey: 'exercises.dipsChest', muscleGroupIds: ['mg-chest', 'mg-triceps'], isCustom: false },
  { id: 'ex-push-ups', nameKey: 'exercises.pushUps', muscleGroupIds: ['mg-chest', 'mg-triceps', 'mg-shoulders'], isCustom: false },
  { id: 'ex-chest-press-machine', nameKey: 'exercises.chestPressMachine', muscleGroupIds: ['mg-chest', 'mg-triceps'], isCustom: false },

  // Back
  { id: 'ex-deadlift', nameKey: 'exercises.deadlift', muscleGroupIds: ['mg-back', 'mg-hamstrings', 'mg-glutes'], isCustom: false },
  { id: 'ex-barbell-row', nameKey: 'exercises.barbellRow', muscleGroupIds: ['mg-back', 'mg-biceps'], isCustom: false },
  { id: 'ex-db-row', nameKey: 'exercises.dumbbellRow', muscleGroupIds: ['mg-back', 'mg-biceps'], isCustom: false },
  { id: 'ex-pull-ups', nameKey: 'exercises.pullUps', muscleGroupIds: ['mg-back', 'mg-biceps'], isCustom: false },
  { id: 'ex-chin-ups', nameKey: 'exercises.chinUps', muscleGroupIds: ['mg-back', 'mg-biceps'], isCustom: false },
  { id: 'ex-lat-pulldown', nameKey: 'exercises.latPulldown', muscleGroupIds: ['mg-back', 'mg-biceps'], isCustom: false },
  { id: 'ex-seated-row', nameKey: 'exercises.seatedRow', muscleGroupIds: ['mg-back', 'mg-biceps'], isCustom: false },
  { id: 'ex-cable-row', nameKey: 'exercises.cableRow', muscleGroupIds: ['mg-back'], isCustom: false },
  { id: 'ex-t-bar-row', nameKey: 'exercises.tBarRow', muscleGroupIds: ['mg-back', 'mg-biceps'], isCustom: false },
  { id: 'ex-face-pull', nameKey: 'exercises.facePull', muscleGroupIds: ['mg-shoulders', 'mg-back'], isCustom: false },

  // Shoulders
  { id: 'ex-ohp', nameKey: 'exercises.overheadPress', muscleGroupIds: ['mg-shoulders', 'mg-triceps'], isCustom: false },
  { id: 'ex-db-shoulder-press', nameKey: 'exercises.dumbbellShoulderPress', muscleGroupIds: ['mg-shoulders', 'mg-triceps'], isCustom: false },
  { id: 'ex-lateral-raise', nameKey: 'exercises.lateralRaise', muscleGroupIds: ['mg-shoulders'], isCustom: false },
  { id: 'ex-front-raise', nameKey: 'exercises.frontRaise', muscleGroupIds: ['mg-shoulders'], isCustom: false },
  { id: 'ex-rear-delt-fly', nameKey: 'exercises.rearDeltFly', muscleGroupIds: ['mg-shoulders', 'mg-back'], isCustom: false },
  { id: 'ex-upright-row', nameKey: 'exercises.uprightRow', muscleGroupIds: ['mg-shoulders', 'mg-traps'], isCustom: false },
  { id: 'ex-arnold-press', nameKey: 'exercises.arnoldPress', muscleGroupIds: ['mg-shoulders', 'mg-triceps'], isCustom: false },

  // Biceps
  { id: 'ex-barbell-curl', nameKey: 'exercises.barbellCurl', muscleGroupIds: ['mg-biceps'], isCustom: false },
  { id: 'ex-db-curl', nameKey: 'exercises.dumbbellCurl', muscleGroupIds: ['mg-biceps'], isCustom: false },
  { id: 'ex-hammer-curl', nameKey: 'exercises.hammerCurl', muscleGroupIds: ['mg-biceps', 'mg-forearms'], isCustom: false },
  { id: 'ex-preacher-curl', nameKey: 'exercises.preacherCurl', muscleGroupIds: ['mg-biceps'], isCustom: false },
  { id: 'ex-concentration-curl', nameKey: 'exercises.concentrationCurl', muscleGroupIds: ['mg-biceps'], isCustom: false },
  { id: 'ex-cable-curl', nameKey: 'exercises.cableCurl', muscleGroupIds: ['mg-biceps'], isCustom: false },

  // Triceps
  { id: 'ex-tricep-pushdown', nameKey: 'exercises.tricepPushdown', muscleGroupIds: ['mg-triceps'], isCustom: false },
  { id: 'ex-overhead-tricep', nameKey: 'exercises.overheadTricepExtension', muscleGroupIds: ['mg-triceps'], isCustom: false },
  { id: 'ex-skull-crushers', nameKey: 'exercises.skullCrushers', muscleGroupIds: ['mg-triceps'], isCustom: false },
  { id: 'ex-close-grip-bench', nameKey: 'exercises.closeGripBenchPress', muscleGroupIds: ['mg-triceps', 'mg-chest'], isCustom: false },
  { id: 'ex-dips-tricep', nameKey: 'exercises.dipsTricep', muscleGroupIds: ['mg-triceps'], isCustom: false },
  { id: 'ex-kickbacks', nameKey: 'exercises.kickbacks', muscleGroupIds: ['mg-triceps'], isCustom: false },

  // Quads
  { id: 'ex-squat', nameKey: 'exercises.squat', muscleGroupIds: ['mg-quads', 'mg-glutes'], isCustom: false },
  { id: 'ex-front-squat', nameKey: 'exercises.frontSquat', muscleGroupIds: ['mg-quads'], isCustom: false },
  { id: 'ex-leg-press', nameKey: 'exercises.legPress', muscleGroupIds: ['mg-quads', 'mg-glutes'], isCustom: false },
  { id: 'ex-leg-extension', nameKey: 'exercises.legExtension', muscleGroupIds: ['mg-quads'], isCustom: false },
  { id: 'ex-lunges', nameKey: 'exercises.lunges', muscleGroupIds: ['mg-quads', 'mg-glutes'], isCustom: false },
  { id: 'ex-bulgarian-split', nameKey: 'exercises.bulgarianSplitSquat', muscleGroupIds: ['mg-quads', 'mg-glutes'], isCustom: false },
  { id: 'ex-hack-squat', nameKey: 'exercises.hackSquat', muscleGroupIds: ['mg-quads'], isCustom: false },
  { id: 'ex-goblet-squat', nameKey: 'exercises.gobletSquat', muscleGroupIds: ['mg-quads', 'mg-glutes'], isCustom: false },

  // Hamstrings
  { id: 'ex-romanian-deadlift', nameKey: 'exercises.romanianDeadlift', muscleGroupIds: ['mg-hamstrings', 'mg-glutes'], isCustom: false },
  { id: 'ex-leg-curl', nameKey: 'exercises.legCurl', muscleGroupIds: ['mg-hamstrings'], isCustom: false },
  { id: 'ex-stiff-leg-deadlift', nameKey: 'exercises.stiffLegDeadlift', muscleGroupIds: ['mg-hamstrings', 'mg-glutes', 'mg-back'], isCustom: false },
  { id: 'ex-good-mornings', nameKey: 'exercises.goodMornings', muscleGroupIds: ['mg-hamstrings', 'mg-back'], isCustom: false },

  // Glutes
  { id: 'ex-hip-thrust', nameKey: 'exercises.hipThrust', muscleGroupIds: ['mg-glutes', 'mg-hamstrings'], isCustom: false },
  { id: 'ex-glute-bridge', nameKey: 'exercises.gluteBridge', muscleGroupIds: ['mg-glutes'], isCustom: false },
  { id: 'ex-cable-kickback', nameKey: 'exercises.cableKickback', muscleGroupIds: ['mg-glutes'], isCustom: false },
  { id: 'ex-hip-abduction', nameKey: 'exercises.hipAbduction', muscleGroupIds: ['mg-glutes'], isCustom: false },

  // Calves
  { id: 'ex-calf-raise-standing', nameKey: 'exercises.standingCalfRaise', muscleGroupIds: ['mg-calves'], isCustom: false },
  { id: 'ex-calf-raise-seated', nameKey: 'exercises.seatedCalfRaise', muscleGroupIds: ['mg-calves'], isCustom: false },

  // Abs
  { id: 'ex-crunch', nameKey: 'exercises.crunch', muscleGroupIds: ['mg-abs'], isCustom: false },
  { id: 'ex-plank', nameKey: 'exercises.plank', muscleGroupIds: ['mg-abs'], isCustom: false },
  { id: 'ex-hanging-leg-raise', nameKey: 'exercises.hangingLegRaise', muscleGroupIds: ['mg-abs'], isCustom: false },
  { id: 'ex-cable-crunch', nameKey: 'exercises.cableCrunch', muscleGroupIds: ['mg-abs'], isCustom: false },
  { id: 'ex-ab-wheel', nameKey: 'exercises.abWheel', muscleGroupIds: ['mg-abs'], isCustom: false },
  { id: 'ex-russian-twist', nameKey: 'exercises.russianTwist', muscleGroupIds: ['mg-abs'], isCustom: false },

  // Traps
  { id: 'ex-shrugs', nameKey: 'exercises.shrugs', muscleGroupIds: ['mg-traps'], isCustom: false },
  { id: 'ex-db-shrugs', nameKey: 'exercises.dumbbellShrugs', muscleGroupIds: ['mg-traps'], isCustom: false },

  // Forearms
  { id: 'ex-wrist-curl', nameKey: 'exercises.wristCurl', muscleGroupIds: ['mg-forearms'], isCustom: false },
  { id: 'ex-reverse-wrist-curl', nameKey: 'exercises.reverseWristCurl', muscleGroupIds: ['mg-forearms'], isCustom: false },
  { id: 'ex-farmers-walk', nameKey: 'exercises.farmersWalk', muscleGroupIds: ['mg-forearms', 'mg-traps'], isCustom: false },

  // === Additional exercises ===
  // Chest extras
  { id: 'ex-pec-deck', nameKey: 'exercises.pecDeck', muscleGroupIds: ['mg-chest'], isCustom: false },
  { id: 'ex-incline-chest-fly', nameKey: 'exercises.inclineChestFly', muscleGroupIds: ['mg-chest', 'mg-shoulders'], isCustom: false },
  { id: 'ex-smith-bench', nameKey: 'exercises.smithBenchPress', muscleGroupIds: ['mg-chest', 'mg-triceps'], isCustom: false },
  { id: 'ex-landmine-press', nameKey: 'exercises.landminePress', muscleGroupIds: ['mg-chest', 'mg-shoulders'], isCustom: false },

  // Back extras
  { id: 'ex-pendlay-row', nameKey: 'exercises.pendlayRow', muscleGroupIds: ['mg-back', 'mg-biceps'], isCustom: false },
  { id: 'ex-chest-supported-row', nameKey: 'exercises.chestSupportedRow', muscleGroupIds: ['mg-back'], isCustom: false },
  { id: 'ex-reverse-lat-pulldown', nameKey: 'exercises.reverseGripLatPulldown', muscleGroupIds: ['mg-back', 'mg-biceps'], isCustom: false },
  { id: 'ex-pullover', nameKey: 'exercises.pullover', muscleGroupIds: ['mg-back', 'mg-chest'], isCustom: false },
  { id: 'ex-rack-pull', nameKey: 'exercises.rackPull', muscleGroupIds: ['mg-back', 'mg-traps'], isCustom: false },
  { id: 'ex-landmine-row', nameKey: 'exercises.landmineRow', muscleGroupIds: ['mg-back', 'mg-biceps'], isCustom: false },

  // Shoulders extras
  { id: 'ex-cable-lateral-raise', nameKey: 'exercises.cableLateralRaise', muscleGroupIds: ['mg-shoulders'], isCustom: false },
  { id: 'ex-machine-shoulder-press', nameKey: 'exercises.machineShoulderPress', muscleGroupIds: ['mg-shoulders', 'mg-triceps'], isCustom: false },
  { id: 'ex-lu-raise', nameKey: 'exercises.luRaise', muscleGroupIds: ['mg-shoulders'], isCustom: false },

  // Biceps extras
  { id: 'ex-ez-bar-curl', nameKey: 'exercises.ezBarCurl', muscleGroupIds: ['mg-biceps'], isCustom: false },
  { id: 'ex-incline-db-curl', nameKey: 'exercises.inclineDumbbellCurl', muscleGroupIds: ['mg-biceps'], isCustom: false },
  { id: 'ex-spider-curl', nameKey: 'exercises.spiderCurl', muscleGroupIds: ['mg-biceps'], isCustom: false },
  { id: 'ex-machine-curl', nameKey: 'exercises.machineCurl', muscleGroupIds: ['mg-biceps'], isCustom: false },

  // Triceps extras
  { id: 'ex-rope-pushdown', nameKey: 'exercises.ropePushdown', muscleGroupIds: ['mg-triceps'], isCustom: false },
  { id: 'ex-diamond-pushups', nameKey: 'exercises.diamondPushUps', muscleGroupIds: ['mg-triceps', 'mg-chest'], isCustom: false },

  // Legs extras
  { id: 'ex-smith-squat', nameKey: 'exercises.smithSquat', muscleGroupIds: ['mg-quads', 'mg-glutes'], isCustom: false },
  { id: 'ex-sumo-deadlift', nameKey: 'exercises.sumoDeadlift', muscleGroupIds: ['mg-quads', 'mg-glutes', 'mg-back'], isCustom: false },
  { id: 'ex-step-ups', nameKey: 'exercises.stepUps', muscleGroupIds: ['mg-quads', 'mg-glutes'], isCustom: false },
  { id: 'ex-box-squat', nameKey: 'exercises.boxSquat', muscleGroupIds: ['mg-quads', 'mg-glutes'], isCustom: false },
  { id: 'ex-nordic-curl', nameKey: 'exercises.nordicHamstringCurl', muscleGroupIds: ['mg-hamstrings'], isCustom: false },
  { id: 'ex-leg-press-calf', nameKey: 'exercises.legPressCalfRaise', muscleGroupIds: ['mg-calves'], isCustom: false },

  // Abs extras
  { id: 'ex-decline-crunch', nameKey: 'exercises.declineCrunch', muscleGroupIds: ['mg-abs'], isCustom: false },
  { id: 'ex-bicycle-crunch', nameKey: 'exercises.bicycleCrunch', muscleGroupIds: ['mg-abs'], isCustom: false },
  { id: 'ex-cable-woodchop', nameKey: 'exercises.cableWoodchop', muscleGroupIds: ['mg-abs'], isCustom: false },
  { id: 'ex-dragon-flag', nameKey: 'exercises.dragonFlag', muscleGroupIds: ['mg-abs'], isCustom: false },
  { id: 'ex-pallof-press', nameKey: 'exercises.pallofPress', muscleGroupIds: ['mg-abs'], isCustom: false },
];

export async function seedDatabase() {
  const muscleCount = await db.muscleGroups.count();
  if (muscleCount === 0) {
    await db.muscleGroups.bulkPut(MUSCLE_GROUPS);
  }

  // Apply video URLs from the lookup table
  const exercisesWithVideos = EXERCISES.map((ex) => ({
    ...ex,
    videoUrl: exerciseVideoUrls[ex.id] ?? ex.videoUrl,
  }));

  // Always upsert built-in exercises so new ones are added on update
  await db.exercises.bulkPut(exercisesWithVideos);
}
