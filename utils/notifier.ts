export type NotifyResult = { ok: boolean; status?: number; body?: string; error?: string };

export function createNotifier(urls: string | string[]) {
  const list = typeof urls === 'string' ? urls.split(',').map((s) => s.trim()).filter(Boolean) : (urls || []);

  async function sendJson(url: string, obj: any, timeout = 5000): Promise<NotifyResult> {
    try {
      const controller = new AbortController();
      const id = setTimeout(() => controller.abort(), timeout);
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(obj),
        signal: controller.signal,
      });
      clearTimeout(id);
      const text = await res.text().catch(() => '');
      return res.ok ? { ok: true, status: res.status, body: text } : { ok: false, status: res.status, body: text };
    }
    catch (err: any) {
      return { ok: false, error: String(err && (err.stack || err.message || err)) };
    }
  }

  async function sendForm(url: string, obj: Record<string, string>, timeout = 5000): Promise<NotifyResult> {
    try {
      const controller = new AbortController();
      const id = setTimeout(() => controller.abort(), timeout);
      const form = new URLSearchParams();
      for (const k of Object.keys(obj)) form.set(k, obj[k]);
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: form.toString(),
        signal: controller.signal,
      });
      clearTimeout(id);
      const text = await res.text().catch(() => '');
      return res.ok ? { ok: true, status: res.status, body: text } : { ok: false, status: res.status, body: text };
    }
    catch (err: any) {
      return { ok: false, error: String(err && (err.stack || err.message || err)) };
    }
  }

  async function sendText(url: string, textBody: string, timeout = 5000): Promise<NotifyResult> {
    try {
      const controller = new AbortController();
      const id = setTimeout(() => controller.abort(), timeout);
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain' },
        body: textBody,
        signal: controller.signal,
      });
      clearTimeout(id);
      const text = await res.text().catch(() => '');
      return res.ok ? { ok: true, status: res.status, body: text } : { ok: false, status: res.status, body: text };
    }
    catch (err: any) {
      return { ok: false, error: String(err && (err.stack || err.message || err)) };
    }
  }

  return {
    async send(payload: { title?: string; body?: string }) {
      const results: NotifyResult[] = [];
      for (const url of list) {
        // validate URL
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

        const title = payload.title ?? '';
        const body = payload.body ?? '';

        // First try form-encoded (many push endpoints expect title + content/message)
        const formCandidates = [
          { title, content: body },
          { title, message: body },
          { title, text: body },
        ];

        let accepted = false;
        for (const cand of formCandidates) {
          const res = await sendForm(url, Object.fromEntries(Object.entries(cand).map(([k, v]) => [k, String(v ?? '')])), 5000);
          console.info('[notify-debug] form candidate sent', { url, candidate: cand, status: res.status, bodyPreview: res.body?.slice?.(0,200) });
          if (res.ok) {
            results.push(res);
            accepted = true;
            break;
          }
          // If server returned 200 but error in body, still capture and may try other formats
          if (res.status && res.status >= 400 && typeof res.body === 'string' && /invalid title|invalid/i.test(res.body)) {
            // if invalid title, form with title might be required differently; continue trying other candidates
          }
        }

        if (accepted) continue;

        // Next try common JSON shapes
        const jsonCandidates = [
          { title, body },
          { title, content: body },
          { message: body },
          { text: body },
          { notification: { title, body } },
          [{ title, body }],
        ];

        for (const cand of jsonCandidates) {
          const res = await sendJson(url, cand, 5000);
          console.info('[notify-debug] json candidate sent', { url, candidate: cand, status: res.status, bodyPreview: res.body?.slice?.(0,200) });
          if (res.ok) {
            results.push(res);
            accepted = true;
            break;
          }
          // If server explicitly indicated invalid JSON, don't retry other JSON shapes
          if (res.status === 400 && typeof res.body === 'string' && /invalid json/i.test(res.body)) {
            break;
          }
        }

        if (accepted) continue;

        // Finally try plain text (some endpoints accept raw text but may require title separately)
        const resText = await sendText(url, body || title, 5000);
        console.info('[notify-debug] text candidate sent', { url, status: resText.status, bodyPreview: resText.body?.slice?.(0,200) });
        results.push(resText);
      }

      return results;
    },
  } as const;
}
