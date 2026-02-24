import { useState, useEffect, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Dialog, DialogHeader } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { db } from '@/db/schema';
import { decompressPlanData, generateId } from '@/lib/utils';
import { Camera } from 'lucide-react';

type Props = {
  open: boolean;
  onClose: () => void;
};

export function QRScanDialog({ open, onClose }: Props) {
  const { t } = useTranslation();
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const [imported, setImported] = useState(false);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setScanning(false);
  }, []);

  const importPlanFromQR = useCallback(
    async (payload: string) => {
      try {
        if (!payload.startsWith('GYM:')) {
          setError(t('settings.qrError'));
          return;
        }

        const compressed = payload.slice(4);
        const json = await decompressPlanData(compressed);
        const data = JSON.parse(json);

        if (!data.v || !data.p) {
          setError(t('settings.qrError'));
          return;
        }

        const newPlanId = generateId();
        const dayIdMap = new Map<string, string>();

        await db.trainingPlans.add({
          id: newPlanId,
          name: data.p.name || 'Imported Plan',
          description: data.p.desc,
          weekCount: data.p.wc || 8,
          createdAt: new Date(),
          updatedAt: new Date(),
          isActive: false,
        });

        for (const d of data.d || []) {
          const newDayId = generateId();
          dayIdMap.set(d.id, newDayId);
          await db.trainingDays.add({
            id: newDayId,
            planId: newPlanId,
            name: d.n,
            order: d.o,
          });
        }

        for (const e of data.e || []) {
          const newDayId = dayIdMap.get(e.did) ?? e.did;
          await db.plannedExercises.add({
            id: generateId(),
            dayId: newDayId,
            exerciseId: e.eid,
            order: e.o,
            targetSets: e.s || 3,
            targetReps: e.r || '8-12',
            initialWeight: e.w,
            restSeconds: e.rs || 90,
          });
        }

        // Import custom exercises
        for (const cx of data.cx || []) {
          const existing = await db.exercises.get(cx.id);
          if (!existing) {
            await db.exercises.add({
              id: cx.id,
              nameKey: cx.n,
              muscleGroupIds: cx.mg || [],
              isCustom: true,
            });
          }
        }

        setImported(true);
        stopCamera();
      } catch {
        setError(t('settings.qrError'));
      }
    },
    [stopCamera, t]
  );

  useEffect(() => {
    if (!open) {
      stopCamera();
      return;
    }

    setError(null);
    setImported(false);

    const startCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' },
        });
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
        setScanning(true);

        // Use BarcodeDetector API if available
        if ('BarcodeDetector' in window) {
          const detector = new (window as any).BarcodeDetector({
            formats: ['qr_code'],
          });

          const scanFrame = async () => {
            if (!videoRef.current || !streamRef.current) return;
            try {
              const barcodes = await detector.detect(videoRef.current);
              if (barcodes.length > 0) {
                const value = barcodes[0].rawValue;
                if (value && value.startsWith('GYM:')) {
                  await importPlanFromQR(value);
                  return;
                }
              }
            } catch {
              // ignore detection errors
            }
            if (streamRef.current) {
              requestAnimationFrame(scanFrame);
            }
          };
          requestAnimationFrame(scanFrame);
        } else {
          // Fallback: show message about manual input
          setError(t('settings.qrNoCameraAccess'));
        }
      } catch {
        setError(t('settings.qrNoCameraAccess'));
      }
    };

    startCamera();

    return () => {
      stopCamera();
    };
  }, [open, stopCamera, importPlanFromQR, t]);

  const handleClose = () => {
    stopCamera();
    onClose();
  };

  if (!open) return null;

  return (
    <Dialog open onClose={handleClose}>
      <DialogHeader onClose={handleClose}>{t('settings.qrScanTitle')}</DialogHeader>

      <div className="flex flex-col items-center gap-4 py-4">
        {imported ? (
          <div className="text-center space-y-3">
            <div className="h-16 w-16 mx-auto rounded-full bg-success/20 flex items-center justify-center">
              <span className="text-2xl">✓</span>
            </div>
            <p className="font-medium text-success">{t('settings.qrImported')}</p>
            <Button onClick={handleClose}>{t('common.done')}</Button>
          </div>
        ) : (
          <>
            <div className="relative w-full aspect-square max-w-xs rounded-xl overflow-hidden bg-black">
              <video
                ref={videoRef}
                className="w-full h-full object-cover"
                playsInline
                muted
              />
              {scanning && (
                <div className="absolute inset-0 border-2 border-primary/50 rounded-xl">
                  <div className="absolute inset-[20%] border-2 border-primary rounded-lg" />
                </div>
              )}
              {!scanning && !error && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <Camera className="h-12 w-12 text-muted-foreground" />
                </div>
              )}
            </div>

            {error && (
              <p className="text-sm text-destructive text-center">{error}</p>
            )}

            {scanning && (
              <p className="text-sm text-muted-foreground">{t('settings.qrScanning')}</p>
            )}

            <Button variant="outline" onClick={handleClose}>
              {t('common.cancel')}
            </Button>
          </>
        )}
      </div>
    </Dialog>
  );
}
