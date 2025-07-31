<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;
use Illuminate\Notifications\Messages\MailMessage;
use Carbon\Carbon;

class AccreditationExpiryNotification extends Notification
{
    use Queueable;

    protected $prodi;
    protected $daysUntilExpiry;

    public function __construct($prodi, $daysUntilExpiry)
    {
        $this->prodi = $prodi;
        $this->daysUntilExpiry = $daysUntilExpiry;
    }

    public function via($notifiable)
    {
        return ['database', 'mail'];
    }

    public function toMail($notifiable)
    {
        $expiryDate = Carbon::parse($this->prodi->tanggalKedaluwarsa)->format('d M Y');
        $prodiUrl = config('app.url') . '/prodi/' . $this->prodi->_id;

        return (new MailMessage)
            ->subject('⚠️ Accreditation Expiry Alert: ' . $this->prodi->name)
            ->greeting('Hello Admin!')
            ->line('This is an important reminder about an upcoming accreditation expiry.')
            ->line('**Prodi Details:**')
            ->line('• Program Studi: ' . $this->prodi->name)
            ->line('• Jenjang: ' . ($this->prodi->jenjang ?? 'Not specified'))
            ->line('• Current Status: ' . ($this->prodi->peringkat ?? 'Not specified'))
            ->line('• Expiry Date: ' . $expiryDate)
            ->line('• Days Until Expiry: ' . $this->daysUntilExpiry . ' days')
            ->line('')
            ->line('**Action Required:**')
            ->line('Please coordinate with the relevant department to begin the re-accreditation process.')
            ->action('View Prodi Details', $prodiUrl)
            ->line('Early preparation is crucial for maintaining accreditation status.')
            ->line('Thank you for your attention to this matter.');
    }

    public function toArray($notifiable)
    {
        $expiryDate = Carbon::parse($this->prodi->tanggalKedaluwarsa)->format('d M Y');

        return [
            'title' => 'Accreditation Expiry Alert',
            'message' => "Prodi '{$this->prodi->name}' accreditation will expire in {$this->daysUntilExpiry} days ({$expiryDate})",
            'type' => 'accreditation_expiry',
            'prodi_id' => $this->prodi->_id,
            'priority' => 'high',
            'prodi' => [
                'id' => $this->prodi->_id,
                'name' => $this->prodi->name,
                'jenjang' => $this->prodi->jenjang ?? null,
                'peringkat' => $this->prodi->peringkat ?? null,
                'tanggal_kedaluwarsa' => $this->prodi->tanggalKedaluwarsa,
                'days_until_expiry' => $this->daysUntilExpiry
            ]
        ];
    }
}