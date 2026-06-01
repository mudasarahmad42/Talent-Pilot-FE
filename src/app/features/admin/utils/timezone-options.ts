import { AbstractControl, ValidationErrors } from '@angular/forms';
import { FALLBACK_TIMEZONES } from '../constants/admin-page.constants';
import { TimezoneOption } from '../models/admin-page.models';

function isValidTimeZone(timeZone: string): boolean {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone }).format(new Date());
    return true;
  } catch {
    return false;
  }
}

export function timezoneValidator(control: AbstractControl): ValidationErrors | null {
  const value = String(control.value ?? '');
  return isValidTimeZone(value) ? null : { timezone: true };
}

function getTimeZoneOffsetMinutes(timeZone: string, date = new Date()): number {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  });
  const parts = formatter.formatToParts(date).reduce<Record<string, string>>((result, part) => {
    result[part.type] = part.value;
    return result;
  }, {});
  const asUtc = Date.UTC(
    Number(parts['year'] ?? 0),
    Number(parts['month'] ?? 1) - 1,
    Number(parts['day'] ?? 1),
    Number(parts['hour'] ?? 0),
    Number(parts['minute'] ?? 0),
    Number(parts['second'] ?? 0),
  );

  return Math.round((asUtc - date.getTime()) / 60000);
}

function formatTimeZoneOffset(offsetMinutes: number): string {
  const sign = offsetMinutes >= 0 ? '+' : '-';
  const absoluteMinutes = Math.abs(offsetMinutes);
  const hours = Math.floor(absoluteMinutes / 60)
    .toString()
    .padStart(2, '0');
  const minutes = (absoluteMinutes % 60).toString().padStart(2, '0');

  return `GMT${sign}${hours}:${minutes}`;
}

export function buildTimezoneOptions(currentTimezone: string): TimezoneOption[] {
  const intlWithSupportedValues = Intl as typeof Intl & {
    supportedValuesOf?: (key: 'timeZone') => string[];
  };
  const sourceTimezones = intlWithSupportedValues.supportedValuesOf?.('timeZone') ?? FALLBACK_TIMEZONES;

  return Array.from(new Set(['UTC', ...sourceTimezones, currentTimezone]))
    .filter(isValidTimeZone)
    .map((timeZone) => {
      const offsetMinutes = getTimeZoneOffsetMinutes(timeZone);
      return {
        value: timeZone,
        label: `${timeZone} (${formatTimeZoneOffset(offsetMinutes)})`,
        offsetMinutes,
      };
    })
    .sort((first, second) => first.offsetMinutes - second.offsetMinutes || first.value.localeCompare(second.value));
}
