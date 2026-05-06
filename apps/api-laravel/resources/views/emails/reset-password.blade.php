<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Recuperación de Contraseña</title>
    <style>
        body { margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f3f4f6; color: #1f2937; }
        .wrapper { width: 100%; table-layout: fixed; background-color: #f3f4f6; padding-bottom: 60px; }
        .main { background-color: #ffffff; margin: 0 auto; width: 100%; max-width: 600px; border-spacing: 0; font-family: sans-serif; color: #333333; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06); margin-top: 40px;}
        .header { background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%); padding: 40px 20px; text-align: center; }
        .header img { max-width: 150px; }
        .header h1 { color: #ffffff; margin: 0; font-size: 24px; font-weight: 700; letter-spacing: -0.025em; }
        .content { padding: 40px 30px; text-align: left; }
        .content p { font-size: 16px; line-height: 1.6; margin: 0 0 20px 0; color: #4b5563; }
        .button-wrapper { text-align: center; margin: 35px 0; }
        .button { display: inline-block; padding: 14px 32px; background-color: #4f46e5; color: #ffffff !important; text-decoration: none; border-radius: 8px; font-size: 16px; font-weight: 600; box-shadow: 0 4px 6px rgba(79, 70, 229, 0.25); }
        .footer { background-color: #f9fafb; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb; }
        .footer p { font-size: 13px; color: #9ca3af; margin: 0 0 10px 0; }
        .footer a { color: #4f46e5; text-decoration: none; }
        .alert { background-color: #fffbeb; border-left: 4px solid #f59e0b; padding: 15px; margin-bottom: 20px; border-radius: 0 8px 8px 0; }
        .alert p { margin: 0; font-size: 14px; color: #b45309; }
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
                    <h1>{{ config('app.name') }}</h1>
                </td>
            </tr>
            <!-- Body -->
            <tr>
                <td class="content">
                    <p>Hola, <strong>{{ $user->first_name ?? 'Usuario' }}</strong>,</p>
                    <p>Hemos recibido una solicitud para restablecer la contraseña de tu cuenta en <strong>{{ config('app.name') }}</strong>.</p>
                    
                    <div class="button-wrapper">
                        <a href="{{ $url }}" class="button">Restablecer Mi Contraseña</a>
                    </div>
                    
                    <div class="alert">
                        <p><strong>Nota:</strong> Este enlace de recuperación expirará en 60 minutos. Si no fuiste tú quien solicitó este cambio, por favor ignora este correo electrónico; tu cuenta sigue estando segura.</p>
                    </div>

                    <p style="margin-top: 30px; border-top: 1px solid #e5e7eb; padding-top: 20px; font-size: 13px; color: #6b7280; word-break: break-all;">
                        Si tienes problemas haciendo clic en el botón "Restablecer Mi Contraseña", copia y pega el siguiente enlace en tu navegador web:<br>
                        <a href="{{ $url }}" style="color: #4f46e5;">{{ $url }}</a>
                    </p>
                </td>
            </tr>
            <!-- Footer -->
            <tr>
                <td class="footer">
                    <p>&copy; {{ date('Y') }} {{ config('app.name') }}. Todos los derechos reservados.</p>
                    <p>Este es un mensaje automático, por favor no respondas a este correo.</p>
                </td>
            </tr>
        </table>
    </center>
</body>
</html>
