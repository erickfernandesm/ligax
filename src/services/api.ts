// Cliente da API da plataforma. Todas as telas falam com o servidor por aqui;
// num app nativo basta trocar a URL base.

const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? '';

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

export async function api<T>(path: string, options: { method?: string; body?: unknown } = {}): Promise<T> {
  let response: Response;
  try {
    response = await fetch(API_BASE + path, {
      method: options.method ?? (options.body === undefined ? 'GET' : 'POST'),
      headers: options.body === undefined ? undefined : { 'Content-Type': 'application/json' },
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
      credentials: 'same-origin',
      cache: 'no-store',
    });
  } catch {
    throw new ApiError(0, 'Sem conexão com o servidor. Confira sua internet e tente de novo.');
  }
  if (response.status === 204) return null as T;
  const data = await response.json().catch(() => null);
  if (!response.ok) throw new ApiError(response.status, data?.error ?? 'Algo deu errado. Tente de novo.');
  return data as T;
}

/** Mensagem pronta para mostrar na tela, venha o erro de onde vier. */
export function errorMessage(err: unknown): string {
  return err instanceof ApiError ? err.message : 'Algo deu errado. Tente de novo.';
}
