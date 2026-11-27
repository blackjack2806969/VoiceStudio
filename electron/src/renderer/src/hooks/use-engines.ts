import { useQuery } from '@tanstack/react-query';
import { getEngines } from '@/lib/api/engines';
import { apiJson } from '@/lib/api/client';
import type { EngineBackend, EngineFamilyState, EnginesResponse } from '@/lib/api/types';
import { queryKeys } from '@/lib/query';
import { useBackendStatus } from './use-backend-status';
import { isBackendReachable } from '@shared/utils/backendStage';

const ENGINES_STALE_MS = 30_000;
// While the selected TTS engine is unusable, poll: the user may be installing
// it in Settings and the composer should unlock without a restart.
const ENGINES_POLL_WHILE_UNREADY_MS = 15_000;

export interface UseEnginesResult {
  data?: EnginesResponse;
  activeTts: EngineBackend | null;
  activeTtsReady: boolean;
  isLoading: boolean;
  isError: boolean;
  error: unknown;
  retry: () => void;
}

export function engineFamilyState(
  data: Partial<EnginesResponse> | undefined,
  family: keyof EnginesResponse,
): EngineFamilyState | undefined {
  const state = (data as Partial<EnginesResponse> | undefined)?.[family];
  return state && Array.isArray(state.backends) ? state : undefined;
}

export function activeTtsBackend(data: Partial<EnginesResponse> | undefined): EngineBackend | null {
  const tts = engineFamilyState(data, 'tts');
  if (!tts) return null;
  const active = tts.active;
  return (active && tts.backends.find((backend) => backend.id === active)) || null;
}

export function activeTtsReady(data: Partial<EnginesResponse> | undefined): boolean {
  return activeTtsBackend(data)?.available === true;
}

type TtsEnginesResult = Omit<UseEnginesResult, 'data'> & { data?: Pick<EnginesResponse, 'tts'> };

export function useEngines(): UseEnginesResult;
export function useEngines(family: 'tts'): TtsEnginesResult;
export function useEngines(family?: 'tts'): TtsEnginesResult {
  const status = useBackendStatus();
  const packagedTts = family === 'tts' && Boolean(window.voicestudio?.backend?.installCosyVoice);
  const query = useQuery({
    queryKey: packagedTts ? [...queryKeys.engines, 'tts'] : queryKeys.engines,
    queryFn: async ({ signal }) => packagedTts
      ? { tts: await apiJson<EngineFamilyState>('/engines/tts', {
          signal: AbortSignal.any([signal, AbortSignal.timeout(15_000)]),
        }) }
      : getEngines(signal),
    retry: false,
    staleTime: ENGINES_STALE_MS,
    enabled: isBackendReachable(status.stage),
    refetchInterval: (query) =>
      activeTtsReady(query.state.data) ? false : ENGINES_POLL_WHILE_UNREADY_MS,
  });
  return {
    data: query.data,
    activeTts: activeTtsBackend(query.data),
    activeTtsReady: activeTtsReady(query.data),
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    retry: () => {
      void query.refetch();
    },
  };
}
