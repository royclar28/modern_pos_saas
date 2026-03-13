# 🚀 Guía de Arranque del Sistema POS

Esta guía te explicará cómo arrancar el sistema "Modern POS", tanto si lo haces por primerísima vez (en una computadora nueva) o para tu día a día (mañana cuando llegues).

## 🤔 1. Arranque en el Día a Día (Opción más común)
Dado que ya encendimos el sistema y creamos la base de datos hoy, para usarlo en los días subsiguientes el proceso es **inmediato y muy sencillo**.

Solo debes abrir tu terminal, ubicarte en la carpeta del proyecto y encender los contenedores en segundo plano.

```bash
# Entra a la carpeta del proyecto
cd /ruta/hacia/tu/carpeta/modern_pos_saas

# Enciende el sistema en segundo plano (d tardará un par de segundos)
docker compose up -d
```

Ya está. El sistema detectará que la base de datos y todas las configuraciones están en su lugar. Puedes ir a tu navegador y abrir:
👉 **[http://localhost:5174](http://localhost:5174)**

### Para Apagar el Sistema (Al irte a casa):
```bash
docker compose down
```
Esto apagará los motores de la Base de Datos, Frontend y API conservando todos los datos seguros para el día siguiente.

---

## 🛠️ 2. Arranque desde Cero (Primera Vez en Otra PC)

Si tienes que llevar este sistema a otra computadora que **no tenga la base de datos instalada**, el proceso requiere pre-configurar los enlaces de red. 

**Requisito previo:** Debes tener [Docker Desktop](https://www.docker.com/products/docker-desktop/) instalado. 

1. **Clona y entra a la carpeta:**
   ```bash
   git clone <repo> modern_pos_saas
   cd modern_pos_saas
   ```

2. **Crea la configuración de entorno:**
   Copia el archivo base y **asegúrate** de que apunte al puerto correcto.
   ```bash
   cp .env.example .env
   ```
   *⚠️ Nota: Abre el archivo `.env` recién creado y asegúrate de que `VITE_API_URL` esté configurado a `"http://localhost:3333"`.*

3. **Construye y levanta el sistema:**
   La primera vez, Docker tomará unos minutos descargando imágenes (PostgreSQL, Node, etc), instalando dependencias en las carpetas anónimas y creando las tablas.
   ```bash
   docker compose build
   docker compose up -d
   ```

4. **Verificar que la Base de Datos se creó:**
   Al ser la primera vez, el servidor esperará a inyectar al usuario *admin* en la base de datos vacía. Puedes verificar el progreso mirando los logs:
   ```bash
   docker compose logs -f api
   ```
   *Una vez veas que dice `🚀 NestJS API running at http://localhost:3001` presiona `Ctrl+C`* y dirígete al navegador en `localhost:5174`.

## 📌 Credenciales de Acceso
* Usuario: `admin`
* Contraseña: `123456`

---

## 💡 Botón Manual de BCV
Como precaución y mejora para el cajero, el sistema trae un motor **"Cron Job"** que descarga la tasa del dólar automáticamente desde `dolarapi` todos los días cada 12 horas.

**¿Falló la conexión u olvidaste actualizar a tiempo?**
No hay problema, en la barra superior de tu pantalla principal de Ventas (Punto de Venta), junto al indicador de BCV, notarás un **pequeño botón con el ícono (🔄)**. Al presionarlo:
1. Contactará a la API principal inmediatamente.
2. Forzará al servidor de NestJS a re-ejecutar su ciclo de búsqueda contra `dolarapi`.
3. Te refrescará la tasa actual a todos los terminales físicos de tu sede que tengan el navegador abierto, instantáneamente y en vivo.
