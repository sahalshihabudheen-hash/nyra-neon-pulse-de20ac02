import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

function getSupabaseClient() {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  return createClient(supabaseUrl, supabaseServiceKey);
}

export function getYouTubeApiKeysFromEnv(): string[] {
  const env = Deno.env.toObject();

  const keys = Object.entries(env)
    .filter(([name, value]) => /^YOUTUBE_API_KEY(?:_\d+)?$/.test(name) && !!value)
    .sort(([a], [b]) => {
      if (a === "YOUTUBE_API_KEY") return -1;
      if (b === "YOUTUBE_API_KEY") return 1;

      const aMatch = a.match(/_(\d+)$/);
      const bMatch = b.match(/_(\d+)$/);
      const aNum = aMatch ? Number(aMatch[1]) : Number.MAX_SAFE_INTEGER;
      const bNum = bMatch ? Number(bMatch[1]) : Number.MAX_SAFE_INTEGER;
      return aNum - bNum;
    })
    .map(([, value]) => value as string);

  return [...new Set(keys)];
}

/**
 * Get enabled YouTube API keys (filters out disabled keys from app_settings).
 * This is the function search/trending/featured should use.
 */
export async function getEnabledYouTubeApiKeys(): Promise<string[]> {
  const allKeys = await getAllYouTubeApiKeys();

  // Fetch disabled keys list
  let disabledLabels: string[] = [];
  try {
    const supabase = getSupabaseClient();
    const { data } = await supabase
      .from("app_settings")
      .select("value")
      .eq("key", "disabled_youtube_keys")
      .single();
    if (data?.value && Array.isArray(data.value)) {
      disabledLabels = data.value as string[];
    }
  } catch {
    // If we can't read disabled list, use all keys
  }

  return allKeys
    .filter((k) => !disabledLabels.includes(k.label))
    .map((k) => k.value);
}

// Keep backward compat alias — now returns enabled keys only
export const getYouTubeApiKeys = getEnabledYouTubeApiKeys;

export interface NamedKey {
  label: string;
  value: string;
}

/**
 * Get all YouTube API keys: env vars + extra keys stored in app_settings.
 * Returns labelled keys for the admin panel.
 */
export async function getAllYouTubeApiKeys(): Promise<NamedKey[]> {
  const env = Deno.env.toObject();

  // Env-based keys with labels
  const envKeys: NamedKey[] = Object.entries(env)
    .filter(([name, value]) => /^YOUTUBE_API_KEY(?:_\d+)?$/.test(name) && !!value)
    .sort(([a], [b]) => {
      if (a === "YOUTUBE_API_KEY") return -1;
      if (b === "YOUTUBE_API_KEY") return 1;
      const aNum = Number(a.match(/_(\d+)$/)?.[1] ?? Infinity);
      const bNum = Number(b.match(/_(\d+)$/)?.[1] ?? Infinity);
      return aNum - bNum;
    })
    .map(([name, value]) => ({ label: name, value }));

  // Extra keys from app_settings
  try {
    const supabase = getSupabaseClient();

    const { data } = await supabase
      .from("app_settings")
      .select("value")
      .eq("key", "extra_youtube_keys")
      .single();

    if (data?.value && Array.isArray(data.value)) {
      for (const extra of data.value as { label: string; value: string }[]) {
        if (extra.label && extra.value) {
          envKeys.push({ label: extra.label, value: extra.value });
        }
      }
    }
  } catch {
    // Ignore — extra keys not available
  }

  // Dedupe by value
  const seen = new Set<string>();
  return envKeys.filter((k) => {
    if (seen.has(k.value)) return false;
    seen.add(k.value);
    return true;
  });
}

/**
 * Get backup YouTube API keys from app_settings.
 * These are only used when ALL primary keys are exhausted.
 */
export async function getBackupYouTubeApiKeys(): Promise<NamedKey[]> {
  try {
    const supabase = getSupabaseClient();
    const { data } = await supabase
      .from("app_settings")
      .select("value")
      .eq("key", "backup_youtube_keys")
      .single();

    if (data?.value && Array.isArray(data.value)) {
      return (data.value as { label: string; value: string }[]).filter(
        (k) => k.label && k.value
      );
    }
  } catch {
    // Ignore
  }
  return [];
}

export async function fetchYouTubeWithFailover(
  keys: string[],
  buildUrl: (apiKey: string) => string,
): Promise<{ ok: true; data: any } | { ok: false; error: string; status: number }> {
  if (keys.length === 0) {
    return { ok: false, error: "YouTube API key not configured", status: 500 };
  }

  // Always start from the first key (top of list), only move to next on failure.
  let lastError = "All API keys exhausted";
  let lastStatus = 403;

  for (const [index, apiKey] of keys.entries()) {
    try {
      const response = await fetch(buildUrl(apiKey));
      const data = await response.json().catch(() => ({}));

      if (response.ok && !data.error) {
        return { ok: true, data };
      }

      const reason = data?.error?.errors?.[0]?.reason || "";
      const message = data?.error?.message || `YouTube API error (${response.status})`;

      lastError = message;
      lastStatus = response.status || 500;

      const shouldTryNextKey =
        response.status === 401 ||
        response.status === 403 ||
        response.status === 429 ||
        /quota|limit|rate|key/i.test(reason) ||
        /quota|limit|rate|key/i.test(message);

      console.warn(`YouTube key attempt ${index + 1}/${rotatedKeys.length} failed: ${message}`);

      if (!shouldTryNextKey) {
        return { ok: false, error: message, status: lastStatus };
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Network error";
      lastError = message;
      lastStatus = 500;
      console.warn(`YouTube key attempt ${index + 1}/${rotatedKeys.length} failed: ${message}`);
    }
  }

  return { ok: false, error: lastError, status: lastStatus };
}

/**
 * Fetch YouTube with full failover: tries primary keys first,
 * then automatically falls back to backup keys if all primary keys fail.
 */
export async function fetchYouTubeWithBackupFailover(
  primaryKeys: string[],
  buildUrl: (apiKey: string) => string,
): Promise<{ ok: true; data: any; usedBackup?: boolean } | { ok: false; error: string; status: number }> {
  // Try primary keys first
  const primaryResult = await fetchYouTubeWithFailover(primaryKeys, buildUrl);
  if (primaryResult.ok) {
    return { ...primaryResult, usedBackup: false };
  }

  // All primary keys failed — try backup keys
  const backupKeys = await getBackupYouTubeApiKeys();
  if (backupKeys.length === 0) {
    return primaryResult; // No backups, return original error
  }

  console.warn(`All ${primaryKeys.length} primary keys exhausted, trying ${backupKeys.length} backup key(s)...`);
  const backupResult = await fetchYouTubeWithFailover(
    backupKeys.map((k) => k.value),
    buildUrl,
  );

  if (backupResult.ok) {
    return { ...backupResult, usedBackup: true };
  }

  return backupResult;
}
