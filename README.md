# El diario de SolosoyJuan

Diario estático hecho con HTML, CSS y JavaScript. No necesita Python, Flask ni instalar paquetes.

## Uso

Abre `index.html` en un navegador moderno. El recorrido de lectura es portada → índice → páginas → «Continuará» → contraportada. La primera vez que se entra a la edición se crea una contraseña local para ese navegador; después, solo se solicita esa contraseña.

Las páginas nuevas, ediciones y eliminaciones se guardan en el almacenamiento local del navegador actual. **No se sincronizan ni se publican en GitHub Pages.** Usa **Exportar respaldo** para descargar una copia JSON.

Debajo de la portada, usa **Imprimir / Guardar como PDF** para guardar el libro completo (portada, índice y entradas) en PDF. Las hojas usan los colores del diario y llevan la textura de papel como imagen; no hace falta activar **Gráficos de fondo**.

## Publicación y acceso

El sitio publicado es público y sus entradas iniciales se pueden consultar en `data/initial-data.js`. GitHub Pages solo sirve archivos estáticos: la contraseña local oculta los controles en este navegador, pero no es autenticación del servidor. Cualquiera puede inspeccionar el JavaScript, modificar su propio navegador o leer los datos.

Para publicar cambios en el diario en línea se necesita acceso autorizado al repositorio de GitHub. No se guarda ninguna contraseña en los archivos públicos.

## Respaldo anterior

`instance/diario.db` se conserva únicamente como respaldo local de la aplicación anterior. La versión estática no la utiliza. No publiques ni compartas ese archivo.
