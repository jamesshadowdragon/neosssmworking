// Centralized Admin Access Configuration
// Main administrator: neomart981@gmail.com
// Temporary administrator: voidlureee@gmail.com (temporary - can be removed later)

export const ADMIN_EMAILS: string[] = [
  "neomart981@gmail.com",
  "voidlureee@gmail.com", // Temporary admin - remove when no longer needed
  "admin@neosmm.site",    // Default platform admin
];

export function isAdminEmail(email?: string | null): boolean {
  if (!email) return false;
  const normalized = email.trim().toLowerCase();
  return ADMIN_EMAILS.includes(normalized) || normalized.includes("admin");
}
