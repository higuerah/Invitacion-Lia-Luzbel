# Invitación interactiva de Lía Luzbel

Página estática preparada para GitHub Pages. La ilustración original se conserva y tiene destellos, agua en movimiento y un parpadeo discreto. Respeta la preferencia `prefers-reduced-motion`.

## Probar el diseño

Abre `index.html?demo=1` desde un servidor local (por ejemplo `python3 -m http.server 8000` y `http://localhost:8000/?demo=1`). El modo demo usa almacenamiento local **únicamente en ese navegador**. No sirve para recibir confirmaciones reales. Los enlaces públicos de invitados llevan `?i=UUID`.

## Activar confirmaciones reales

1. Crea un proyecto en Supabase y ejecuta `database.sql` desde su SQL Editor. Cambia `capacity` (60 es solo un valor de ejemplo) y la fecha límite antes de invitar a nadie. La imagen indica sábado **3 de octubre de 2026, 3:00 p. m.**; el cierre de RSVP del **30 de septiembre** proviene de la propuesta inicial y puede cambiarse.
2. En `config.js` coloca la URL del proyecto y su clave pública **anon**. Nunca coloques la clave `service_role` en el repositorio o la web.
3. En la tabla `guests` añade una fila por familia/persona con `label` y `max_seats`. Deja `id` y `token` con sus valores predeterminados. Copia el `token` de cada fila a un enlace `https://higuerah.github.io/NOMBRE-DEL-REPO/?i=TOKEN` y envía **solo a esa familia** su enlace.
4. En Supabase consulta las tablas `rsvps` y `guests` para controlar asistentes, adultos, niños, pendientes y cupo. La consulta de total está al final del archivo SQL. El enlace personal puede reutilizarse para corregir una respuesta hasta la fecha límite. El token es secreto: quien tenga el enlace puede ver y cambiar **esa** respuesta.
5. Publica estos archivos en un repositorio dedicado de GitHub. En **Settings → Pages → Build and deployment**, elige `Deploy from a branch`, `main`, `/ (root)`. La URL será `https://higuerah.github.io/NOMBRE-DEL-REPO/`.

GitHub Pages sirve los archivos estáticos, pero no almacena por sí mismo los RSVP. Supabase guarda las respuestas y comprueba el máximo de cada invitación y la capacidad total en una transacción. La invitación pública y el código del navegador no contienen la lista de invitados ni la clave de administración.

## Pendientes de personalizar

- Confirmar aforo total y fecha límite.
- Corroborar la dirección del enlace de Maps antes de enviarlo.
- Decidir si el evento termina a las 7:00 p. m.; ese valor está en el archivo de calendario para dar un bloque de cuatro horas y debe ajustarse si hay otra hora de cierre.
