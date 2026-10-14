<?php

namespace App\Mail;

use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class TenantCredentialsMail extends Mailable
{
    use Queueable, SerializesModels;

    public User $user;
    public string $token;
    public ?string $temporaryPassword;
    public string $setupUrl;

    /**
     * Create a new message instance.
     */
    public function __construct(User $user, string $token, ?string $temporaryPassword = null)
    {
        $this->user = $user;
        $this->token = $token;
        $this->temporaryPassword = $temporaryPassword;

        $baseUrl = config('app.frontend_url') ?: config('app.url', 'http://localhost:5173');
        $this->setupUrl = rtrim($baseUrl, '/')
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
