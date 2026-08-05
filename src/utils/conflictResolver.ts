/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface TimestampedItem {
  id: string;
  updatedAt?: string | number;
  timestamp?: string | number;
}

/**
 * Resolves LWW (Last-Write-Wins) conflicts at the individual record/entity level
 * rather than blindly replacing whole collection arrays with stale snapshots.
 */
export function resolveItemLWWConflict<T extends TimestampedItem>(
  existingItem: T | undefined,
  incomingItem: T
): T {
  if (!existingItem) return incomingItem;

  const existingTime = getItemTimestampMs(existingItem);
  const incomingTime = getItemTimestampMs(incomingItem);

  // Compare timestamps: if incoming item is newer or equal, incoming wins; otherwise existing item wins
  if (incomingTime >= existingTime) {
    return incomingItem;
  }
  return existingItem;
}

/**
 * Merges two entity collections (e.g. local cache vs remote server sync) by ID,
 * applying item-level LWW conflict resolution to prevent overwriting concurrent updates.
 */
export function mergeCollectionsWithLWW<T extends TimestampedItem>(
  localCollection: T[],
  remoteCollection: T[]
): T[] {
  const map = new Map<string, T>();

  // Seed with local items
  for (const item of localCollection) {
    if (item && item.id) {
      map.set(item.id, item);
    }
  }

  // Merge remote items individually using timestamp-based conflict resolution
  for (const remoteItem of remoteCollection) {
    if (remoteItem && remoteItem.id) {
      const existingLocal = map.get(remoteItem.id);
      const winner = resolveItemLWWConflict(existingLocal, remoteItem);
      map.set(remoteItem.id, winner);
    }
  }

  return Array.from(map.values());
}

/**
 * Extracts a numeric epoch timestamp in milliseconds from item properties.
 */
export function getItemTimestampMs(item: TimestampedItem): number {
  if (item.updatedAt) {
    const t = typeof item.updatedAt === 'number' ? item.updatedAt : new Date(item.updatedAt).getTime();
    if (!isNaN(t) && t > 0) return t;
  }
  if (item.timestamp) {
    const t = typeof item.timestamp === 'number' ? item.timestamp : new Date(item.timestamp).getTime();
    if (!isNaN(t) && t > 0) return t;
  }
  return 0;
}
