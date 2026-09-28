# Invitación interactiva de Lía Luzbel

Página estática preparada para GitHub Pages. La ilustración tropical proporcionada por el usuario tiene destellos y agua en movimiento. Respeta la preferencia `prefers-reduced-motion`.

La primera pantalla es un sobre personalizado. Al tocar **Abrir invitación**, se abre la ilustración tropical y se inicia `assets/aloha-luzbel.mp3` dentro del mismo gesto (necesario para audio en iPhone). El botón rosa impreso abre una segunda pantalla con la confirmación. La canción puede pausarse desde el encabezado. Flores y salpicaduras se lanzan en los segundos indicados en `app.js` (`cueSchedule`). Son marcas ajustables si se afina la sincronía escuchando el audio en el teléfono.

## Probar el diseño

Abre `index.html?demo=1` desde un servidor local (por ejemplo `python3 -m http.server 8000` y `http://localhost:8000/?demo=1`). El modo demo usa almacenamiento local **únicamente en ese navegador**. No sirve para recibir confirmaciones reales. Los enlaces públicos de invitados llevan `?i=UUID`.

## Activar confirmaciones reales

1. Crea un proyecto en Supabase y ejecuta `database.sql` desde su SQL Editor. El correo administrador configurado es `rah@live.com.mx`. No hay aforo global: cada enlace sólo permite los adultos y niños asignados. El cierre de RSVP es el **30 de septiembre de 2026, a las 11:59 p. m. hora de Sonora**. La imagen indica sábado **3 de octubre de 2026, 3:00 p. m.**
2. En Supabase Auth → URL Configuration, añade `https://higuerah.github.io/Invitacion-Lia-Luzbel/admin.html` como URL de redirección permitida. En `config.js` coloca la URL del proyecto y su clave pública **anon/publishable**. Nunca coloques la clave `service_role` o `secret` en el repositorio o la web.
3. Abre `https://higuerah.github.io/Invitacion-Lia-Luzbel/admin.html`. Entra mediante el enlace que llegará al correo indicado y crea una invitación por persona. Por ejemplo, **Dulce** con 2 adultos y 3 niños. El panel genera un enlace único; la página saluda por nombre y limita cada categoría por separado. Copia el enlace y envíalo sólo a ella.
4. El panel muestra confirmados, adultos, niños y estado de cada invitación. También permite ajustar cupos o desactivar un enlace. Si alguien ya confirmó, evita bajar los cupos por debajo de su respuesta registrada. El enlace personal puede reutilizarse para corregir una respuesta hasta la fecha límite. El token es secreto: quien tenga el enlace puede ver y cambiar **esa** respuesta.
5. Publica estos archivos en un repositorio dedicado de GitHub. En **Settings → Pages → Build and deployment**, elige `Deploy from a branch`, `main`, `/ (root)`. La URL será `https://higuerah.github.io/NOMBRE-DEL-REPO/`.

GitHub Pages sirve los archivos estáticos, pero no almacena por sí mismo los RSVP. Supabase guarda las respuestas y comprueba los máximos de adultos/niños por invitación. La invitación pública y el código del navegador no contienen la lista de invitados ni la clave de administración.

## Pendientes de personalizar

- Confirmar la fecha límite antes de enviar los enlaces.
- Corroborar la dirección del enlace de Maps antes de enviarlo.
- Decidir si el evento termina a las 7:00 p. m.; ese valor está en el archivo de calendario para dar un bloque de cuatro horas y debe ajustarse si hay otra hora de cierre.
