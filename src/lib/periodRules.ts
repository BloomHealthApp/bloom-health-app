// Validation rules for a period entry (docs/api-contract.md "period"). Pure: shared by the tracker screen, the
// offline write path and the mock server so all three enforce exactly the same contract.
import { diffDays } from './dates';
import { PERIOD_FLOWS, PERIOD_MAX_DAYS, PERIOD_MAX_NOTE, PERIOD_MAX_SYMPTOMS, PERIOD_MOODS, PERIOD_SYMPTOMS } from '@/types/api';

export type PeriodRuleError =
  | 'invalid_date'
  | 'future_date'
  | 'end_before_start'
  | 'too_long'
  | 'overlap'
  | 'ongoing_exists'
  | 'invalid_flow'
  | 'invalid_symptom'
  | 'too_many_symptoms'
  | 'invalid_mood'
  | 'note_too_long';

export interface PeriodFields {
  startDate: string;
  endDate: string | null;
  flow: string;
  symptoms: string[];
  mood: string | null;
  note: string | null;
}
export interface PeriodRange {
  id: string;
  startDate: string;
  endDate: string | null;
  deletedAt?: string | null;
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
export function isValidLocalDate(s: unknown): s is string {
  if (typeof s !== 'string' || !DATE_RE.test(s)) return false;
  const [y, m, d] = s.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
}

/** First broken rule, or null. `others` are the owner's other periods (the entry itself is excluded by id). */
export function validatePeriod(p: PeriodFields, others: PeriodRange[], today: string, selfId?: string): PeriodRuleError | null {
  if (!isValidLocalDate(p.startDate) || (p.endDate !== null && !isValidLocalDate(p.endDate))) return 'invalid_date';
  if (p.startDate > today) return 'future_date';
  if (p.endDate !== null) {
    if (p.endDate < p.startDate) return 'end_before_start';
    if (diffDays(p.endDate, p.startDate) + 1 > PERIOD_MAX_DAYS) return 'too_long';
  }
  if (!(PERIOD_FLOWS as readonly string[]).includes(p.flow)) return 'invalid_flow';
  if (p.symptoms.length > PERIOD_MAX_SYMPTOMS || new Set(p.symptoms).size !== p.symptoms.length) return 'too_many_symptoms';
  if (p.symptoms.some((s) => !(PERIOD_SYMPTOMS as readonly string[]).includes(s))) return 'invalid_symptom';
  if (p.mood !== null && !(PERIOD_MOODS as readonly string[]).includes(p.mood)) return 'invalid_mood';
  if (p.note !== null && p.note.length > PERIOD_MAX_NOTE) return 'note_too_long';
  const live = others.filter((o) => !o.deletedAt && o.id !== selfId);
  if (p.endDate === null && live.some((o) => o.endDate === null)) return 'ongoing_exists';
  const end = p.endDate ?? '9999-12-31';
  if (live.some((o) => p.startDate <= (o.endDate ?? '9999-12-31') && o.startDate <= end)) return 'overlap';
  return null;
}

const MESSAGES: Record<PeriodRuleError, string> = {
  invalid_date: 'That date is not valid.',
  future_date: 'The start date cannot be in the future.',
  end_before_start: 'The end date must be on or after the start date.',
  too_long: `A period can be at most ${PERIOD_MAX_DAYS} days long.`,
  overlap: 'This overlaps another logged period.',
  ongoing_exists: 'Another period is still ongoing. End it first.',
  invalid_flow: 'Choose light, medium or heavy flow.',
  invalid_symptom: 'One of the symptoms is not supported.',
  too_many_symptoms: `Choose up to ${PERIOD_MAX_SYMPTOMS} different symptoms.`,
  invalid_mood: 'That mood is not supported.',
  note_too_long: `Notes can be at most ${PERIOD_MAX_NOTE} characters.`,
};
export const periodErrorMessage = (e: PeriodRuleError): string => MESSAGES[e];

export class PeriodValidationError extends Error {
  constructor(public reason: PeriodRuleError) {
    super(MESSAGES[reason]);
    this.name = 'PeriodValidationError';
  }
}
