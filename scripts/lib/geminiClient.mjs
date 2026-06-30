import fs from "node:fs";

const BASE_URL = "https://generativelanguage.googleapis.com/v1beta";
const DEFAULT_MODEL = "gemini-2.5-flash-image";

async function fetchWithTimeout(url, options, timeoutMs) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function backoffMs(attempt) {
  return Math.min(30000, 2000 * 2 ** (attempt - 1));
}

/**
 * Calls Gemini's image generation endpoint (the model nicknamed "Nano
 * Banana") and returns the raw image bytes. Gemini answers synchronously in
 * the same HTTP response (no task polling like Kie AI needed), but a single
 * generation can still take up to ~1-2 minutes, so the request timeout is
 * generous and transient errors (429/5xx) are retried with backoff.
 */
export async function generateImage(apiKey, { prompt, referenceImage, model = DEFAULT_MODEL }) {
  const parts = [{ text: prompt }];
  if (referenceImage) {
    parts.push({
      inlineData: { mimeType: referenceImage.mimeType, data: referenceImage.base64 },
    });
  }

  const body = {
    contents: [{ parts }],
    generationConfig: { responseModalities: ["IMAGE"] },
  };

  const maxAttempts = 4;
  let lastError;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    let res;
    try {
      res = await fetchWithTimeout(
        `${BASE_URL}/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        },
        120000
      );
    } catch (err) {
      lastError = err;
      if (attempt < maxAttempts) await sleep(backoffMs(attempt));
      continue;
    }

    if (res.status === 429 || res.status >= 500) {
      lastError = new Error(`Gemini respondió ${res.status}: ${await res.text()}`);
      if (attempt < maxAttempts) await sleep(backoffMs(attempt));
      continue;
    }

    const data = await res.json();
    if (!res.ok) {
      throw new Error(`Gemini error ${res.status}: ${data.error?.message || JSON.stringify(data)}`);
    }

    const imagePart = data.candidates?.[0]?.content?.parts?.find((p) => p.inlineData);
    if (!imagePart) {
      const textPart = data.candidates?.[0]?.content?.parts?.find((p) => p.text);
      throw new Error(
        `Gemini no devolvió ninguna imagen.${textPart ? ` Respuesta: ${textPart.text}` : ` Respuesta cruda: ${JSON.stringify(data)}`}`
      );
    }

    return {
      base64: imagePart.inlineData.data,
      mimeType: imagePart.inlineData.mimeType || "image/png",
    };
  }

  throw lastError;
}

export async function saveImage(base64, destPath) {
  const buf = Buffer.from(base64, "base64");
  await fs.promises.writeFile(destPath, buf);
}

export function extensionForMimeType(mimeType) {
  if (mimeType.includes("jpeg")) return "jpg";
  if (mimeType.includes("webp")) return "webp";
  return "png";
}
