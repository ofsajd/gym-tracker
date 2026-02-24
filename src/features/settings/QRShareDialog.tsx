import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { QRCodeSVG } from 'qrcode.react';
import { Dialog, DialogHeader } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { db } from '@/db/schema';
import { compressPlanData } from '@/lib/utils';

type Props = {
  open: boolean;
  onClose: () => void;
};

const MAX_QR_BYTES = 2800; // conservative limit for reliable scanning

export function QRShareDialog({ open, onClose }: Props) {
  const { t } = useTranslation();
  const [qrData, setQrData] = useState<string | null>(null);
  const [tooLarge, setTooLarge] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    setTooLarge(false);
    setQrData(null);

    (async () => {
      const plans = await db.trainingPlans.toArray();
      if (plans.length === 0) {
        setLoading(false);
        return;
      }

      const plan = plans.find((p) => p.isActive) ?? plans[0];
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

      // Minimal export — strip unnecessary fields
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
  }, [open]);

  if (!open) return null;

  return (
    <Dialog open onClose={onClose}>
      <DialogHeader onClose={onClose}>{t('settings.qrTitle')}</DialogHeader>

      <div className="flex flex-col items-center gap-4 py-4">
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

        <Button variant="outline" onClick={onClose}>
          {t('common.close')}
        </Button>
      </div>
    </Dialog>
  );
}
