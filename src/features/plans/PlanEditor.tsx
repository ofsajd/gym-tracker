import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useLiveQuery } from 'dexie-react-hooks';
import { ArrowLeft, Plus, Trash2, ChevronDown, ChevronUp, MoveUp, MoveDown } from 'lucide-react';
import { db } from '@/db/schema';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { PageHeader } from '@/components/layout/PageHeader';
import { ExercisePicker } from './ExercisePicker';
import type { TrainingPlan, TrainingDay, PlannedExercise } from '@/types/models';
import { generateId } from '@/lib/utils';

type Props = {
  plan: TrainingPlan | null; // null = create new
  onClose: () => void;
};

export function PlanEditor({ plan, onClose }: Props) {
  const { t } = useTranslation();
  const [name, setName] = useState(plan?.name ?? '');
  const [description, setDescription] = useState(plan?.description ?? '');
  const [weekCount, setWeekCount] = useState(plan?.weekCount ?? 8);
  const [expandedDayId, setExpandedDayId] = useState<string | null>(null);
  const [showExercisePicker, setShowExercisePicker] = useState<string | null>(null);

  const planIdRef = useRef(plan?.id ?? generateId());
  const planId = planIdRef.current;

  const days = useLiveQuery(
    () => db.trainingDays.where('planId').equals(planId).sortBy('order'),
    [planId]
  );

  useEffect(() => {
    if (!plan) {
      db.trainingPlans.add({
        id: planId,
        name: name || t('plans.createPlan'),
        weekCount,
        createdAt: new Date(),
        updatedAt: new Date(),
        isActive: false,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const savePlanMeta = async () => {
    await db.trainingPlans.update(planId, {
      name: name || t('plans.createPlan'),
      description: description || undefined,
      weekCount,
      updatedAt: new Date(),
    });
  };

  const handleAddDay = async () => {
    const order = (days?.length ?? 0) + 1;
    const dayId = generateId();
    await db.trainingDays.add({
      id: dayId,
      planId,
      name: `${t('common.day')} ${order}`,
      order,
    });
    setExpandedDayId(dayId);
  };

  const handleDeleteDay = async (dayId: string) => {
    await db.plannedExercises.where('dayId').equals(dayId).delete();
    await db.trainingDays.delete(dayId);
    const remaining = await db.trainingDays.where('planId').equals(planId).sortBy('order');
    for (let i = 0; i < remaining.length; i++) {
      await db.trainingDays.update(remaining[i].id, { order: i + 1 });
    }
  };

  const handleMoveDayUp = async (dayId: string) => {
    if (!days) return;
    const idx = days.findIndex((d) => d.id === dayId);
    if (idx <= 0) return;
    const orderA = days[idx].order;
    const orderB = days[idx - 1].order;
    await db.trainingDays.update(days[idx].id, { order: orderB });
    await db.trainingDays.update(days[idx - 1].id, { order: orderA });
  };

  const handleMoveDayDown = async (dayId: string) => {
    if (!days) return;
    const idx = days.findIndex((d) => d.id === dayId);
    if (idx < 0 || idx >= days.length - 1) return;
    const orderA = days[idx].order;
    const orderB = days[idx + 1].order;
    await db.trainingDays.update(days[idx].id, { order: orderB });
    await db.trainingDays.update(days[idx + 1].id, { order: orderA });
  };

  const handleSaveAndClose = async () => {
    await savePlanMeta();
    onClose();
  };

  return (
    <div>
      <PageHeader
        title={plan ? t('plans.editPlan') : t('plans.createPlan')}
        action={
          <Button size="sm" onClick={handleSaveAndClose}>
            {t('common.done')}
          </Button>
        }
      />

      <div className="p-4 space-y-4">
        <div className="space-y-3">
          <div>
            <label className="text-sm font-medium text-muted-foreground">{t('plans.planName')}</label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              onBlur={savePlanMeta}
              placeholder={t('plans.planName')}
              className="mt-1"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-muted-foreground">{t('common.description')}</label>
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              onBlur={savePlanMeta}
              placeholder={t('common.description')}
              className="mt-1"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-muted-foreground">{t('plans.weekCount')}</label>
            <div className="flex items-center gap-2 mt-1">
              <Button
                variant="outline"
                size="icon-sm"
                onClick={() => setWeekCount(Math.max(1, weekCount - 1))}
                onMouseUp={savePlanMeta}
              >
                -
              </Button>
              <span className="w-12 text-center font-semibold text-lg">{weekCount}</span>
              <Button
                variant="outline"
                size="icon-sm"
                onClick={() => setWeekCount(weekCount + 1)}
                onMouseUp={savePlanMeta}
              >
                +
              </Button>
              <span className="text-sm text-muted-foreground ml-1">
                {t('common.weeks', { count: weekCount })}
              </span>
            </div>
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold">{t('plans.trainingDays')}</h2>
            <Button variant="outline" size="sm" onClick={handleAddDay}>
              <Plus className="h-4 w-4 mr-1" />
              {t('plans.addDay')}
            </Button>
          </div>

          <div className="space-y-2">
            {days?.map((day, idx) => (
              <DayCard
                key={day.id}
                day={day}
                isExpanded={expandedDayId === day.id}
                isFirst={idx === 0}
                isLast={idx === (days?.length ?? 0) - 1}
                onToggle={() => setExpandedDayId(expandedDayId === day.id ? null : day.id)}
                onDelete={() => handleDeleteDay(day.id)}
                onAddExercise={() => setShowExercisePicker(day.id)}
                onMoveUp={() => handleMoveDayUp(day.id)}
                onMoveDown={() => handleMoveDayDown(day.id)}
              />
            ))}
          </div>
        </div>

        {/* Muscle group summary */}
        <MuscleSummary planId={planId} />

        <Button variant="ghost" className="w-full" onClick={handleSaveAndClose}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          {t('common.back')}
        </Button>
      </div>

      {showExercisePicker && (
        <ExercisePicker
          dayId={showExercisePicker}
          onClose={() => setShowExercisePicker(null)}
        />
      )}
    </div>
  );
}

function DayCard({
  day,
  isExpanded,
  isFirst,
  isLast,
  onToggle,
  onDelete,
  onAddExercise,
  onMoveUp,
  onMoveDown,
}: {
  day: TrainingDay;
  isExpanded: boolean;
  isFirst: boolean;
  isLast: boolean;
  onToggle: () => void;
  onDelete: () => void;
  onAddExercise: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
}) {
  const { t } = useTranslation();
  const [dayName, setDayName] = useState(day.name);

  const exercises = useLiveQuery(
    () => db.plannedExercises.where('dayId').equals(day.id).sortBy('order'),
    [day.id]
  );

  const handleNameBlur = async () => {
    await db.trainingDays.update(day.id, { name: dayName });
  };

  const handleDeleteExercise = async (exId: string) => {
    await db.plannedExercises.delete(exId);
    const remaining = await db.plannedExercises.where('dayId').equals(day.id).sortBy('order');
    for (let i = 0; i < remaining.length; i++) {
      await db.plannedExercises.update(remaining[i].id, { order: i + 1 });
    }
  };

  const handleUpdateExercise = async (exId: string, updates: Partial<PlannedExercise>) => {
    await db.plannedExercises.update(exId, updates);
  };

  const handleMoveExercise = async (exId: string, direction: 'up' | 'down') => {
    if (!exercises) return;
    const idx = exercises.findIndex((e) => e.id === exId);
    if (direction === 'up' && idx <= 0) return;
    if (direction === 'down' && idx >= exercises.length - 1) return;
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
    const orderA = exercises[idx].order;
    const orderB = exercises[swapIdx].order;
    await db.plannedExercises.update(exercises[idx].id, { order: orderB });
    await db.plannedExercises.update(exercises[swapIdx].id, { order: orderA });
  };

  return (
    <Card>
      <CardContent className="p-0">
        <div
          className="flex items-center gap-2 p-3 cursor-pointer touch-manipulation"
          onClick={onToggle}
        >
          <div className="flex flex-col gap-0.5 shrink-0" onClick={(e) => e.stopPropagation()}>
            <button
              className="h-5 w-5 flex items-center justify-center rounded text-muted-foreground hover:text-foreground disabled:opacity-30 touch-manipulation"
              onClick={onMoveUp}
              disabled={isFirst}
              title={t('plans.moveUp')}
            >
              <MoveUp className="h-3.5 w-3.5" />
            </button>
            <button
              className="h-5 w-5 flex items-center justify-center rounded text-muted-foreground hover:text-foreground disabled:opacity-30 touch-manipulation"
              onClick={onMoveDown}
              disabled={isLast}
              title={t('plans.moveDown')}
            >
              <MoveDown className="h-3.5 w-3.5" />
            </button>
          </div>
          <Input
            value={dayName}
            onChange={(e) => setDayName(e.target.value)}
            onBlur={handleNameBlur}
            onClick={(e) => e.stopPropagation()}
            className="h-8 text-sm font-medium border-0 bg-transparent p-0 focus-visible:ring-0"
          />
          <div className="flex items-center gap-1 shrink-0">
            <span className="text-xs text-muted-foreground">
              {exercises?.length ?? 0} {t('plans.exercises').toLowerCase()}
            </span>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
            >
              <Trash2 className="h-4 w-4 text-muted-foreground" />
            </Button>
            {isExpanded ? (
              <ChevronUp className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            )}
          </div>
        </div>

        {isExpanded && (
          <div className="border-t px-3 pb-3 space-y-2">
            {exercises?.map((ex, idx) => (
              <PlannedExerciseRow
                key={ex.id}
                exercise={ex}
                isFirst={idx === 0}
                isLast={idx === (exercises?.length ?? 0) - 1}
                onDelete={() => handleDeleteExercise(ex.id)}
                onUpdate={(updates) => handleUpdateExercise(ex.id, updates)}
                onMoveUp={() => handleMoveExercise(ex.id, 'up')}
                onMoveDown={() => handleMoveExercise(ex.id, 'down')}
              />
            ))}

            {exercises?.length === 0 && (
              <p className="text-sm text-muted-foreground py-2 text-center">
                {t('plans.noExercises')}
              </p>
            )}

            <Button variant="outline" size="sm" className="w-full mt-2" onClick={onAddExercise}>
              <Plus className="h-4 w-4 mr-1" />
              {t('plans.addExercise')}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function PlannedExerciseRow({
  exercise,
  isFirst,
  isLast,
  onDelete,
  onUpdate,
  onMoveUp,
  onMoveDown,
}: {
  exercise: PlannedExercise;
  isFirst: boolean;
  isLast: boolean;
  onDelete: () => void;
  onUpdate: (updates: Partial<PlannedExercise>) => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
}) {
  const { t } = useTranslation();
  const ex = useLiveQuery(() => db.exercises.get(exercise.exerciseId), [exercise.exerciseId]);

  const exerciseName = ex
    ? ex.isCustom
      ? ex.nameKey
      : t(ex.nameKey)
    : '...';

  return (
    <div className="flex items-center gap-2 py-2 border-b border-border/50 last:border-0">
      <div className="flex flex-col gap-0.5 shrink-0">
        <button
          className="h-5 w-5 flex items-center justify-center rounded text-muted-foreground hover:text-foreground disabled:opacity-30 touch-manipulation"
          onClick={onMoveUp}
          disabled={isFirst}
        >
          <MoveUp className="h-3 w-3" />
        </button>
        <button
          className="h-5 w-5 flex items-center justify-center rounded text-muted-foreground hover:text-foreground disabled:opacity-30 touch-manipulation"
          onClick={onMoveDown}
          disabled={isLast}
        >
          <MoveDown className="h-3 w-3" />
        </button>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{exerciseName}</p>
        <div className="flex items-center gap-2 mt-1 flex-wrap">
          <div className="flex items-center gap-1">
            <label className="text-xs text-muted-foreground">{t('plans.targetSets')}</label>
            <input
              type="text"
              inputMode="numeric"
              value={exercise.targetSets}
              onChange={(e) => onUpdate({ targetSets: parseInt(e.target.value) || 0 })}
              className="w-10 h-7 text-center text-sm bg-secondary rounded px-1"
            />
          </div>
          <div className="flex items-center gap-1">
            <label className="text-xs text-muted-foreground">{t('plans.targetReps')}</label>
            <input
              type="text"
              value={exercise.targetReps}
              onChange={(e) => onUpdate({ targetReps: e.target.value })}
              className="w-14 h-7 text-center text-sm bg-secondary rounded px-1"
              placeholder="8-12"
            />
          </div>
          <div className="flex items-center gap-1">
            <label className="text-xs text-muted-foreground">{t('plans.initialWeight')}</label>
            <input
              type="text"
              inputMode="decimal"
              value={exercise.initialWeight ?? ''}
              onChange={(e) => {
                const val = parseFloat(e.target.value);
                onUpdate({ initialWeight: isNaN(val) ? undefined : val });
              }}
              className="w-14 h-7 text-center text-sm bg-secondary rounded px-1"
              placeholder="kg"
            />
          </div>
          <div className="flex items-center gap-1">
            <label className="text-xs text-muted-foreground">{t('plans.restTime')}</label>
            <input
              type="text"
              inputMode="numeric"
              value={exercise.restSeconds ?? ''}
              onChange={(e) => onUpdate({ restSeconds: parseInt(e.target.value) || undefined })}
              className="w-12 h-7 text-center text-sm bg-secondary rounded px-1"
              placeholder="90"
            />
          </div>
        </div>
      </div>
      <Button variant="ghost" size="icon-sm" onClick={onDelete}>
        <Trash2 className="h-4 w-4 text-muted-foreground" />
      </Button>
    </div>
  );
}

function MuscleSummary({ planId }: { planId: string }) {
  const { t } = useTranslation();

  const muscleGroups = useLiveQuery(() => db.muscleGroups.toArray());
  const exercises = useLiveQuery(() => db.exercises.toArray());

  const muscleCounts = useLiveQuery(async () => {
    const days = await db.trainingDays.where('planId').equals(planId).toArray();
    const dayIds = days.map((d) => d.id);
    if (dayIds.length === 0) return {};

    const allPlanned = await db.plannedExercises.toArray();
    const planExercises = allPlanned.filter((pe) => dayIds.includes(pe.dayId));

    const counts: Record<string, { sets: number; exercises: Set<string> }> = {};
    for (const pe of planExercises) {
      const ex = exercises?.find((e) => e.id === pe.exerciseId);
      if (!ex) continue;
      for (const mgId of ex.muscleGroupIds) {
        if (!counts[mgId]) counts[mgId] = { sets: 0, exercises: new Set() };
        counts[mgId].sets += pe.targetSets;
        counts[mgId].exercises.add(pe.exerciseId);
      }
    }
    return counts;
  }, [planId, exercises]);

  if (!muscleCounts || !muscleGroups) return null;

  const entries = muscleGroups
    .map((mg) => ({
      mg,
      sets: muscleCounts[mg.id]?.sets ?? 0,
      exerciseCount: muscleCounts[mg.id]?.exercises.size ?? 0,
    }))
    .filter((e) => e.sets > 0)
    .sort((a, b) => b.sets - a.sets);

  if (entries.length === 0) return null;

  const maxSets = Math.max(...entries.map((e) => e.sets));

  return (
    <Card>
      <CardContent className="p-3 space-y-2">
        <h3 className="text-sm font-semibold text-muted-foreground">
          {t('plans.muscleSummary')}
        </h3>
        <div className="space-y-1.5">
          {entries.map((e) => (
            <div key={e.mg.id} className="flex items-center gap-2">
              <span className="text-xs w-24 truncate shrink-0">{t(e.mg.nameKey)}</span>
              <div className="flex-1 h-5 bg-secondary rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary/70 rounded-full transition-all duration-300 flex items-center justify-end pr-1.5"
                  style={{ width: `${Math.max((e.sets / maxSets) * 100, 12)}%` }}
                >
                  <span className="text-[10px] font-bold text-primary-foreground whitespace-nowrap">
                    {e.sets}
                  </span>
                </div>
              </div>
              <span className="text-[10px] text-muted-foreground w-12 text-right shrink-0">
                {e.exerciseCount} {t('plans.exercises').toLowerCase().slice(0, 2)}.
              </span>
            </div>
          ))}
        </div>
        <p className="text-[10px] text-muted-foreground text-center">
          {t('plans.muscleSummaryHint')}
        </p>
      </CardContent>
    </Card>
  );
}
