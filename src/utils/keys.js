import { randomBytes } from 'crypto';

export function generateKey(prefix = 'AUTOADV') {
  const part1 = randomBytes(4).toString('hex').toUpperCase();
  const part2 = randomBytes(4).toString('hex').toUpperCase();
  const part3 = randomBytes(4).toString('hex').toUpperCase();
  return `${prefix}-${part1}-${part2}-${part3}`;
}

export function parseChannelIds(input) {
  return input
    .split(/[\s,]+/)
    .map(id => id.replace(/<#(\d+)>/, '$1').trim())
    .filter(id => /^\d+$/.test(id));
}

export function formatExpiry(expiresAt) {
  if (!expiresAt) return 'Never';
  const now = Date.now();
  const exp = new Date(expiresAt).getTime();
  const diff = exp - now;
  if (diff <= 0) return '**Expired**';
  const days = Math.floor(diff / 86400000);
  const hours = Math.floor((diff % 86400000) / 3600000);
  return `${days}d ${hours}h`;
}

export function maskToken(token) {
  if (!token || token.length < 10) return '****';
  return token.substring(0, 6) + '...' + token.substring(token.length - 4);
}
