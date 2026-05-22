type NodeEnv = 'development' | 'test' | 'production';

type EnvVars = {
  NODE_ENV?: string;
  PORT?: string;
  RESUME_UPLOAD_MAX_BYTES?: string;
  RESUME_STORAGE_ROOT?: string;
  AI_PROVIDER?: string;
  OPENAI_API_KEY?: string;
  OPENAI_MODEL?: string;
  OPENAI_BASE_URL?: string;
  AI_RESUME_REVIEW_TIMEOUT_MS?: string;
  AI_RESUME_REVIEW_MONTHLY_LIMIT?: string;
  CORS_ORIGIN?: string;
  THROTTLE_TTL_SECONDS?: string;
  THROTTLE_LIMIT?: string;
  AUTH_THROTTLE_LIMIT?: string;
  JWT_ACCESS_SECRET?: string;
  JWT_ACCESS_EXPIRES_IN?: string;
  JWT_ISSUER?: string;
  JWT_AUDIENCE?: string;
  /** Comma-separated user UUIDs allowed to access /api/v1/admin/* routes (temporary until Phase V2G roles). */
  ADMIN_USER_IDS?: string;
  /** Web app URL for Stripe Checkout return URLs (`/dashboard/billing` fallback if unset). */
  FRONTEND_URL?: string;
  STRIPE_SECRET_KEY?: string;
  STRIPE_WEBHOOK_SECRET?: string;
  STRIPE_PRICE_PRO_MONTHLY?: string;
  STRIPE_PRICE_PREMIUM_MONTHLY?: string;
  R2_ACCOUNT_ID?: string;
  R2_ACCESS_KEY_ID?: string;
  R2_SECRET_ACCESS_KEY?: string;
  R2_BUCKET_NAME?: string;
  R2_PUBLIC_URL?: string;
  PASSWORD_RESET_TTL_HOURS?: string;
  SMTP_HOST?: string;
  SMTP_PORT?: string;
  SMTP_USER?: string;
  SMTP_PASS?: string;
  SMTP_FROM?: string;
  ENCRYPTION_KEY?: string;
  GOOGLE_CLIENT_ID?: string;
  GOOGLE_CLIENT_SECRET?: string;
  GOOGLE_CALENDAR_REDIRECT_URI?: string;
};

const ALLOWED_NODE_ENVS: NodeEnv[] = ['development', 'test', 'production'];

export function validateEnv(config: EnvVars): EnvVars {
  const errors: string[] = [];

  if (!config.NODE_ENV) {
    config.NODE_ENV = 'development';
  }

  if (!ALLOWED_NODE_ENVS.includes(config.NODE_ENV as NodeEnv)) {
    errors.push(`NODE_ENV must be one of: ${ALLOWED_NODE_ENVS.join(', ')}.`);
  }

  const defaultResumeMaxBytes = 5 * 1024 * 1024;
  if (!config.RESUME_UPLOAD_MAX_BYTES) {
    config.RESUME_UPLOAD_MAX_BYTES = String(defaultResumeMaxBytes);
  } else if (!/^\d+$/.test(config.RESUME_UPLOAD_MAX_BYTES)) {
    errors.push('RESUME_UPLOAD_MAX_BYTES must be a valid number.');
  } else if (Number(config.RESUME_UPLOAD_MAX_BYTES) <= 0) {
    errors.push('RESUME_UPLOAD_MAX_BYTES must be greater than zero.');
  }

  if (!config.AI_PROVIDER) {
    config.AI_PROVIDER = 'mock';
  }
  const aiProviderMode = config.AI_PROVIDER.toLowerCase();
  const allowedAiProviders = ['mock', 'openai'];
  if (!allowedAiProviders.includes(aiProviderMode)) {
    errors.push(
      `AI_PROVIDER must be one of: ${allowedAiProviders.join(', ')}.`,
    );
  }

  if (aiProviderMode === 'openai' && !config.OPENAI_API_KEY?.trim()) {
    errors.push('OPENAI_API_KEY is required when AI_PROVIDER is openai.');
  }

  if (!config.OPENAI_MODEL?.trim()) {
    config.OPENAI_MODEL = 'gpt-4o-mini';
  }

  if (!config.OPENAI_BASE_URL?.trim()) {
    config.OPENAI_BASE_URL = 'https://api.openai.com/v1';
  } else {
    try {
      new URL(config.OPENAI_BASE_URL.trim());
    } catch {
      errors.push('OPENAI_BASE_URL must be a valid URL.');
    }
  }

  if (!config.AI_RESUME_REVIEW_TIMEOUT_MS) {
    config.AI_RESUME_REVIEW_TIMEOUT_MS = '60000';
  } else if (!/^\d+$/.test(config.AI_RESUME_REVIEW_TIMEOUT_MS)) {
    errors.push('AI_RESUME_REVIEW_TIMEOUT_MS must be a valid number.');
  } else if (Number(config.AI_RESUME_REVIEW_TIMEOUT_MS) <= 0) {
    errors.push('AI_RESUME_REVIEW_TIMEOUT_MS must be greater than zero.');
  }

  if (!config.AI_RESUME_REVIEW_MONTHLY_LIMIT?.trim()) {
    config.AI_RESUME_REVIEW_MONTHLY_LIMIT = '-1';
  }
  const quotaLim = config.AI_RESUME_REVIEW_MONTHLY_LIMIT.trim();
  const quotaLower = quotaLim.toLowerCase();
  if (
    quotaLower !== '-1' &&
    quotaLower !== 'unlimited' &&
    !/^[1-9]\d*$/.test(quotaLim)
  ) {
    errors.push(
      'AI_RESUME_REVIEW_MONTHLY_LIMIT must be -1, unlimited, or a positive integer.',
    );
  }

  if (config.PORT === undefined || config.PORT === '') {
    config.PORT = '3000';
  } else if (!/^\d+$/.test(config.PORT)) {
    errors.push('PORT must be a valid number.');
  }

  if (!config.THROTTLE_TTL_SECONDS) {
    config.THROTTLE_TTL_SECONDS = '60';
  } else if (!/^\d+$/.test(config.THROTTLE_TTL_SECONDS)) {
    errors.push('THROTTLE_TTL_SECONDS must be a valid number.');
  }

  if (!config.THROTTLE_LIMIT) {
    config.THROTTLE_LIMIT = '100';
  } else if (!/^\d+$/.test(config.THROTTLE_LIMIT)) {
    errors.push('THROTTLE_LIMIT must be a valid number.');
  }

  if (!config.AUTH_THROTTLE_LIMIT) {
    config.AUTH_THROTTLE_LIMIT = '30';
  } else if (!/^\d+$/.test(config.AUTH_THROTTLE_LIMIT)) {
    errors.push('AUTH_THROTTLE_LIMIT must be a valid number.');
  }

  if (!config.JWT_ACCESS_SECRET) {
    errors.push('JWT_ACCESS_SECRET is required.');
  }

  if (!config.JWT_ACCESS_EXPIRES_IN) {
    config.JWT_ACCESS_EXPIRES_IN = '15m';
  } else if (!/^\d+(ms|s|m|h|d|w|y)$/.test(config.JWT_ACCESS_EXPIRES_IN)) {
    errors.push(
      'JWT_ACCESS_EXPIRES_IN must match duration format like 15m, 1h, or 7d.',
    );
  }

  if (config.JWT_ISSUER) {
    try {
      const url = new URL(config.JWT_ISSUER);
      if (!['http:', 'https:'].includes(url.protocol)) {
        errors.push('JWT_ISSUER must use http or https protocol.');
      }
    } catch {
      errors.push('JWT_ISSUER must be a valid URL when provided.');
    }
  }

  if (!config.CORS_ORIGIN) {
    config.CORS_ORIGIN = 'http://localhost:3000,http://localhost:8081';
  }

  const origins = config.CORS_ORIGIN.split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  if (origins.length === 0) {
    errors.push('CORS_ORIGIN must include at least one valid origin.');
  } else {
    const invalidOrigins = origins.filter((origin) => {
      try {
        const url = new URL(origin);
        return !['http:', 'https:'].includes(url.protocol);
      } catch {
        return true;
      }
    });

    if (invalidOrigins.length > 0) {
      errors.push(
        `CORS_ORIGIN contains invalid URL(s): ${invalidOrigins.join(', ')}.`,
      );
    }
  }

  const uuidLooseRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

  if (config.ADMIN_USER_IDS?.trim()) {
    const ids = config.ADMIN_USER_IDS.split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    if (ids.length === 0) {
      errors.push('ADMIN_USER_IDS, if set, cannot be blank.');
    } else if (ids.some((id) => !uuidLooseRegex.test(id))) {
      errors.push(
        'ADMIN_USER_IDS must be a comma-separated list of UUID strings.',
      );
    }
  }

  if (config.FRONTEND_URL?.trim()) {
    try {
      const url = new URL(config.FRONTEND_URL.trim());
      if (!['http:', 'https:'].includes(url.protocol)) {
        errors.push('FRONTEND_URL must use http or https.');
      }
    } catch {
      errors.push('FRONTEND_URL must be a valid URL when set.');
    }
  }

  const r2Vars = [
    'R2_ACCOUNT_ID',
    'R2_ACCESS_KEY_ID',
    'R2_SECRET_ACCESS_KEY',
    'R2_BUCKET_NAME',
    'R2_PUBLIC_URL',
  ] as const;
  const r2Configured = r2Vars.some((key) => config[key]?.trim());
  if (r2Configured) {
    for (const key of r2Vars) {
      if (!config[key]?.trim()) {
        errors.push(`${key} is required when R2 avatar storage is configured.`);
      }
    }
    if (config.R2_PUBLIC_URL?.trim()) {
      try {
        const url = new URL(config.R2_PUBLIC_URL.trim());
        if (!['http:', 'https:'].includes(url.protocol)) {
          errors.push('R2_PUBLIC_URL must use http or https.');
        }
      } catch {
        errors.push('R2_PUBLIC_URL must be a valid URL.');
      }
    }
  }

  if (!config.PASSWORD_RESET_TTL_HOURS?.trim()) {
    config.PASSWORD_RESET_TTL_HOURS = '1';
  } else if (!/^\d+$/.test(config.PASSWORD_RESET_TTL_HOURS.trim())) {
    errors.push('PASSWORD_RESET_TTL_HOURS must be a valid number.');
  } else if (Number(config.PASSWORD_RESET_TTL_HOURS) <= 0) {
    errors.push('PASSWORD_RESET_TTL_HOURS must be greater than zero.');
  }

  if (config.SMTP_PORT?.trim() && !/^\d+$/.test(config.SMTP_PORT.trim())) {
    errors.push('SMTP_PORT must be a valid number.');
  }

  if (!config.ENCRYPTION_KEY?.trim()) {
    if (config.NODE_ENV === 'test') {
      config.ENCRYPTION_KEY = Buffer.alloc(32, 1).toString('base64');
    } else {
      errors.push(
        'ENCRYPTION_KEY is required (generate with: openssl rand -base64 32).',
      );
    }
  } else {
    const keyBytes = Buffer.from(config.ENCRYPTION_KEY.trim(), 'base64');
    if (keyBytes.length !== 32) {
      errors.push(
        'ENCRYPTION_KEY must decode to 32 bytes (openssl rand -base64 32).',
      );
    }
  }

  const googleVars = [
    'GOOGLE_CLIENT_ID',
    'GOOGLE_CLIENT_SECRET',
    'GOOGLE_CALENDAR_REDIRECT_URI',
  ] as const;
  const googleConfigured = googleVars.some((key) => config[key]?.trim());
  if (googleConfigured) {
    for (const key of googleVars) {
      if (!config[key]?.trim()) {
        errors.push(`${key} is required when Google Calendar is configured.`);
      }
    }
    if (config.GOOGLE_CALENDAR_REDIRECT_URI?.trim()) {
      try {
        const url = new URL(config.GOOGLE_CALENDAR_REDIRECT_URI.trim());
        if (!['http:', 'https:'].includes(url.protocol)) {
          errors.push('GOOGLE_CALENDAR_REDIRECT_URI must use http or https.');
        }
      } catch {
        errors.push('GOOGLE_CALENDAR_REDIRECT_URI must be a valid URL.');
      }
    }
    if (!config.FRONTEND_URL?.trim()) {
      errors.push(
        'FRONTEND_URL is required when Google Calendar OAuth is configured.',
      );
    }
  }

  if (errors.length > 0) {
    throw new Error(`Environment validation failed: ${errors.join(' ')}`);
  }

  return config;
}
