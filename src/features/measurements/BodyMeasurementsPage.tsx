import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useLiveQuery } from 'dexie-react-hooks';
import { useNavigate } from 'react-router-dom';
import {
  Plus,
  Trash2,
  TrendingUp,
  TrendingDown,
  Minus,
  ArrowLeft,
} from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { format } from 'date-fns';
import { pl, enUS } from 'date-fns/locale';
import { db } from '@/db/schema';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Dialog, DialogHeader } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { PageHeader } from '@/components/layout/PageHeader';
import { useUIStore } from '@/stores/ui-store';
import { generateId, convertWeight } from '@/lib/utils';
import type { BodyMeasurement } from '@/types/models';

const MEASUREMENT_FIELDS = [
  'bodyweight',
  'bodyFatPercent',
  'chest',
  'waist',
  'hips',
  'bicepLeft',
  'bicepRight',
  'thighLeft',
  'thighRight',
  'calfLeft',
  'calfRight',
  'neck',
] as const;

type MeasField = (typeof MEASUREMENT_FIELDS)[number];

export function BodyMeasurementsPage() {
  const { t } = useTranslation();
  const { settings } = useUIStore();
  const navigate = useNavigate();
  const [showAdd, setShowAdd] = useState(false);
  const [chartField, setChartField] = useState<MeasField>('bodyweight');
  const dateLocale = settings.language === 'pl' ? pl : enUS;

  const measurements = useLiveQuery(
    () => db.bodyMeasurements.orderBy('date').reverse().toArray()
  );

  const chartData = useMemo(() => {
    if (!measurements || measurements.length === 0) return [];
    return [...measurements]
      .reverse()
      .filter((m) => m[chartField] != null)
      .map((m) => ({
        date: format(m.date, 'dd MMM', { locale: dateLocale }),
        value:
          chartField === 'bodyweight'
            ? convertWeight(m[chartField]!, settings.weightUnit)
            : m[chartField]!,
      }));
  }, [measurements, chartField, dateLocale, settings.weightUnit]);

  const latestTwo = useMemo(() => {
    if (!measurements || measurements.length < 2) return null;
    return { latest: measurements[0], prev: measurements[1] };
  }, [measurements]);

  const getDelta = (field: MeasField) => {
    if (!latestTwo) return null;
    const a = latestTwo.latest[field];
    const b = latestTwo.prev[field];
    if (a == null || b == null) return null;
    return a - b;
  };

  const fieldOptions = MEASUREMENT_FIELDS.map((f) => ({
    value: f,
    label: t(`measurements.${f}`),
  }));

  const handleDelete = async (id: string) => {
    if (confirm(t('common.delete') + '?')) {
      await db.bodyMeasurements.delete(id);
    }
  };

  return (
    <div>
      <PageHeader
        title={t('measurements.title')}
        action={
          <Button variant="ghost" size="icon-sm" onClick={() => navigate('/app/more')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
        }
      />

      <div className="p-4 space-y-4">
        <Button className="w-full" onClick={() => setShowAdd(true)}>
          <Plus className="h-4 w-4 mr-2" />
          {t('measurements.addEntry')}
        </Button>

        {/* Quick stats */}
        {measurements && measurements.length > 0 && (
          <div className="grid grid-cols-3 gap-3">
            {(['bodyweight', 'waist', 'chest'] as MeasField[]).map((field) => {
              const val = measurements[0][field];
              const delta = getDelta(field);
              const isWeight = field === 'bodyweight';
              const displayVal =
                val != null
                  ? isWeight
                    ? convertWeight(val, settings.weightUnit)
                    : val
                  : '—';
              const unit = isWeight ? settings.weightUnit : 'cm';
              return (
                <Card key={field}>
                  <CardContent className="p-3 text-center">
                    <p className="text-lg font-bold">
                      {displayVal}
                      {val != null && (
                        <span className="text-xs text-muted-foreground ml-0.5">{unit}</span>
                      )}
                    </p>
                    <p className="text-[10px] text-muted-foreground">{t(`measurements.${field}`)}</p>
                    {delta != null && (
                      <div className="flex items-center justify-center gap-0.5 mt-0.5">
                        {delta > 0 ? (
                          <TrendingUp className="h-3 w-3 text-success" />
                        ) : delta < 0 ? (
                          <TrendingDown className="h-3 w-3 text-destructive" />
                        ) : (
                          <Minus className="h-3 w-3 text-muted-foreground" />
                        )}
                        <span className="text-[10px] font-mono">
                          {delta > 0 ? '+' : ''}
                          {isWeight
                            ? convertWeight(delta, settings.weightUnit).toFixed(1)
                            : delta.toFixed(1)}
                        </span>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Chart */}
        {chartData.length >= 2 && (
          <Card>
            <CardHeader className="pb-2">
              <Select
                options={fieldOptions}
                value={chartField}
                onChange={(e) => setChartField(e.target.value as MeasField)}
              />
            </CardHeader>
            <CardContent>
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis dataKey="date" tick={{ fontSize: 10 }} stroke="var(--muted-foreground)" />
                    <YAxis tick={{ fontSize: 10 }} stroke="var(--muted-foreground)" />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'var(--card)',
                        border: '1px solid var(--border)',
                        borderRadius: '8px',
                        fontSize: '12px',
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="value"
                      stroke="var(--primary)"
                      strokeWidth={2}
                      dot={{ fill: 'var(--primary)', r: 3 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        )}

        {/* History */}
        {measurements && measurements.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-sm font-medium text-muted-foreground">{t('progress.history')}</h3>
            {measurements.map((m) => (
              <Card key={m.id}>
                <CardContent className="p-3">
                  <div className="flex items-start justify-between mb-1.5">
                    <span className="text-sm font-medium">
                      {format(m.date, 'd MMM yyyy', { locale: dateLocale })}
                    </span>
                    <button
                      onClick={() => handleDelete(m.id)}
                      className="text-muted-foreground hover:text-destructive touch-manipulation"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <div className="grid grid-cols-3 gap-x-4 gap-y-1 text-xs">
                    {MEASUREMENT_FIELDS.filter((f) => m[f] != null).map((f) => {
                      const isWeight = f === 'bodyweight';
                      const unit = f === 'bodyFatPercent' ? '%' : isWeight ? settings.weightUnit : 'cm';
                      const val = isWeight ? convertWeight(m[f]!, settings.weightUnit) : m[f]!;
                      return (
                        <div key={f} className="flex justify-between">
                          <span className="text-muted-foreground truncate">{t(`measurements.${f}`)}</span>
                          <span className="font-mono ml-1">
                            {typeof val === 'number' ? val.toFixed(1) : val}
                            {unit}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                  {m.notes && (
                    <p className="text-xs text-muted-foreground mt-1 italic">{m.notes}</p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {(!measurements || measurements.length === 0) && (
          <div className="text-center py-8 text-muted-foreground">
            <p>{t('measurements.noData')}</p>
            <p className="text-sm mt-1">{t('measurements.startTracking')}</p>
          </div>
        )}
      </div>

      {/* Add dialog */}
      {showAdd && (
        <AddMeasurementDialog onClose={() => setShowAdd(false)} />
      )}
    </div>
  );
}

function AddMeasurementDialog({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation();
  const { settings } = useUIStore();
  const [values, setValues] = useState<Record<string, string>>({});
  const [notes, setNotes] = useState('');

  const setField = (field: string, val: string) => {
    setValues((v) => ({ ...v, [field]: val }));
  };

  const handleSave = async () => {
    const measurement: BodyMeasurement = {
      id: generateId(),
      date: new Date(),
    };

    for (const field of MEASUREMENT_FIELDS) {
      const raw = values[field];
      if (raw && raw.trim()) {
        let val = parseFloat(raw);
        if (!isNaN(val)) {
          // Convert bodyweight from display unit to kg for storage
          if (field === 'bodyweight' && settings.weightUnit === 'lbs') {
            val = Math.round((val / 2.20462) * 10) / 10;
          }
          (measurement as any)[field] = val;
        }
      }
    }

    if (notes.trim()) measurement.notes = notes.trim();

    await db.bodyMeasurements.add(measurement);
    onClose();
  };

  const fieldGroups = [
    {
      label: t('measurements.general'),
      fields: ['bodyweight', 'bodyFatPercent'] as MeasField[],
    },
    {
      label: t('measurements.torso'),
      fields: ['chest', 'waist', 'hips', 'neck'] as MeasField[],
    },
    {
      label: t('measurements.limbs'),
      fields: ['bicepLeft', 'bicepRight', 'thighLeft', 'thighRight', 'calfLeft', 'calfRight'] as MeasField[],
    },
  ];

  return (
    <Dialog open onClose={onClose}>
      <DialogHeader onClose={onClose}>{t('measurements.addEntry')}</DialogHeader>
      <div className="p-4 space-y-4 max-h-[70vh] overflow-y-auto">
        {fieldGroups.map((group) => (
          <div key={group.label} className="space-y-2">
            <h4 className="text-xs font-medium text-muted-foreground uppercase">{group.label}</h4>
            <div className="grid grid-cols-2 gap-2">
              {group.fields.map((field) => {
                const unit =
                  field === 'bodyFatPercent'
                    ? '%'
                    : field === 'bodyweight'
                      ? settings.weightUnit
                      : 'cm';
                return (
                  <div key={field} className="space-y-1">
                    <label className="text-xs text-muted-foreground">
                      {t(`measurements.${field}`)} ({unit})
                    </label>
                    <Input
                      type="text"
                      inputMode="decimal"
                      value={values[field] ?? ''}
                      onChange={(e) => setField(field, e.target.value)}
                      placeholder="—"
                      className="h-9 text-sm"
                    />
                  </div>
                );
              })}
            </div>
          </div>
        ))}

        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">{t('common.notes')}</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder={t('common.notes')}
            rows={2}
            className="w-full rounded-lg border bg-secondary/50 px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
          />
        </div>

        <Button className="w-full" onClick={handleSave}>
          {t('common.save')}
        </Button>
      </div>
    </Dialog>
  );
}
