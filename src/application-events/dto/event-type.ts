export const EVENT_TYPES = [
  'STATUS_CHANGE',
  'NOTE',
  'RECRUITER_UPDATE',
  'INTERVIEW_UPDATE',
  'REMINDER_CREATED',
  'GENERAL_UPDATE',
] as const;

export type EventTypeLiteral = (typeof EVENT_TYPES)[number];
