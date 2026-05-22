export type NotificationChannels = {
  email: boolean;
  push: boolean;
  inApp: boolean;
};

export type MatchCategoryPreference = {
  enabled: boolean;
  minMatchScore: number;
  channels: NotificationChannels;
};

export type TimedCategoryPreference = {
  enabled: boolean;
  channels: NotificationChannels;
  leadMinutes: number[];
};

export type NotificationCategories = {
  matches: MatchCategoryPreference;
  reminders: TimedCategoryPreference;
  interviews: TimedCategoryPreference;
};

export const DEFAULT_NOTIFICATION_CHANNELS: NotificationChannels = {
  email: true,
  push: false,
  inApp: true,
};

export const DEFAULT_NOTIFICATION_CATEGORIES: NotificationCategories = {
  matches: {
    enabled: false,
    minMatchScore: 70,
    channels: { ...DEFAULT_NOTIFICATION_CHANNELS },
  },
  reminders: {
    enabled: true,
    channels: { ...DEFAULT_NOTIFICATION_CHANNELS },
    leadMinutes: [60],
  },
  interviews: {
    enabled: true,
    channels: { ...DEFAULT_NOTIFICATION_CHANNELS },
    leadMinutes: [60, 1440],
  },
};

export function normalizeChannels(value: unknown): NotificationChannels {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return { ...DEFAULT_NOTIFICATION_CHANNELS };
  }

  const raw = value as Record<string, unknown>;
  return {
    email:
      typeof raw.email === 'boolean'
        ? raw.email
        : DEFAULT_NOTIFICATION_CHANNELS.email,
    push:
      typeof raw.push === 'boolean'
        ? raw.push
        : DEFAULT_NOTIFICATION_CHANNELS.push,
    inApp:
      typeof raw.inApp === 'boolean'
        ? raw.inApp
        : DEFAULT_NOTIFICATION_CHANNELS.inApp,
  };
}

export function normalizeLeadMinutes(value: unknown, fallback: number[]): number[] {
  if (!Array.isArray(value)) {
    return [...fallback];
  }

  const minutes = value
    .filter((item): item is number => typeof item === 'number' && item >= 0)
    .map((item) => Math.floor(item));

  return minutes.length > 0 ? [...new Set(minutes)].sort((a, b) => a - b) : [...fallback];
}

export function normalizeCategories(value: unknown): NotificationCategories {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return structuredClone(DEFAULT_NOTIFICATION_CATEGORIES);
  }

  const raw = value as Record<string, unknown>;
  const matches =
    typeof raw.matches === 'object' && raw.matches !== null && !Array.isArray(raw.matches)
      ? (raw.matches as Record<string, unknown>)
      : {};
  const reminders =
    typeof raw.reminders === 'object' && raw.reminders !== null && !Array.isArray(raw.reminders)
      ? (raw.reminders as Record<string, unknown>)
      : {};
  const interviews =
    typeof raw.interviews === 'object' && raw.interviews !== null && !Array.isArray(raw.interviews)
      ? (raw.interviews as Record<string, unknown>)
      : {};

  return {
    matches: {
      enabled:
        typeof matches.enabled === 'boolean'
          ? matches.enabled
          : DEFAULT_NOTIFICATION_CATEGORIES.matches.enabled,
      minMatchScore:
        typeof matches.minMatchScore === 'number'
          ? Math.min(100, Math.max(0, Math.floor(matches.minMatchScore)))
          : DEFAULT_NOTIFICATION_CATEGORIES.matches.minMatchScore,
      channels: normalizeChannels(matches.channels),
    },
    reminders: {
      enabled:
        typeof reminders.enabled === 'boolean'
          ? reminders.enabled
          : DEFAULT_NOTIFICATION_CATEGORIES.reminders.enabled,
      channels: normalizeChannels(reminders.channels),
      leadMinutes: normalizeLeadMinutes(
        reminders.leadMinutes,
        DEFAULT_NOTIFICATION_CATEGORIES.reminders.leadMinutes,
      ),
    },
    interviews: {
      enabled:
        typeof interviews.enabled === 'boolean'
          ? interviews.enabled
          : DEFAULT_NOTIFICATION_CATEGORIES.interviews.enabled,
      channels: normalizeChannels(interviews.channels),
      leadMinutes: normalizeLeadMinutes(
        interviews.leadMinutes,
        DEFAULT_NOTIFICATION_CATEGORIES.interviews.leadMinutes,
      ),
    },
  };
}

export function mergeCategories(
  current: NotificationCategories,
  patch: Partial<{
    matches: Partial<MatchCategoryPreference>;
    reminders: Partial<TimedCategoryPreference>;
    interviews: Partial<TimedCategoryPreference>;
  }>,
): NotificationCategories {
  return normalizeCategories({
    matches: patch.matches
      ? {
          ...current.matches,
          ...patch.matches,
          channels: patch.matches.channels
            ? { ...current.matches.channels, ...patch.matches.channels }
            : current.matches.channels,
        }
      : current.matches,
    reminders: patch.reminders
      ? {
          ...current.reminders,
          ...patch.reminders,
          channels: patch.reminders.channels
            ? { ...current.reminders.channels, ...patch.reminders.channels }
            : current.reminders.channels,
        }
      : current.reminders,
    interviews: patch.interviews
      ? {
          ...current.interviews,
          ...patch.interviews,
          channels: patch.interviews.channels
            ? { ...current.interviews.channels, ...patch.interviews.channels }
            : current.interviews.channels,
        }
      : current.interviews,
  });
}
