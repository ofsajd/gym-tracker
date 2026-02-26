import { useState, useEffect, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Dialog, DialogHeader } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { db } from '@/db/schema';
import { decompressPlanData, generateId } from '@/lib/utils';
import { Camera } from 'lucide-react';
import jsQR from 'jsqr';

type Props = {
  open: boolean;
  onClose: () => void;
};

type ScannedPlanData = {
  v: number;
  p: { name?: string; desc?: string; wc?: number };
  d: { id: string; n: string; o: number }[];
  e: { did: string; eid: string; o: number; s?: number; r?: string; w?: number; rs?: number }[];
  cx: { id: string; n: string; mg: string[] }[];
};

export function QRScanDialog({ open, onClose }: Props) {
  const { t } = useTranslation();
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const [imported, setImported] = useState(false);

  // Name/description dialog state
  const [scannedData, setScannedData] = useState<ScannedPlanData | null>(null);
  const [importName, setImportName] = useState('');
  const [importDesc, setImportDesc] = useState('');

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setScanning(false);
  }, []);

  const handleQRDetected = useCallback(
    async (payload: string) => {
      try {
        if (!payload.startsWith('GYM:')) {
          setError(t('settings.qrError'));
          return;
        }

        const compressed = payload.slice(4);
        const json = await decompressPlanData(compressed);
        const data = JSON.parse(json) as ScannedPlanData;

        if (!data.v || !data.p) {
          setError(t('settings.qrError'));
          return;
        }

        // Stop camera and show name/desc dialog
        stopCamera();
        setScannedData(data);
        setImportName(data.p.name || '');
        setImportDesc(data.p.desc || '');
      } catch {
        setError(t('settings.qrError'));
      }
    },
    [stopCamera, t]
  );

  const confirmImport = async () => {
    if (!scannedData) return;
    const data = scannedData;

    try {
      const newPlanId = generateId();
      const dayIdMap = new Map<string, string>();

      await db.trainingPlans.add({
        id: newPlanId,
        name: importName || data.p.name || 'Imported Plan',
        description: importDesc || undefined,
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
          targetReps: e.r || '8',
          initialWeight: e.w,
          restSeconds: e.rs || 90,
        });
      }

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

      setScannedData(null);
      setImported(true);
    } catch {
      setError(t('settings.qrError'));
    }
  };

  useEffect(() => {
    if (!open) {
      stopCamera();
      return;
    }

    setError(null);
    setImported(false);
    setScannedData(null);

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
                  await handleQRDetected(value);
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
          // Fallback: use jsQR with canvas
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d', { willReadFrequently: true });

          const scanFrame = () => {
            if (!videoRef.current || !streamRef.current || !ctx) return;
            const video = videoRef.current;
            if (video.readyState !== video.HAVE_ENOUGH_DATA) {
              requestAnimationFrame(scanFrame);
              return;
            }
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const code = jsQR(imageData.data, imageData.width, imageData.height, {
              inversionAttempts: 'dontInvert',
            });
            if (code && code.data && code.data.startsWith('GYM:')) {
              handleQRDetected(code.data);
              return;
            }
            if (streamRef.current) {
              requestAnimationFrame(scanFrame);
            }
          };
          requestAnimationFrame(scanFrame);
        }
      } catch {
        setError(t('settings.qrNoCameraAccess'));
      }
    };

    startCamera();

    return () => {
      stopCamera();
    };
  }, [open, stopCamera, handleQRDetected, t]);

  const handleClose = () => {
    stopCamera();
    setScannedData(null);
    onClose();
  };

  if (!open) return null;

  return (
    <Dialog open onClose={handleClose}>
      <DialogHeader onClose={handleClose}>{t('settings.qrScanTitle')}</DialogHeader>

      <div className="flex flex-col items-center gap-4 py-4">
        {/* Step 3: Import success */}
        {imported ? (
          <div className="text-center space-y-3">
            <div className="h-16 w-16 mx-auto rounded-full bg-success/20 flex items-center justify-center">
              <span className="text-2xl">✓</span>
            </div>
            <p className="font-medium text-success">{t('settings.qrImported')}</p>
            <Button onClick={handleClose}>{t('common.done')}</Button>
          </div>
        ) : scannedData ? (
          /* Step 2: Name/description dialog */
          <div className="w-full space-y-3">
            <div>
              <label className="text-sm font-medium text-muted-foreground">{t('plans.planName')}</label>
              <Input
                value={importName}
                onChange={(e) => setImportName(e.target.value)}
                placeholder={t('plans.planName')}
                className="mt-1"
                autoFocus
              />
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">{t('common.description')}</label>
              <Input
                value={importDesc}
                onChange={(e) => setImportDesc(e.target.value)}
                placeholder={t('common.description')}
                className="mt-1"
              />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={handleClose}>
                {t('common.cancel')}
              </Button>
              <Button className="flex-1" onClick={confirmImport}>
                {t('common.import')}
              </Button>
            </div>
          </div>
        ) : (
          /* Step 1: Camera scanning */
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
