import { formatInTimeZone } from 'date-fns-tz';

const TIMEZONE = 'Asia/Ho_Chi_Minh';

/**
 * Returns the current date in Vietnam time as a formatted string (YYYY-MM-DD)
 */
export function getTodayString(): string {
    return formatInTimeZone(new Date(), TIMEZONE, 'yyyy-MM-dd');
}

/**
 * Formats a date for display in Vietnam locale (GMT+7)
 */
export function formatVNDate(date: Date | string | number, pattern: string = 'HH:mm dd/MM/yyyy'): string {
    const d = typeof date === 'string' || typeof date === 'number' ? new Date(date) : date;
    return formatInTimeZone(d, TIMEZONE, pattern);
}
