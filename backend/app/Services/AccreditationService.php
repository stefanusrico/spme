<?php

namespace App\Services;

use App\Models\Prodi\Prodi;
use App\Models\User\User;
use App\Notifications\AccreditationExpiryNotification;
use Carbon\Carbon;
use Illuminate\Support\Facades\Log;

class AccreditationService
{
    /**
     * Get all prodi with expiring accreditations
     */
    public static function getExpiringAccreditations($months = 6)
    {
        $targetDate = Carbon::now()->addMonths($months);
        $today = Carbon::now();

        return Prodi::whereNotNull('tanggalKedaluwarsa')
            ->where('tanggalKedaluwarsa', '<=', $targetDate)
            ->where('tanggalKedaluwarsa', '>', $today)
            ->orderBy('tanggalKedaluwarsa', 'asc')
            ->get();
    }

    /**
     * Get admin users who should receive notifications
     */
    public static function getAdminUsers()
    {
        return User::where('role', 'admin')
            ->whereNotNull('email')
            ->get();
    }

    /**
     * Send notification to specific admin about specific prodi
     */
    public static function notifyAdmin($admin, $prodi)
    {
        try {
            $expiryDate = Carbon::parse($prodi->tanggalKedaluwarsa);
            $daysUntilExpiry = Carbon::now()->diffInDays($expiryDate);

            $admin->notify(new AccreditationExpiryNotification($prodi, $daysUntilExpiry));

            Log::info('Accreditation expiry notification sent', [
                'admin_id' => $admin->_id,
                'admin_name' => $admin->name,
                'prodi_id' => $prodi->_id,
                'prodi_name' => $prodi->name,
                'days_until_expiry' => $daysUntilExpiry
            ]);

            return true;
        } catch (\Exception $e) {
            Log::error('Failed to send accreditation notification', [
                'admin_id' => $admin->_id,
                'prodi_id' => $prodi->_id,
                'error' => $e->getMessage()
            ]);
            return false;
        }
    }

    /**
     * Get accreditation status for dashboard
     */
    public static function getAccreditationSummary()
    {
        $today = Carbon::now();

        return [
            'expiring_in_30_days' => Prodi::whereNotNull('tanggalKedaluwarsa')
                ->where('tanggalKedaluwarsa', '<=', $today->copy()->addDays(30))
                ->where('tanggalKedaluwarsa', '>', $today)
                ->count(),
            'expiring_in_90_days' => Prodi::whereNotNull('tanggalKedaluwarsa')
                ->where('tanggalKedaluwarsa', '<=', $today->copy()->addDays(90))
                ->where('tanggalKedaluwarsa', '>', $today)
                ->count(),
            'expiring_in_6_months' => Prodi::whereNotNull('tanggalKedaluwarsa')
                ->where('tanggalKedaluwarsa', '<=', $today->copy()->addMonths(6))
                ->where('tanggalKedaluwarsa', '>', $today)
                ->count(),
            'expired' => Prodi::whereNotNull('tanggalKedaluwarsa')
                ->where('tanggalKedaluwarsa', '<=', $today)
                ->count(),
        ];
    }
}