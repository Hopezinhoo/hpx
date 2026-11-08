export function isOwner(user: { email: string } | null, ownerEmail: string | undefined) {
  return Boolean(user && ownerEmail && user.email.trim().toLowerCase() === ownerEmail.trim().toLowerCase());
}
