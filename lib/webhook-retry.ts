/**
 * Webhook retry mechanism using Upstash Redis.
 *
 * When a webhook handler fails (e.g., Supabase is temporarily down),
 * failed events are queued for retry instead of being lost.
 *
 * Usage:
 *   import { queueWebhookRetry } from "@/lib/webhook-retry";
 *   try {
 *     // handle webhook
 *   } catch (error) {
 *     await queueWebhookRetry(eventId, eventType, payload);
 *   }
 */

import { Redis } from "@upstash/redis";
import { logger } from "./logger";

// Graceful fallback: if Redis env vars are missing, webhook retries are disabled
// but the app continues to function (same pattern as middleware.ts and auth.ts)
let redis: Redis | null = null;
try {
  if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
    redis = Redis.fromEnv();
  }
} catch {
  logger.warn("[webhook-retry] Redis unavailable — webhook retry queue disabled");
}

const RETRY_KEY = "webhook:retry:queue";
const MAX_RETRIES = 3;

export interface QueuedWebhook {
  eventId: string;
  eventType: string;
  payload: string; // JSON-stringified event payload
  retries: number;
  createdAt: string;
  lastRetryAt?: string;
}

/**
 * Queue a failed webhook for retry.
 * Events are stored in Redis and can be processed later by a background job.
 */
export async function queueWebhookRetry(
  eventId: string,
  eventType: string,
  payload: string
): Promise<void> {
  if (!redis) {
    logger.warn(`[webhook-retry] Redis unavailable — webhook ${eventId} (${eventType}) not queued`);
    return;
  }
  try {
    const queuedEvent: QueuedWebhook = {
      eventId,
      eventType,
      payload,
      retries: 0,
      createdAt: new Date().toISOString(),
    };

    // Add to Redis queue (left push = FIFO queue)
    await redis.lpush(RETRY_KEY, JSON.stringify(queuedEvent));

    logger.warn(`Webhook ${eventId} (${eventType}) queued for retry`, {
      eventId,
      eventType,
    });
  } catch (error) {
    logger.error(`Failed to queue webhook retry for ${eventId}:`, error);
    // Don't throw — we've already failed to deliver; queuing failure shouldn't break the response
  }
}

/**
 * Retrieve a batch of queued webhooks for processing.
 * Returns up to `limit` events from the queue.
 */
export async function dequeueWebhooks(limit: number = 10): Promise<QueuedWebhook[]> {
  if (!redis) return [];
  try {
    const items = await redis.lrange(RETRY_KEY, 0, limit - 1);

    if (!items || items.length === 0) {
      return [];
    }

    // Parse and return
    return items
      .map((item) => {
        try {
          return JSON.parse(item as string) as QueuedWebhook;
        } catch {
          logger.error(`Failed to parse queued webhook: ${item}`);
          return null;
        }
      })
      .filter((item): item is QueuedWebhook => item !== null);
  } catch (error) {
    logger.error("Failed to retrieve queued webhooks:", error);
    return [];
  }
}

/**
 * Mark a webhook as successfully processed and remove from queue.
 */
export async function removeWebhookFromQueue(eventId: string): Promise<void> {
  if (!redis) return;
  try {
    // This is a simple implementation — fetches all, filters, and re-queues
    // For production at scale, consider using Lua scripts for atomicity
    const items = await redis.lrange(RETRY_KEY, 0, -1);

    if (!items) {
      return;
    }

    // Remove the queue and rebuild without this event
    await redis.del(RETRY_KEY);

    const remaining = items
      .map((item) => {
        try {
          return JSON.parse(item as string) as QueuedWebhook;
        } catch {
          return null;
        }
      })
      .filter((item): item is QueuedWebhook => item !== null && item.eventId !== eventId);

    // Re-push remaining items
    if (remaining.length > 0) {
      for (const event of remaining) {
        await redis.lpush(RETRY_KEY, JSON.stringify(event));
      }
    }

    logger.info(`Webhook ${eventId} removed from retry queue`);
  } catch (error) {
    logger.error(`Failed to remove webhook ${eventId} from queue:`, error);
  }
}

/**
 * Increment retry count for a webhook and re-queue if under MAX_RETRIES.
 */
export async function incrementRetryCount(webhook: QueuedWebhook): Promise<boolean> {
  if (!redis) return false;
  try {
    const newRetries = webhook.retries + 1;

    if (newRetries > MAX_RETRIES) {
      // Max retries exceeded, discard this event
      await removeWebhookFromQueue(webhook.eventId);
      logger.error(`Webhook ${webhook.eventId} exceeded max retries (${MAX_RETRIES}), discarding`, {
        eventId: webhook.eventId,
        retries: newRetries,
      });
      return false;
    }

    // Update retry count and last retry time
    const updated: QueuedWebhook = {
      ...webhook,
      retries: newRetries,
      lastRetryAt: new Date().toISOString(),
    };

    // For simplicity, remove old and re-add
    // In production, use Lua script or more efficient queue implementation
    await removeWebhookFromQueue(webhook.eventId);
    await redis.lpush(RETRY_KEY, JSON.stringify(updated));

    logger.debug(`Webhook ${webhook.eventId} retry count incremented to ${newRetries}`, {
      eventId: webhook.eventId,
      retries: newRetries,
    });

    return true;
  } catch (error) {
    logger.error(`Failed to increment retry count for ${webhook.eventId}:`, error);
    return false;
  }
}

/**
 * Get queue statistics.
 */
export async function getQueueStats(): Promise<{ size: number; oldestEventAge: string | null }> {
  if (!redis) return { size: 0, oldestEventAge: null };
  try {
    const size = await redis.llen(RETRY_KEY);
    const items = await redis.lrange(RETRY_KEY, -1, -1); // Get last item (oldest in FIFO)

    if (!items || items.length === 0) {
      return { size, oldestEventAge: null };
    }

    const oldest = JSON.parse(items[0] as string) as QueuedWebhook;
    const ageMs = Date.now() - new Date(oldest.createdAt).getTime();
    const ageMinutes = Math.round(ageMs / 60000);

    return { size, oldestEventAge: `${ageMinutes} minutes` };
  } catch (error) {
    logger.error("Failed to get queue stats:", error);
    return { size: 0, oldestEventAge: null };
  }
}
