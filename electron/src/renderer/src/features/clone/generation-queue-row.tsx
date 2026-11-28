import {
  BanIcon,
  CircleAlertIcon,
  CircleCheckIcon,
  ClockIcon,
  LoaderCircleIcon,
  XIcon,
  type LucideIcon,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { audioUrl } from '@/lib/api/client';
import { EditPitchButton } from '@/features/tools/edit-pitch-button';
import { SaveAudioButton } from '@/components/save-audio-button';
import { WaveformPlayer } from '@/components/waveform-player';
import { Button } from '@/components/ui/button';
import type { GenerationQueueItem, GenerationQueueStatus } from '@/hooks/use-generate';
import { cn } from '@/lib/utils';

const STATUS_ICON: Record<GenerationQueueStatus, LucideIcon> = {
  queued: ClockIcon,
  running: LoaderCircleIcon,
  done: CircleCheckIcon,
  failed: CircleAlertIcon,
  cancelled: BanIcon,
};

const STATUS_TONE: Record<GenerationQueueStatus, string> = {
  queued: 'text-muted-foreground',
  running: 'text-primary animate-spin motion-reduce:animate-none',
  done: 'text-emerald-600 dark:text-emerald-400',
  failed: 'text-destructive',
  cancelled: 'text-muted-foreground',
};

/** One take in the generation queue: status, script start, voice and any error. */
export function QueueRow({
  item,
  position,
  onRemove,
}: {
  item: GenerationQueueItem;
  /** 1-based place in line for a waiting take. */
  position: number | null;
  onRemove: (id: string) => void;
}) {
  const { t } = useTranslation();
  const Icon = STATUS_ICON[item.status];
  const statusText = t(`generationQueue.status.${item.status}`);
  const title = item.batch
    ? t('cloneTakes.take', { index: item.batch.index, count: item.batch.count })
    : item.label;
  return (
    <li
      data-status={item.status}
      className={cn(
        'flex items-start gap-2.5 rounded-md px-2 py-1.5',
        item.status === 'running' && 'bg-primary/5',
      )}
    >
      <Icon aria-hidden="true" className={cn('mt-0.5 size-4 shrink-0', STATUS_TONE[item.status])} />
      <div className="min-w-0 flex-1">
        <p
          className={cn(
            'truncate text-sm',
            item.status === 'cancelled' && 'text-muted-foreground line-through',
          )}
          title={item.label}
        >
          {title}
        </p>
        <p className="truncate text-xs text-muted-foreground">
          <span className="sr-only">{statusText}. </span>
          {[
            position != null ? t('generationQueue.position', { position }) : statusText,
            item.voice,
            item.batch && item.label,
          ]
            .filter(Boolean)
            .join(' · ')}
        </p>
        {item.audioPath && (
          <div className="my-1 flex flex-wrap items-center gap-x-2">
            <WaveformPlayer
              className="min-w-32 flex-1"
              compact
              showWaveform={false}
              src={audioUrl(item.audioPath)}
              source={item.id}
            />
            <SaveAudioButton url={audioUrl(item.audioPath)} suggestedName={item.audioPath} />
            <EditPitchButton audioPath={item.audioPath} />
          </div>
        )}
        {item.status === 'failed' && item.error && (
          <p className="mt-0.5 line-clamp-2 text-xs text-destructive">{item.error}</p>
        )}
      </div>
      {item.status === 'queued' && (
        <Button
          variant="ghost"
          size="icon-sm"
          className="shrink-0"
          aria-label={t('generationQueue.remove')}
          title={t('generationQueue.remove')}
          onClick={() => onRemove(item.id)}
        >
          <XIcon />
        </Button>
      )}
    </li>
  );
}
