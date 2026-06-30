import fs from "node:fs";

const BASE_URL = "https://api.kie.ai/api/v1";

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

export async function createTask(apiKey, payload) {
  const res = await fetchWithTimeout(
    `${BASE_URL}/jobs/createTask`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(payload),
    },
    30000
  );
  const data = await res.json();
  if (data.code !== 200) {
    throw new Error(`createTask failed: ${data.message || JSON.stringify(data)}`);
  }
  return data.data.taskId;
}

export async function queryTask(apiKey, taskId) {
  const res = await fetchWithTimeout(
    `${BASE_URL}/jobs/recordInfo?taskId=${encodeURIComponent(taskId)}`,
    { headers: { Authorization: `Bearer ${apiKey}` } },
    30000
  );
  const data = await res.json();
  if (data.code !== 200) {
    throw new Error(`queryTask failed: ${data.message || JSON.stringify(data)}`);
  }
  return data.data;
}

const TERMINAL_STATES = new Set(["success", "fail"]);

/**
 * Polls a task until it reaches a terminal state (success/fail), with
 * fixed-interval polling and a hard wall-clock timeout so a stuck job
 * cannot hang the whole carousel generation run.
 */
export async function pollTask(apiKey, taskId, options = {}) {
  const { intervalMs = 6000, maxWaitMs = 8 * 60 * 1000, onTick } = options;
  const start = Date.now();
  let attempt = 0;

  while (true) {
    attempt += 1;
    let record;
    try {
      record = await queryTask(apiKey, taskId);
    } catch (err) {
      if (Date.now() - start > maxWaitMs) throw err;
      await sleep(intervalMs);
      continue;
    }

    if (onTick) onTick(record.state, attempt);

    if (TERMINAL_STATES.has(record.state)) {
      return record;
    }

    if (Date.now() - start > maxWaitMs) {
      throw new Error(
        `Timeout esperando la tarea ${taskId} tras ${maxWaitMs}ms (último estado: ${record.state})`
      );
    }

    await sleep(intervalMs);
  }
}

export async function downloadImage(url, destPath) {
  const res = await fetchWithTimeout(url, {}, 60000);
  if (!res.ok) {
    throw new Error(`No se pudo descargar la imagen: ${res.status} ${res.statusText}`);
  }
  const buf = Buffer.from(await res.arrayBuffer());
  await fs.promises.writeFile(destPath, buf);
}
