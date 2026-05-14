type NodeEnv = 'development' | 'test' | 'production';

type EnvVars = {
  NODE_ENV?: string;
  PORT?: string;
  CORS_ORIGIN?: string;
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

  if (config.PORT === undefined || config.PORT === '') {
    config.PORT = '3000';
  } else if (!/^\d+$/.test(config.PORT)) {
    errors.push('PORT must be a valid number.');
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
