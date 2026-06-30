---
name: ig-carousel
description: Genera carruseles de Instagram (portada + slides de contenido + CTA) usando Nano Banana Pro vía la API de Kie AI, para la marca personal de Camilo Mondragón (Principia) sobre criptomonedas e inversión digital. Úsalo cuando el usuario pida crear un carrusel a partir de un tema, una noticia, un guion o un video (ej. "crea un carrusel sobre las noticias de hoy", "hazme un carrusel sobre este guion"). Mantiene un estilo visual coherente entre slides: ilustración animada, paleta negro y dorado, estética fintech/cripto de autoridad.
---

# Skill: Generador de Carruseles de Instagram (Nano Banana Pro / Kie AI)

Este skill convierte un tema, guion, noticia o video en un carrusel de Instagram
completo (imágenes PNG listas para subir), generado con el modelo `nano-banana-pro`
de Kie AI. Tú (Claude) escribes el copy y los prompts; el script
`scripts/generate-carousel.mjs` se encarga de llamar a la API, esperar la
generación (con polling y reintentos) y descargar las imágenes.

## Flujo paso a paso

### 1. Entender el pedido
El usuario te dará un tema, un guion, una noticia o un video como base. Si el
contenido es ambiguo o demasiado escueto para sacar 5-7 ideas, pide una breve
aclaración antes de continuar. Si ya tienes suficiente información, sigue sin
preguntar más.

### 2. Conseguir la API key de Kie AI
La API key NUNCA se guarda en el repo ni en archivos de configuración. Si no
está disponible como variable de entorno `KIE_AI_API_KEY` en la sesión actual,
pídesela al usuario antes de ejecutar el script. Úsala solo como variable de
entorno en el comando puntual que ejecutes (ver paso 5); nunca la escribas en
slides.json, en logs, ni la imprimas en pantalla.

### 3. Definir la estructura del carrusel
Decide el número de slides (5, 6 o 7) según qué tan rico sea el contenido
fuente:
- **5 slides**: 1 portada + 3 de contenido + 1 CTA (tema simple/corto).
- **6 slides**: 1 portada + 4 de contenido + 1 CTA (caso por defecto).
- **7 slides**: 1 portada + 5 de contenido + 1 CTA (tema con varios puntos).

Reglas de coherencia narrativa:
- **Slide 1 (`cover`)**: el gancho. Titular corto y potente que detenga el
  scroll (pregunta, dato impactante, promesa de valor). No reveles todo el
  contenido aquí.
- **Slides intermedias (`content`)**: una idea por slide, en orden lógico
  (cronológico, de menor a mayor importancia, o paso a paso). Cada una con un
  `headline` corto (3-8 palabras) y un `body` opcional de apoyo (una frase).
- **Última slide (`cta`)**: cierre con llamado a la acción claro y relacionado
  al canal de IA (seguir, comentar, guardar, compartir).

Escribe el copy en español, tono claro y directo, sin errores ortográficos.
No repitas literalmente el texto de marca/estilo: eso ya lo agrega el script
automáticamente (ver `scripts/lib/styleGuide.mjs`) para mantener consistencia
visual (animado, negro y dorado, estética fintech/cripto) en TODAS las slides
sin que tengas que repetirlo tú.

### 4. Armar el archivo de entrada `slides.json`
Crea un archivo temporal (por ejemplo en `input/<slug>.json`) con esta forma:

```json
{
  "slug": "noticias-ia-30-junio",
  "aspectRatio": "4:5",
  "resolution": "1K",
  "outputFormat": "png",
  "useReferenceConsistency": true,
  "slides": [
    { "role": "cover", "headline": "¿La IA ya piensa por ti?", "body": "" },
    { "role": "content", "headline": "Punto 1", "body": "Detalle breve" },
    { "role": "content", "headline": "Punto 2", "body": "Detalle breve" },
    { "role": "content", "headline": "Punto 3", "body": "Detalle breve" },
    { "role": "content", "headline": "Punto 4", "body": "Detalle breve" },
    { "role": "cta", "headline": "Síguenos para más de IA", "body": "" }
  ]
}
```

Notas:
- `slug` se usa para nombrar la carpeta de salida (`output/<slug>/`).
- `aspectRatio` por defecto `4:5` (formato feed de Instagram). Usa `9:16` si
  el usuario pide formato historia/reel.
- `resolution` por defecto `1K` (más rápido); usa `2K` solo si el usuario pide
  más calidad y acepta que tome más tiempo.
- `useReferenceConsistency: true` hace que cada slide use la imagen anterior
  como referencia visual (`image_input`) para mantener el mismo
  personaje/mascota y estilo de una slide a otra. Déjalo en `true` salvo que
  el usuario pida explícitamente lo contrario.

### 5. Ejecutar el script
Corre el script pasando la API key SOLO como variable de entorno del comando
(no la dejes en el shell de forma persistente, no la commitees):

```bash
KIE_AI_API_KEY="la_key_que_te_dio_el_usuario" node scripts/generate-carousel.mjs --input input/<slug>.json --out output/<slug>
```

Importante sobre tiempos:
- Cada slide puede tardar entre 30 segundos y varios minutos en generarse. El
  script ya hace polling interno (cada 6s) con un timeout de 8 minutos por
  slide y 2 reintentos automáticos si falla.
- Para un carrusel de 6-7 slides, el proceso completo puede tardar bastante
  (varios minutos). Ejecuta el comando con un timeout generoso (ej. 20-30
  minutos) para no cortar el proceso antes de que termine. NO mates el
  proceso solo porque tarda; el script informa el progreso de cada slide en
  stdout.
- Si una slide falla tras los reintentos, el script sigue con las demás y
  deja el detalle del error en `output/<slug>/manifest.json`. Revisa ese
  archivo al final y, si hace falta, vuelve a correr solo esa slide.

### 6. Reportar el resultado
Al terminar, dile al usuario:
- Dónde quedaron las imágenes (`output/<slug>/01_cover.png`,
  `02_content.png`, ..., `0N_cta.png`).
- Si todas las slides se generaron bien o si alguna falló (y por qué, según
  `manifest.json`).
- Nunca repitas ni muestres la API key en tu respuesta.

## Archivos relevantes
- `scripts/generate-carousel.mjs`: orquesta la llamada a la API, el polling y
  la descarga de imágenes.
- `scripts/lib/kieClient.mjs`: cliente HTTP de Kie AI (`createTask`,
  `queryTask`/`pollTask`, `downloadImage`), con timeouts y reintentos.
- `scripts/lib/styleGuide.mjs`: define el estilo de marca fijo (animado, rojo
  y blanco, canal de IA) y arma el prompt detallado final para cada slide.
