#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { createTask, pollTask, downloadImage } from "./lib/kieClient.mjs";
import { buildPrompt } from "./lib/styleGuide.mjs";

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith("--")) {
      const key = a.slice(2);
      const next = argv[i + 1];
      const hasValue = next !== undefined && !next.startsWith("--");
      args[key] = hasValue ? next : true;
      if (hasValue) i++;
    }
  }
  return args;
}

async function generateSlide({ apiKey, slide, slideNumber, total, aspectRatio, resolution, outputFormat, referenceImageUrl, useReference }) {
  const prompt = buildPrompt({
    role: slide.role,
    headline: slide.headline,
    body: slide.body,
    slideNumber,
    totalSlides: total,
  });

  const payload = {
    model: "nano-banana-pro",
    input: {
      prompt,
      aspect_ratio: aspectRatio,
      resolution,
      output_format: outputFormat,
    },
  };
  if (useReference && referenceImageUrl) {
    payload.input.image_input = [referenceImageUrl];
  }

  const maxRetries = 2;
  let lastError;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const taskId = await createTask(apiKey, payload);
      const record = await pollTask(apiKey, taskId, {
        intervalMs: 6000,
        maxWaitMs: 8 * 60 * 1000,
        onTick: (state, n) => console.log(`   ... estado: ${state} (chequeo ${n})`),
      });
      if (record.state === "success") {
        return { record, prompt };
      }
      lastError = record.failMsg || "fallo desconocido";
    } catch (err) {
      lastError = err.message;
    }
    console.warn(`   Intento ${attempt}/${maxRetries} falló: ${lastError}`);
  }
  throw new Error(lastError || "fallo desconocido");
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const apiKey = process.env.KIE_AI_API_KEY;

  if (!apiKey) {
    console.error("Error: falta la variable de entorno KIE_AI_API_KEY.");
    process.exit(1);
  }
  if (!args.input) {
    console.error("Error: falta --input <ruta a slides.json>");
    process.exit(1);
  }

  const spec = JSON.parse(fs.readFileSync(args.input, "utf-8"));
  if (!Array.isArray(spec.slides) || spec.slides.length === 0) {
    console.error("Error: el archivo de entrada no tiene un array 'slides' válido.");
    process.exit(1);
  }

  const outDir = args.out || path.join("output", spec.slug || "carrusel");
  fs.mkdirSync(outDir, { recursive: true });

  const aspectRatio = spec.aspectRatio || "4:5";
  const resolution = spec.resolution || "1K";
  const outputFormat = spec.outputFormat || "png";
  const useReference = spec.useReferenceConsistency !== false;

  const manifest = { slug: spec.slug || null, createdAt: new Date().toISOString(), slides: [] };
  let referenceImageUrl = null;
  const total = spec.slides.length;

  for (let i = 0; i < total; i++) {
    const slide = spec.slides[i];
    const slideNumber = i + 1;
    const fileBase = `${String(slideNumber).padStart(2, "0")}_${slide.role}`;
    console.log(`\n[${slideNumber}/${total}] Generando slide "${slide.role}"...`);

    try {
      const { record, prompt } = await generateSlide({
        apiKey,
        slide,
        slideNumber,
        total,
        aspectRatio,
        resolution,
        outputFormat,
        referenceImageUrl,
        useReference,
      });

      const resultJson = JSON.parse(record.resultJson);
      const imageUrl = resultJson.resultUrls[0];
      const destPath = path.join(outDir, `${fileBase}.${outputFormat}`);
      await downloadImage(imageUrl, destPath);
      referenceImageUrl = imageUrl;

      manifest.slides.push({
        slideNumber,
        role: slide.role,
        status: "success",
        file: path.basename(destPath),
        taskId: record.taskId,
        prompt,
      });
      console.log(`   OK guardado en ${destPath}`);
    } catch (err) {
      manifest.slides.push({ slideNumber, role: slide.role, status: "failed", error: err.message });
      console.error(`   FALLO slide ${slideNumber} (${slide.role}): ${err.message}`);
    }
  }

  fs.writeFileSync(path.join(outDir, "manifest.json"), JSON.stringify(manifest, null, 2));
  const failed = manifest.slides.filter((s) => s.status === "failed").length;
  console.log(`\nListo: ${manifest.slides.length - failed}/${manifest.slides.length} slides generadas en ${outDir}`);

  if (failed > 0) {
    console.error(`${failed} slide(s) fallaron. Revisa manifest.json para más detalle.`);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("Error fatal:", err.message);
  process.exit(1);
});
