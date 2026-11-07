# Diario de SolosoyJuan

Versión estática del diario, integrada como sitio independiente en `/diario` para conservar el sitio principal del repositorio.

## Uso

Abre `index.html` en un navegador moderno o visita la carpeta `/diario/` en el sitio publicado. No requiere Python, Flask ni instalar paquetes.

El recorrido de lectura es portada → índice → páginas → «Continuará» → contraportada. Las entradas nuevas y los cambios se guardan en el almacenamiento local del navegador; no se sincronizan entre dispositivos. Usa **Exportar respaldo** para guardar una copia JSON.

## Datos y privacidad

`data/initial-data.js` incluye las entradas iniciales del diario. Como este repositorio es público, tanto esas entradas como el código y las imágenes de esta carpeta pueden ser consultados y descargados por cualquiera.

El bloqueo de edición solo oculta los controles en el navegador actual; no es autenticación segura ni cifra las entradas. Las páginas incluidas en `data/initial-data.js` también pueden leerse sin abrir la aplicación.

La aplicación no incluye la base SQLite ni el backend Flask. La dirección de correo personal se quitó de la interfaz y del código de esta copia pública.

## Archivos

```text
index.html
styles.css
app.js
data/initial-data.js
static/images/
```
