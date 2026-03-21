import { Injectable, Logger } from '@nestjs/common';
import { Resend } from 'resend';

@Injectable()
export class EmailService {
    private readonly logger = new Logger(EmailService.name);
    private resend: Resend;

    constructor() {
        // Instantiate Resend using the environment variable
        const apiKey = process.env.RESEND_API_KEY;
        if (!apiKey) {
            this.logger.warn('RESEND_API_KEY no está configurada en .env. Los correos no se enviarán adecuadamente.');
        }
        this.resend = new Resend(apiKey || 'unconfigured');
    }

    async sendWelcomeEmail(email: string, storeName: string, plainPassword: string) {
        this.logger.log(`Enviando correo de bienvenida a ${email}...`);
        
        const htmlBody = `
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
                <h2 style="color: #4f46e5;">¡Bienvenido a Merx POS!</h2>
                <p>Hola,</p>
                <p>Nos emociona darte la bienvenida a nuestra plataforma. Tu tienda <strong>"${storeName}"</strong> ha sido configurada y está lista para operar.</p>
                <p>A continuación, te proporcionamos tus credenciales de acceso. Te recomendamos cambiar tu contraseña una vez que inicies sesión.</p>
                
                <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
                    <p style="margin: 0;"><strong>URL de acceso:</strong> <a href="https://merxpos.com/login" style="color: #4f46e5;">https://merxpos.com/login</a></p>
                    <p style="margin: 10px 0 0 0;"><strong>Usuario (Correo):</strong> ${email}</p>
                    <p style="margin: 10px 0 0 0;"><strong>Contraseña Temporal:</strong> <code style="background-color: #e5e7eb; padding: 2px 6px; border-radius: 4px;">${plainPassword}</code></p>
                </div>
                
                <p>Si tienes alguna pregunta, no dudes en responder a este correo.</p>
                <p>Saludos,<br>El equipo de Merx POS</p>
            </div>
        `;

        try {
            const { data, error } = await this.resend.emails.send({
                from: 'Merx POS <onboarding@resend.dev>',
                to: [email],
                subject: `¡Bienvenido a Merx POS, ${storeName}!`,
                html: htmlBody,
            });

            if (error) {
                this.logger.error(`Error de Resend al enviar correo a ${email}:`, error);
                throw new Error(error.message);
            }

            this.logger.log(`Correo de bienvenida enviado con éxito a ${email} (ID: ${data?.id})`);
            return data;
        } catch (error: any) {
            this.logger.error(`Excepción al enviar correo a ${email}: ${error.message}`);
            throw error;
        }
    }
}
