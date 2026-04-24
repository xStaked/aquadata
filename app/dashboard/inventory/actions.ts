'use server'

// Inventory actions live alongside feed actions since they share the same domain.
// Re-export here so the inventory module has its own action surface.
export {
  createFeedInventoryEntry,
  updateFeedInventoryEntry,
  deleteFeedInventoryEntry,
} from '@/app/dashboard/feed/actions'
