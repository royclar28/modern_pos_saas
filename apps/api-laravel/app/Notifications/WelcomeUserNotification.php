<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class WelcomeUserNotification extends Notification implements ShouldQueue
{
    use Queueable;

    public $temporaryPassword;

    /**
     * Create a new notification instance.
     *
     * @return void
     */
    public function __construct($temporaryPassword)
    {
        $this->temporaryPassword = $temporaryPassword;
    }

    /**
     * Get the notification's delivery channels.
     *
     * @param  mixed  $notifiable
     * @return array
     */
    public function via($notifiable)
    {
        return ['mail'];
    }

    /**
     * Get the mail representation of the notification.
     *
     * @param  mixed  $notifiable
     * @return \Illuminate\Notifications\Messages\MailMessage
     */
    public function toMail($notifiable)
    {
        $frontendUrl = config('app.frontend_url', 'http://localhost:5173');

        return (new MailMessage)
            ->subject('¡Bienvenido a ' . config('app.name') . '! Tu acceso está listo.')
            ->view('emails.welcome', [
                'user' => $notifiable,
                'temporaryPassword' => $this->temporaryPassword,
                'loginUrl' => "{$frontendUrl}/login"
            ]);
    }
}
