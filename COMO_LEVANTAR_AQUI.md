# Cómo levantar el sistema en esta PC (Local)

El proyecto corre completamente en Docker. La API ahora es 100% Laravel 13 (el backend NestJS ha sido eliminado).

## Pasos para iniciar el sistema

1. **Abre una terminal** y asegúrate de estar en la carpeta del proyecto:
   ```bash
   cd /home/royclar/Documents/PROYECTO_MASTER/modern_pos_saas
   ```

2. **Levanta todos los componentes (Postgres, Laravel y Vite)**:
   Ejecuta el siguiente comando (cuando te lo pida, ingresa tu contraseña):
   ```bash
   sudo docker compose -f docker-compose.yml -f docker-compose.laravel.yml up -d
   ```
   *El parámetro `-d` hace que los contenedores corran de forma silenciosa e independiente en segundo plano, así tu terminal quedará libre.*

3. **Accede a la aplicación**:
   Espera unos segundos a que los servidores arranquen y abre en tu navegador:
   - **URL:** [http://localhost:5174/login](http://localhost:5174/login)
   - **Usuario (creado por defecto):** `admin`
   - **Contraseña:** `123456`

---

## Comandos útiles de mantenimiento para esta PC

Aquí te dejo un "torpedo" (trampa) de los comandos de Docker que te serán más útiles en el día a día para controlar el sistema:

| Lo que quieres hacer | Comando a ejecutar en esta carpeta |
| :--- | :--- |
| **Ver si están encendidos** | `sudo docker compose -f docker-compose.yml -f docker-compose.laravel.yml ps` |
| **Ver errores o eventos (Logs)** | `sudo docker compose -f docker-compose.yml -f docker-compose.laravel.yml logs -f` |
| **Apagar el sistema** | `sudo docker compose -f docker-compose.yml -f docker-compose.laravel.yml down` |
| **Apagar y BORRAR la base de datos** | `sudo docker compose -f docker-compose.yml -f docker-compose.laravel.yml down -v` |
| **Reconstruir todo (Si agregas librerías nuevas en el código)** | `sudo docker compose -f docker-compose.yml -f docker-compose.laravel.yml up -d --build` |

¡Eso es todo! Ya no necesitas utilizar `pnpm dev` nunca más para encender el proyecto de forma manual. Todo lo hace Docker por ti en automático.
