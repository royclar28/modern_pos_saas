<?php

namespace App\Mail;

use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class TenantCredentialsMail extends Mailable implements ShouldQueue
{
    use Queueable, SerializesModels;

    public User $user;

    /**
     * Password-reset token generado por Password::broker()->createToken().
     * Válido por 60 minutos (config/auth.php passwords.users.expire).
     *
     * 🔒 Este token NUNCA se almacena en logs ni en la BD en texto plano.
     *     La tabla password_reset_tokens contiene un hash SHA-256.
     */
    public string $token;

    /**
     * URL completa al frontend SPA para que el usuario configure su contraseña.
     */
    public string $setupUrl;

    /**
     * Create a new message instance.
     */
    public function __construct(User $user, string $token)
    {
        $this->user  = $user;
        $this->token = $token;

        $this->setupUrl = rtrim(config('app.frontend_url', 'http://localhost:5173'), '/')
                         . '/setup-password?token=' . urlencode($token)
                         . '&email=' . urlencode($user->email);
    }

    /**
     * Get the message envelope.
     */
    public function envelope(): Envelope
    {
        return new Envelope(
            subject: 'Configura tu contraseña — MerxPOS',
        );
    }

    /**
     * Get the message content definition.
     */
    public function content(): Content
    {
        return new Content(
            view: 'emails.tenant-credentials',
        );
    }

    /**
     * Get the attachments for the message.
     *
     * @return array<int, \Illuminate\Mail\Mailables\Attachment>
     */
    public function attachments(): array
    {
        return [];
    }
}
