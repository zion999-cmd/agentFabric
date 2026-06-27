// API response envelope (per patterns.md). Consistent shape for all routes.

import type { Response } from 'express';

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  meta?: {
    total: number;
    page: number;
    limit: number;
  };
}

export const ok = <T>(res: Response, data: T, meta?: ApiResponse<T>['meta']): Response => {
  const body: ApiResponse<T> = { success: true, data };
  if (meta) body.meta = meta;
  return res.json(body);
};

export const fail = (res: Response, status: number, error: string): Response => {
  const body: ApiResponse<never> = { success: false, error };
  return res.status(status).json(body);
};
