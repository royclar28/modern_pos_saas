<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>¡Bienvenido!</title>
    <style>
        body { margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f3f4f6; color: #1f2937; }
        .wrapper { width: 100%; table-layout: fixed; background-color: #f3f4f6; padding-bottom: 60px; }
        .main { background-color: #ffffff; margin: 0 auto; width: 100%; max-width: 600px; border-spacing: 0; font-family: sans-serif; color: #333333; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06); margin-top: 40px;}
        .header { background: linear-gradient(135deg, #059669 0%, #10b981 100%); padding: 50px 20px; text-align: center; }
        .header img { max-width: 150px; }
        .header h1 { color: #ffffff; margin: 0; font-size: 28px; font-weight: 800; letter-spacing: -0.025em; text-transform: uppercase; }
        .header p { color: #d1fae5; margin-top: 10px; font-size: 16px; font-weight: 500; }
        .content { padding: 40px 30px; text-align: left; }
        .content p { font-size: 16px; line-height: 1.6; margin: 0 0 20px 0; color: #4b5563; }
        
        /* Credential Box */
        .credential-box { background: #f8fafc; border: 2px dashed #cbd5e1; border-radius: 12px; padding: 25px; margin: 30px 0; text-align: center; }
        .credential-box p { margin: 0 0 10px 0; color: #64748b; font-size: 14px; text-transform: uppercase; font-weight: 700; letter-spacing: 1px;}
        .credential-box .password { font-family: 'Courier New', Courier, monospace; font-size: 28px; font-weight: 900; color: #0f172a; letter-spacing: 3px; background: #e2e8f0; padding: 10px 20px; border-radius: 8px; display: inline-block;}
        
        .button-wrapper { text-align: center; margin: 35px 0; }
        .button { display: inline-block; padding: 16px 36px; background-color: #059669; color: #ffffff !important; text-decoration: none; border-radius: 50px; font-size: 16px; font-weight: 700; box-shadow: 0 4px 10px rgba(5, 150, 105, 0.3); transition: all 0.3s ease; }
        .footer { background-color: #f9fafb; padding: 30px 20px; text-align: center; border-top: 1px solid #e5e7eb; }
        .footer p { font-size: 13px; color: #9ca3af; margin: 0 0 10px 0; line-height: 1.5; }
        .footer a { color: #059669; text-decoration: none; }
        .highlight { color: #059669; font-weight: 700; }
    </style>
</head>
<body>
    <center class="wrapper">
        <table class="main" width="100%">
            <!-- Header -->
            <tr>
                <td class="header">
                    <!-- Logo de la marca -->
                    <img src="{{ config('app.frontend_url', 'http://localhost:5173') }}/pwa-192x192.png" alt="Logo">
                    <h1>¡Bienvenido a {{ config('app.name') }}!</h1>
                    <p>Tu sistema de gestión empresarial inteligente</p>
                </td>
            </tr>
            <!-- Body -->
            <tr>
                <td class="content">
                    <p>¡Hola <span class="highlight">{{ $user->first_name ?? 'Nuevo Usuario' }}</span>!</p>
                    <p>Nos emociona darte la bienvenida a <strong>{{ config('app.name') }}</strong>. Tu cuenta ha sido creada exitosamente por tu administrador y ya está lista para que comiences a usarla.</p>
                    
                    <p>Para proteger tu seguridad, hemos generado una contraseña temporal para tu primer inicio de sesión:</p>

                    <div class="credential-box">
                        <p>TU CONTRASEÑA TEMPORAL</p>
                        <div class="password">{{ $temporaryPassword }}</div>
                    </div>

                    <p>Te recomendamos encarecidamente que, una vez que inicies sesión por primera vez, te dirijas a la sección de configuración de tu perfil para <strong>cambiar esta contraseña</strong> por una nueva que solo tú conozcas.</p>
                    
                    <div class="button-wrapper">
                        <a href="{{ $loginUrl }}" class="button">Iniciar Sesión Ahora</a>
                    </div>
                </td>
            </tr>
            <!-- Footer -->
            <tr>
                <td class="footer">
                    <p>Si tienes alguna pregunta o necesitas ayuda, no dudes en contactar a tu administrador o al equipo de soporte de {{ config('app.name') }}.</p>
                    <p>&copy; {{ date('Y') }} {{ config('app.name') }}. Todos los derechos reservados.</p>
                </td>
            </tr>
        </table>
    </center>
</body>
</html>
