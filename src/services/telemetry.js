// Monitoring PostHog (crashs + utilisateurs actifs + usage) — uniquement dans
// le process principal (Node), pas de SDK côté renderer : le renderer envoie
// ses événements ici via IPC (voir main.js), même schéma que syncMatches.
import { PostHog } from 'posthog-node';
import { POSTHOG_API_KEY, POSTHOG_HOST } from '../posthogConfig.js';

const client = new PostHog(POSTHOG_API_KEY, { host: POSTHOG_HOST });

export function captureEvent(distinctId, event, properties = {}) {
  client.capture({ distinctId: distinctId || 'unknown', event, properties });
}

export function captureException(distinctId, error, context = {}) {
  client.captureException(error, distinctId || 'unknown', context);
}

export function shutdown() {
  return client.shutdown();
}
