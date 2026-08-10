export type NotifyResult = { ok: boolean; status?: number; body?: string; error?: string };

export function createNotifier(urls: string | string[]) {
  const list = typeof urls === 'string' ? urls.split(',').map((s) => s.trim()).filter(Boolean) : (urls || []);

  async function sendOnce(url: string, payload: any, timeout = 5000): Promise<NotifyResult> {
    try {
      const controller = new AbortController();
      const id = setTimeout(() => controller.abort(), timeout);
      const res = await fetch(url, {
        method: payload ? 'POST' : 'GET',
        headers: payload ? { 'Content-Type': 'application/json' } : undefined,
        body: payload ? JSON.stringify(payload) : undefined,
        signal: controller.signal,
      });
      clearTimeout(id);
      const text = await res.text().catch(() => '');
      if (!res.ok) return { ok: false, status: res.status, body: text };
      return { ok: true, status: res.status, body: text };
    }
    catch (err: any) {
      return { ok: false, error: String(err && (err.stack || err.message || err)) };
    }
  }

  return {
    async send(payload: { title?: string; body?: string }) {
      const results: NotifyResult[] = [];
      for (const url of list) {
        try {
          const u = new URL(url);
          if (!['http:', 'https:'].includes(u.protocol)) {
            results.push({ ok: false, error: `Unsupported notification protocol: ${u.protocol}` });
            continue;
          }
        }
        catch (err: any) {
          results.push({ ok: false, error: `Invalid notification URL: ${url}` });
          continue;
        }

        // retry strategy: 2 attempts for transient errors
        let res = await sendOnce(url, { title: payload.title, body: payload.body }, 5000);
        if (!res.ok && (res.status === undefined || res.status >= 500)) {
          // retry once
          await new Promise((r) => setTimeout(r, 1000));
          res = await sendOnce(url, { title: payload.title, body: payload.body }, 5000);
        }

        if (!res.ok) {
          console.error('[notify] failed to send to', url, res);
        } else {
          console.info('[notify] sent to', url, 'status', res.status);
        }

        results.push(res);
      }

      return results;
    },
  } as const;
}
