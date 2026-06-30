#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { generateImage, saveImage, extensionForMimeType } from "./lib/geminiClient.mjs";
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

async function generateSlide({ apiKey, slide, slideNumber, total, aspectRatio, referenceImage, useReference }) {
  const prompt = buildPrompt({
    role: slide.role,
    headline: slide.headline,
    body: slide.body,
    slideNumber,
    totalSlides: total,
    aspectRatio,
  });

  const maxRetries = 2;
  let lastError;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const image = await generateImage(apiKey, {
        prompt,
        referenceImage: useReference ? referenceImage : null,
      });
      return { image, prompt };
    } catch (err) {
      lastError = err.message;
    }
    console.warn(`   Intento ${attempt}/${maxRetries} falló: ${lastError}`);
  }
  throw new Error(lastError || "fallo desconocido");
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    console.error("Error: falta la variable de entorno GEMINI_API_KEY.");
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
  const useReference = spec.useReferenceConsistency !== false;

  const manifest = { slug: spec.slug || null, createdAt: new Date().toISOString(), slides: [] };
  let referenceImage = null;
  const total = spec.slides.length;

  for (let i = 0; i < total; i++) {
    const slide = spec.slides[i];
    const slideNumber = i + 1;
    const fileBase = `${String(slideNumber).padStart(2, "0")}_${slide.role}`;
    console.log(`\n[${slideNumber}/${total}] Generando slide "${slide.role}"...`);

    try {
      const { image, prompt } = await generateSlide({
        apiKey,
        slide,
        slideNumber,
        total,
        aspectRatio,
        referenceImage,
        useReference,
      });

      const ext = extensionForMimeType(image.mimeType);
      const destPath = path.join(outDir, `${fileBase}.${ext}`);
      await saveImage(image.base64, destPath);
      referenceImage = { base64: image.base64, mimeType: image.mimeType };

      manifest.slides.push({
        slideNumber,
        role: slide.role,
        status: "success",
        file: path.basename(destPath),
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
