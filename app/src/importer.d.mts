export type ImportOptions = {
  key: string;
  year: number;
  timeZone: string;
  includeSteps?: boolean;
  includeHealth?: boolean;
  signal?: AbortSignal;
  onProgress?: (message: string) => void;
  onConnected?: () => void | Promise<void>;
  fetcher?: (input: any, init?: any) => Promise<any>;
  timeoutMs?: number;
  sleep?: (ms: number, signal?: AbortSignal) => Promise<void>;
};
export declare function collectRecap(options: ImportOptions): Promise<any>;
export declare function createPersonalSession(options?: {
  fetcher?: (input: any, init?: any) => Promise<any>;
  timeoutMs?: number;
  sleep?: (ms: number, signal?: AbortSignal) => Promise<void>;
}): {
  request: (path: string, data?: any, signal?: AbortSignal) => Promise<any>;
  close: () => void;
};
