import { apiJson } from './client';
import type { EnginesResponse, SystemInfo } from './types';

export async function getEngines(signal?: AbortSignal): Promise<EnginesResponse> {
  const deadline = AbortSignal.timeout(15_000);
  return apiJson<EnginesResponse>('/engines', {
    signal: signal ? AbortSignal.any([signal, deadline]) : deadline,
  });
}

export async function getSystemInfo(): Promise<SystemInfo> {
  return apiJson<SystemInfo>('/system/info');
}
