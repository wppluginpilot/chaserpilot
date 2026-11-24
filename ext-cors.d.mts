export const EXT_CORS_HEADERS: Record<string, string>;
export function extCors(req: { method?: string }, res: { setHeader(k: string, v: string): void; statusCode: number; end(): void }, next: () => void): void;
export function withExtCors(response: Response): Response;
