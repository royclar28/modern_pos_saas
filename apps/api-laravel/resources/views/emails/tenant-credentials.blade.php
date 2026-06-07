<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Configura tu contraseña — MerxPOS</title>
</head>
<body style="font-family: Arial, sans-serif; color: #333; line-height: 1.6;">
    <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 20px;">
            <h1 style="color: #6366f1;">¡Bienvenido a MerxPOS, {{ $user->first_name }}!</h1>
        </div>

        <p>Tu cuenta ha sido creada exitosamente. Tu período de prueba de <strong>30 días</strong> ha comenzado.</p>

        <p>Para completar el registro y acceder al sistema, debes configurar tu contraseña haciendo clic en el siguiente botón:</p>

        <div style="text-align: center; margin: 30px 0;">
            <a href="{{ $setupUrl }}" style="display: inline-block; background-color: #6366f1; color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-size: 16px; font-weight: bold;">
                Configurar mi contraseña
            </a>
        </div>

        <p style="font-size: 0.9em; color: #6b7280;">Este enlace es válido por <strong>60 minutos</strong>. Si el enlace expira, puedes solicitar uno nuevo desde la página de inicio de sesión.</p>

        <div style="background-color: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 0 0 8px 0; font-size: 0.95em;">Resumen de tu cuenta:</p>
            <ul style="list-style-type: none; padding: 0; margin: 0;">
                <li style="margin-bottom: 6px;"><strong>Usuario:</strong> {{ $user->username }}</li>
                <li><strong>Correo electrónico:</strong> {{ $user->email }}</li>
            </ul>
        </div>

        <p style="font-size: 0.85em; color: #9ca3af;">Si el botón no funciona, copia y pega este enlace en tu navegador:<br>{{ $setupUrl }}</p>

        <div style="margin-top: 30px; border-top: 1px solid #e5e7eb; padding-top: 20px; font-size: 0.9em; color: #6b7280;">
            <p>Atentamente,</p>
            <p><strong>El equipo de MerxPOS</strong></p>
        </div>
    </div>
</body>
</html>
