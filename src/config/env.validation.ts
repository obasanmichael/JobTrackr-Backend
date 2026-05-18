type NodeEnv = 'development' | 'test' | 'production';

type EnvVars = {
  NODE_ENV?: string;
  PORT?: string;
  RESUME_UPLOAD_MAX_BYTES?: string;
  RESUME_STORAGE_ROOT?: string;
  CORS_ORIGIN?: string;
  THROTTLE_TTL_SECONDS?: string;
  THROTTLE_LIMIT?: string;
  AUTH_THROTTLE_LIMIT?: string;
  JWT_ACCESS_SECRET?: string;
  JWT_ACCESS_EXPIRES_IN?: string;
  JWT_ISSUER?: string;
  JWT_AUDIENCE?: string;
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

  if (errors.length > 0) {
    throw new Error(`Environment validation failed: ${errors.join(' ')}`);
  }

  return config;
}
