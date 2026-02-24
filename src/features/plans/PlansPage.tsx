import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useLiveQuery } from 'dexie-react-hooks';
import { Plus, Star, MoreVertical, Copy, Trash2, ChevronRight } from 'lucide-react';
import { db } from '@/db/schema';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { PageHeader } from '@/components/layout/PageHeader';
import { PlanEditor } from './PlanEditor';
import type { TrainingPlan } from '@/types/models';
import { generateId } from '@/lib/utils';

export function PlansPage() {
  const { t } = useTranslation();
  const [editingPlan, setEditingPlan] = useState<TrainingPlan | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);

  const plans = useLiveQuery(() => db.trainingPlans.orderBy('createdAt').reverse().toArray());

  const handleCreate = () => {
    setIsCreating(true);
    setEditingPlan(null);
  };

  const handleEdit = (plan: TrainingPlan) => {
    setEditingPlan(plan);
    setIsCreating(false);
    setMenuOpenId(null);
  };

  const handleActivate = async (planId: string) => {
    await db.transaction('rw', db.trainingPlans, async () => {
      await db.trainingPlans.toCollection().modify({ isActive: false });
      await db.trainingPlans.update(planId, { isActive: true });
    });
    setMenuOpenId(null);
  };

  const handleCopy = async (plan: TrainingPlan) => {
    const newPlanId = generateId();
    const now = new Date();
    await db.trainingPlans.add({
      ...plan,
      id: newPlanId,
      name: `${plan.name} (kopia)`,
      isActive: false,
      createdAt: now,
      updatedAt: now,
    });

    const days = await db.trainingDays.where('planId').equals(plan.id).toArray();
    for (const day of days) {
      const newDayId = generateId();
      await db.trainingDays.add({ ...day, id: newDayId, planId: newPlanId });

      const exercises = await db.plannedExercises.where('dayId').equals(day.id).toArray();
      for (const ex of exercises) {
        await db.plannedExercises.add({ ...ex, id: generateId(), dayId: newDayId });
      }
    }
    setMenuOpenId(null);
  };

  const handleDelete = async (planId: string) => {
    if (!confirm(t('plans.deletePlanConfirm'))) return;
    const days = await db.trainingDays.where('planId').equals(planId).toArray();
    for (const day of days) {
      await db.plannedExercises.where('dayId').equals(day.id).delete();
    }
    await db.trainingDays.where('planId').equals(planId).delete();
    await db.trainingPlans.delete(planId);
    setMenuOpenId(null);
  };

  if (isCreating || editingPlan) {
    return (
      <PlanEditor
        plan={editingPlan}
        onClose={() => {
          setIsCreating(false);
          setEditingPlan(null);
        }}
      />
    );
  }

  return (
    <div>
      <PageHeader
        title={t('plans.title')}
        action={
          <Button size="icon-sm" variant="ghost" onClick={handleCreate}>
            <Plus className="h-5 w-5" />
          </Button>
        }
      />

      <div className="p-4 space-y-3">
        {plans && plans.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <ClipboardIcon className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p className="font-medium">{t('plans.noPlanYet')}</p>
            <p className="text-sm mt-1">{t('plans.createFirst')}</p>
            <Button className="mt-4" onClick={handleCreate}>
              <Plus className="h-4 w-4 mr-2" />
              {t('plans.createPlan')}
            </Button>
          </div>
        )}

        {plans?.map((plan) => (
          <Card
            key={plan.id}
            className="cursor-pointer active:scale-[0.98] transition-transform touch-manipulation"
            onClick={() => handleEdit(plan)}
          >
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold truncate">{plan.name}</h3>
                    {plan.isActive && (
                      <Badge variant="success">
                        <Star className="h-3 w-3 mr-1" />
                        {t('plans.active')}
                      </Badge>
                    )}
                  </div>
                  {plan.description && (
                    <p className="text-sm text-muted-foreground mt-1 truncate">
                      {plan.description}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground mt-1">
                    {t('common.weeks', { count: plan.weekCount })}
                  </p>
                </div>

                <div className="flex items-center gap-1 ml-2">
                  <div className="relative">
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        setMenuOpenId(menuOpenId === plan.id ? null : plan.id);
                      }}
                    >
                      <MoreVertical className="h-4 w-4" />
                    </Button>

                    {menuOpenId === plan.id && (
                      <>
                        <div
                          className="fixed inset-0 z-40"
                          onClick={(e) => {
                            e.stopPropagation();
                            setMenuOpenId(null);
                          }}
                        />
                        <div className="absolute right-0 top-full mt-1 z-50 bg-popover border rounded-lg shadow-lg py-1 min-w-[160px]">
                          {!plan.isActive && (
                            <button
                              className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-accent text-left"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleActivate(plan.id);
                              }}
                            >
                              <Star className="h-4 w-4" />
                              {t('plans.activate')}
                            </button>
                          )}
                          <button
                            className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-accent text-left"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCopy(plan);
                            }}
                          >
                            <Copy className="h-4 w-4" />
                            {t('plans.copyPlan')}
                          </button>
                          <button
                            className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-accent text-left text-destructive"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDelete(plan.id);
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                            {t('plans.deletePlan')}
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

function ClipboardIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
    </svg>
  );
}
