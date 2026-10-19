import { URL } from 'url';

export interface SourceValidationResult {
  url: string;
  isValidUrl: boolean;
  isSsrfSafe: boolean;
  isSecureProtocol: boolean;
  hostname?: string;
  warnings: string[];
  notes: string;
}

export interface CreativeValidationResult {
  headlineValid: boolean;
  descriptionValid: boolean;
  imageUrlValid: boolean;
  warnings: string[];
}

/**
 * Checks whether an IP or hostname is private, loopback, or cloud-metadata (SSRF risk)
 */
function isPrivateOrLocalHost(hostname: string): boolean {
  const lower = hostname.toLowerCase();

  // Common localhost and internal patterns
  if (
    lower === 'localhost' ||
    lower === '127.0.0.1' ||
    lower === '0.0.0.0' ||
    lower === '::1' ||
    lower === '[::1]' ||
    lower.endsWith('.local') ||
    lower.endsWith('.internal') ||
    lower.endsWith('.lan') ||
    lower.endsWith('.corp')
  ) {
    return true;
  }

  // IPv4 Private & Link-Local Ranges
  // 127.0.0.0/8 (Loopback)
  // 10.0.0.0/8 (Private)
  // 172.16.0.0/12 (Private)
  // 192.168.0.0/16 (Private)
  // 169.254.0.0/16 (Link-Local & Cloud Metadata Service - e.g. AWS 169.254.169.254)
  const ipv4Regex = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;
  const match = lower.match(ipv4Regex);
  if (match) {
    const octet1 = parseInt(match[1], 10);
    const octet2 = parseInt(match[2], 10);

    if (octet1 === 127) return true;
    if (octet1 === 10) return true;
    if (octet1 === 172 && octet2 >= 16 && octet2 <= 31) return true;
    if (octet1 === 192 && octet2 === 168) return true;
    if (octet1 === 169 && octet2 === 254) return true;
    if (octet1 === 0) return true;
  }

  return false;
}

/**
 * Validates a single supporting source URL against SSRF and protocol safety
 */
export function validateSourceUrl(urlStr: string): SourceValidationResult {
  const warnings: string[] = [];

  if (!urlStr || typeof urlStr !== 'string') {
    return {
      url: urlStr || '',
      isValidUrl: false,
      isSsrfSafe: false,
      isSecureProtocol: false,
      warnings: ['Source URL is missing or empty.'],
      notes: 'No URL provided.',
    };
  }

  let parsed: URL;
  try {
    parsed = new URL(urlStr.trim());
  } catch {
    return {
      url: urlStr,
      isValidUrl: false,
      isSsrfSafe: false,
      isSecureProtocol: false,
      warnings: ['Invalid URL format.'],
      notes: 'Malformed URL could not be parsed.',
    };
  }

  // Only http and https protocols allowed (reject file:, javascript:, data:, etc.)
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return {
      url: urlStr,
      isValidUrl: false,
      isSsrfSafe: false,
      isSecureProtocol: false,
      hostname: parsed.hostname,
      warnings: [`Disallowed URL scheme "${parsed.protocol}". Only HTTP/HTTPS is permitted.`],
      notes: 'Protocol rejected for security.',
    };
  }

  const isSecure = parsed.protocol === 'https:';
  if (!isSecure) {
    warnings.push('Insecure HTTP protocol. Prefer HTTPS for verifiable public documentation.');
  }

  // SSRF Protection
  const isSsrfBlocked = isPrivateOrLocalHost(parsed.hostname);
  if (isSsrfBlocked) {
    warnings.push(`Potential SSRF hazard: URL targets private or link-local host (${parsed.hostname}).`);
    return {
      url: urlStr,
      isValidUrl: true,
      isSsrfSafe: false,
      isSecureProtocol: isSecure,
      hostname: parsed.hostname,
      warnings,
      notes: 'SSRF check failed: internal address blocked.',
    };
  }

  return {
    url: urlStr,
    isValidUrl: true,
    isSsrfSafe: true,
    isSecureProtocol: isSecure,
    hostname: parsed.hostname,
    warnings,
    notes: warnings.length === 0 ? 'Verified safe public documentation URL.' : warnings.join('; '),
  };
}

/**
 * Validates advertising creative fields
 */
export function validateCreatives(creative: {
  headline?: string;
  description?: string;
  imageUrl?: string;
}): CreativeValidationResult {
  const warnings: string[] = [];
  const headlineValid = Boolean(creative.headline && creative.headline.trim().length >= 5 && creative.headline.trim().length <= 120);
  if (!headlineValid) {
    warnings.push('Ad headline must be between 5 and 120 characters.');
  }

  const descriptionValid = Boolean(creative.description && creative.description.trim().length >= 10 && creative.description.trim().length <= 320);
  if (!descriptionValid) {
    warnings.push('Ad description must be between 10 and 320 characters.');
  }

  let imageUrlValid = false;
  if (creative.imageUrl && typeof creative.imageUrl === 'string') {
    const urlCheck = validateSourceUrl(creative.imageUrl);
    imageUrlValid = urlCheck.isValidUrl && urlCheck.isSsrfSafe;
    if (!imageUrlValid) {
      warnings.push('Cover/creative image URL is invalid or unsafe.');
    }
  } else {
    warnings.push('Missing cover/creative image asset.');
  }

  return {
    headlineValid,
    descriptionValid,
    imageUrlValid,
    warnings,
  };
}
