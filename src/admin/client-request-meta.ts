import type { Request } from 'express';

export type ClientRequestMeta = {
  ipAddress?: string;
  userAgent?: string;
};

export function clientRequestMeta(req: Request): ClientRequestMeta {
  const fwd = req.headers['x-forwarded-for'];
  const firstFromForwarded =
    typeof fwd === 'string'
      ? fwd.split(',')[0]?.trim()
      : Array.isArray(fwd)
        ? fwd[0]?.trim()
        : undefined;
  const rawIp = typeof req.ip === 'string' ? req.ip : undefined;
  const ipAddress = rawIp ?? firstFromForwarded;
  const userAgentRaw = req.headers['user-agent'];
  const userAgent =
    typeof userAgentRaw === 'string' ? userAgentRaw.slice(0, 2000) : undefined;

  return { ipAddress, userAgent };
}
