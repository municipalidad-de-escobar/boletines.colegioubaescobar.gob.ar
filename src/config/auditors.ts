// External auditor emails granted read-only access despite not being on the
// institutional @colegioubaescobar.gob.ar domain. Edit this list and redeploy
// to add or revoke an auditor.
//
// Matching is exact and case-insensitive.
export const AUDITOR_EMAILS: readonly string[] = [
  'sitios.escobarmunicipio@gmail.com',
  'pmorante@gmail.com',
];

export const INSTITUTIONAL_DOMAIN = 'colegioubaescobar.gob.ar';

const normalize = (email: string | null | undefined): string =>
  (email ?? '').trim().toLowerCase();

export function isInstitutionalEmail(email: string | null | undefined): boolean {
  const normalized = normalize(email);
  return normalized.endsWith(`@${INSTITUTIONAL_DOMAIN}`);
}

export function isAuditorEmail(email: string | null | undefined): boolean {
  const normalized = normalize(email);
  if (!normalized) return false;
  return AUDITOR_EMAILS.some((auditor) => auditor.toLowerCase() === normalized);
}

export function canLogIn(email: string | null | undefined): boolean {
  return isInstitutionalEmail(email) || isAuditorEmail(email);
}
