import type { AuthorizedWhatsappContact } from '@/db/types'
import { normalizeColombianPhoneNumber } from '@/lib/phone'

export function normalizeWhatsappContactName(input: string): string {
  return input.trim().replace(/\s+/g, ' ')
}

export function normalizeWhatsappContact(input: {
  name: string
  phone: string
}): AuthorizedWhatsappContact | null {
  const name = normalizeWhatsappContactName(input.name)
  const phone = normalizeColombianPhoneNumber(input.phone)

  if (!name || !phone) {
    return null
  }

  return { name, phone }
}

export function parseAuthorizedWhatsappContacts(raw: unknown): AuthorizedWhatsappContact[] {
  if (!Array.isArray(raw)) {
    return []
  }

  const contacts = new Map<string, AuthorizedWhatsappContact>()

  for (const item of raw) {
    if (!item || typeof item !== 'object') {
      continue
    }

    const candidate = normalizeWhatsappContact({
      name: typeof (item as { name?: unknown }).name === 'string'
        ? (item as { name: string }).name
        : '',
      phone: typeof (item as { phone?: unknown }).phone === 'string'
        ? (item as { phone: string }).phone
        : '',
    })

    if (!candidate || contacts.has(candidate.phone)) {
      continue
    }

    contacts.set(candidate.phone, candidate)
  }

  return Array.from(contacts.values())
}
