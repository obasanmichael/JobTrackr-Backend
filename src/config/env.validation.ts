type NodeEnv = 'development' | 'test' | 'production';

type EnvVars = {
  NODE_ENV?: string;
  PORT?: string;
};

const ALLOWED_NODE_ENVS: NodeEnv[] = ['development', 'test', 'production'];

export function validateEnv(config: EnvVars): EnvVars {
  const errors: string[] = [];

  if (!config.NODE_ENV) {
    config.NODE_ENV = 'development';
  }

  if (!ALLOWED_NODE_ENVS.includes(config.NODE_ENV as NodeEnv)) {
    errors.push(
      `NODE_ENV must be one of: ${ALLOWED_NODE_ENVS.join(', ')}.`,
    );
  }

  if (config.PORT === undefined || config.PORT === '') {
    config.PORT = '3000';
  } else if (!/^\d+$/.test(config.PORT)) {
    errors.push('PORT must be a valid number.');
  }

  if (errors.length > 0) {
    throw new Error(`Environment validation failed: ${errors.join(' ')}`);
  }

  return config;
}
