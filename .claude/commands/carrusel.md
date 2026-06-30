---
description: Genera un carrusel de Instagram (portada + contenido + CTA) sobre el tema indicado, para la marca de Camilo Mondragón / Principia (cripto e inversión digital).
---

Genera un carrusel de Instagram sobre: $ARGUMENTS

Sigue exactamente el flujo descrito en el skill `ig-carousel`
(`.claude/skills/ig-carousel/SKILL.md`):

1. Si el tema son "noticias de hoy/de la semana" sin más detalle, busca primero
   la noticia de criptomonedas más relevante del día (o de la semana si no hay
   nada notable hoy) antes de escribir el copy.
2. Escribe el copy de cada slide en español (portada con gancho, 3-5 slides de
   contenido, CTA final), siguiendo las reglas de coherencia narrativa del
   skill.
3. Arma el `slides.json` en `input/` con la paleta negro/dorado de la marca.
4. Si no tienes `KIE_AI_API_KEY` disponible en el entorno, pídesela al usuario
   antes de seguir; nunca la guardes en archivos ni la commitees.
5. Ejecuta `scripts/generate-carousel.mjs` con un timeout generoso (varios
   minutos) y reporta al final dónde quedaron las imágenes generadas.
