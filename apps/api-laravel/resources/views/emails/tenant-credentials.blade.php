<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Credenciales de Acceso</title>
</head>
<body style="font-family: Arial, sans-serif; color: #333; line-height: 1.6;">
    <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 20px;">
            <h1 style="color: #6366f1;">¡Bienvenido a MerxPOS, {{ $user->first_name }}!</h1>
        </div>
        
        <p>Tu cuenta ha sido creada exitosamente. Tu período de prueba de 30 días ha comenzado.</p>
        <p>Aquí tienes tus credenciales de acceso para que puedas ingresar al sistema:</p>
        
        <div style="background-color: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <ul style="list-style-type: none; padding: 0; margin: 0;">
                <li style="margin-bottom: 10px;"><strong>Usuario:</strong> {{ $user->username }}</li>
                <li style="margin-bottom: 10px;"><strong>Correo electrónico:</strong> {{ $user->email }}</li>
                <li><strong>Contraseña:</strong> {{ $password }}</li>
            </ul>
        </div>
        
        <p>Por favor, guarda esta información en un lugar seguro. Te recomendamos cambiar tu contraseña una vez inicies sesión por primera vez.</p>
        
        <div style="margin-top: 30px; border-top: 1px solid #e5e7eb; padding-top: 20px; font-size: 0.9em; color: #6b7280;">
            <p>Atentamente,</p>
            <p><strong>El equipo de MerxPOS</strong></p>
        </div>
    </div>
</body>
</html>
