import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useLiveQuery } from 'dexie-react-hooks';
import { QRCodeSVG } from 'qrcode.react';
import { ChevronRight } from 'lucide-react';
import { Dialog, DialogHeader } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { db } from '@/db/schema';
import { compressPlanData } from '@/lib/utils';
import type { TrainingPlan } from '@/types/models';

type Props = {
  open: boolean;
  onClose: () => void;
};

const MAX_QR_BYTES = 2800;

export function QRShareDialog({ open, onClose }: Props) {
  const { t } = useTranslation();
  const [selectedPlan, setSelectedPlan] = useState<TrainingPlan | null>(null);
  const [qrData, setQrData] = useState<string | null>(null);
  const [tooLarge, setTooLarge] = useState(false);
  const [loading, setLoading] = useState(false);

  const allPlans = useLiveQuery(
    () => (open ? db.trainingPlans.orderBy('createdAt').reverse().toArray() : []),
    [open]
  );

  // Reset state when dialog opens/closes
  useEffect(() => {
    if (!open) {
      setSelectedPlan(null);
      setQrData(null);
      setTooLarge(false);
      setLoading(false);
    }
  }, [open]);

  // Generate QR when plan is selected
  useEffect(() => {
    if (!selectedPlan) return;
    setLoading(true);
    setTooLarge(false);
    setQrData(null);

    (async () => {
      const plan = selectedPlan;
      const days = await db.trainingDays.where('planId').equals(plan.id).sortBy('order');
      const allPe: unknown[] = [];
      const exerciseIds = new Set<string>();

      for (const day of days) {
        const exs = await db.plannedExercises.where('dayId').equals(day.id).toArray();
        allPe.push(...exs);
        exs.forEach((e) => exerciseIds.add(e.exerciseId));
      }

      const exercises = (await db.exercises.bulkGet([...exerciseIds])).filter(
        (e) => e && e.isCustom
      );

      const exportData = {
        v: 1,
        p: {
          name: plan.name,
          desc: plan.description,
          wc: plan.weekCount,
        },
        d: days.map((d) => ({
          id: d.id,
          n: d.name,
          o: d.order,
        })),
        e: (allPe as any[]).map((pe) => ({
          did: pe.dayId,
          eid: pe.exerciseId,
          o: pe.order,
          s: pe.targetSets,
          r: pe.targetReps,
          w: pe.initialWeight,
          rs: pe.restSeconds,
        })),
        cx: exercises.map((ex: any) => ({
          id: ex.id,
          n: ex.nameKey,
          mg: ex.muscleGroupIds,
        })),
      };

      const json = JSON.stringify(exportData);
      try {
        const compressed = await compressPlanData(json);
        const payload = `GYM:${compressed}`;

        if (payload.length > MAX_QR_BYTES) {
          setTooLarge(true);
        } else {
          setQrData(payload);
        }
      } catch {
        setTooLarge(true);
      }
      setLoading(false);
    })();
  }, [selectedPlan]);

  if (!open) return null;

  // Step 1: Plan picker
  if (!selectedPlan) {
    return (
      <Dialog open onClose={onClose}>
        <DialogHeader onClose={onClose}>{t('settings.selectPlanToShare')}</DialogHeader>
        <div className="space-y-2 py-2">
          {allPlans?.map((plan) => (
            <button
              key={plan.id}
              onClick={() => setSelectedPlan(plan)}
              className="w-full flex items-center justify-between gap-3 p-3 rounded-lg hover:bg-accent active:bg-accent/80 text-left transition-colors touch-manipulation"
            >
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">{plan.name}</p>
                {plan.description && (
                  <p className="text-xs text-muted-foreground truncate">{plan.description}</p>
                )}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {plan.isActive && (
                  <span className="text-xs text-primary font-medium">{t('plans.active')}</span>
                )}
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </div>
            </button>
          ))}
          {(!allPlans || allPlans.length === 0) && (
            <p className="text-sm text-muted-foreground text-center py-4">{t('common.noData')}</p>
          )}
        </div>
      </Dialog>
    );
  }

  // Step 2: QR code display
  return (
    <Dialog open onClose={onClose}>
      <DialogHeader onClose={onClose}>{t('settings.qrTitle')}</DialogHeader>

      <div className="flex flex-col items-center gap-4 py-4">
        <p className="text-sm font-medium">{selectedPlan.name}</p>

        {loading && (
          <p className="text-sm text-muted-foreground">{t('common.loading')}</p>
        )}

        {tooLarge && (
          <div className="text-center space-y-2">
            <p className="text-sm text-muted-foreground">{t('settings.qrTooLarge')}</p>
          </div>
        )}

        {qrData && (
          <div className="bg-white p-4 rounded-xl">
            <QRCodeSVG value={qrData} size={256} level="L" />
          </div>
        )}

        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setSelectedPlan(null)}>
            {t('common.back')}
          </Button>
          <Button variant="outline" onClick={onClose}>
            {t('common.close')}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
