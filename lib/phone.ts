const COLOMBIAN_PHONE_REGEX = /^\+57\d{10}$/

export function normalizeColombianPhoneNumber(input: string): string | null {
  const trimmed = input.trim()
  const digits = trimmed.replace(/\D/g, '')

  if (COLOMBIAN_PHONE_REGEX.test(trimmed)) {
    return trimmed
  }

  if (/^\d{10}$/.test(digits)) {
    return `+57${digits}`
  }

  if (/^57\d{10}$/.test(digits)) {
    return `+${digits}`
  }

  return null
}

export function formatColombianPhoneNumber(phone: string): string {
  const normalized = normalizeColombianPhoneNumber(phone)

  if (!normalized) {
    return phone
  }

  return normalized.replace(/^(\+57)(\d{3})(\d{3})(\d{4})$/, '$1 $2 $3 $4')
}
