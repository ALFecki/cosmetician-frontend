export function apiMessage(error: unknown, fallback = 'Не удалось сохранить изменения. Попробуйте ещё раз'): string {
    const body = (error as { error?: unknown })?.error;
    return typeof body === 'string' && body.length < 500 && !body.trim().startsWith('<') ? body : fallback;
}
