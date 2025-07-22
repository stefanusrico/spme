<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\Prodi\Prodi;
use App\Models\User\User;
use App\Notifications\AccreditationExpiryNotification;
use Carbon\Carbon;
use Illuminate\Support\Facades\Log;

class CheckAccreditationExpiry extends Command
{
    protected $signature = 'accreditation:check-expiry';
    protected $description = 'Check for prodi accreditations expiring in 6 months and notify admins';

    public function handle()
    {
        $this->info('Checking accreditation expiry dates...');

        // Get date 6 months from now
        $sixMonthsFromNow = Carbon::now()->addMonths(6);
        $today = Carbon::now();

        // Find prodi with accreditation expiring in approximately 6 months
        $expiringProdi = Prodi::whereNotNull('tanggalKedaluwarsa')
            ->where('tanggalKedaluwarsa', '<=', $sixMonthsFromNow)
            ->where('tanggalKedaluwarsa', '>', $today)
            ->get();

        if ($expiringProdi->isEmpty()) {
            $this->info('No accreditations expiring in the next 6 months.');
            return;
        }

        // Get all admin users
        $adminUsers = User::where('role', 'admin')->get();

        if ($adminUsers->isEmpty()) {
            $this->error('No admin users found to send notifications to.');
            Log::warning('No admin users found for accreditation expiry notifications');
            return;
        }

        $notificationsSent = 0;

        foreach ($expiringProdi as $prodi) {
            try {
                $expiryDate = Carbon::parse($prodi->tanggalKedaluwarsa);
                $daysUntilExpiry = $today->diffInDays($expiryDate);

                // Only send notification if it's approximately 6 months (170-190 days)
                // or if it's getting closer (30, 60, 90 days)
                $notificationDays = [30, 60, 90, 180]; // Days before expiry to send notifications

                if (in_array($daysUntilExpiry, $notificationDays) ||
                    ($daysUntilExpiry >= 170 && $daysUntilExpiry <= 190)) {

                    foreach ($adminUsers as $admin) {
                        try {
                            $admin->notify(new AccreditationExpiryNotification($prodi, $daysUntilExpiry));
                            $notificationsSent++;

                            $this->info("Notification sent to {$admin->name} for {$prodi->name} (expires in {$daysUntilExpiry} days)");

                        } catch (\Exception $e) {
                            $this->error("Failed to send notification to {$admin->name}: " . $e->getMessage());
                            Log::error('Failed to send accreditation expiry notification', [
                                'admin_id' => $admin->_id,
                                'prodi_id' => $prodi->_id,
                                'error' => $e->getMessage()
                            ]);
                        }
                    }
                }

            } catch (\Exception $e) {
                $this->error("Error processing prodi {$prodi->name}: " . $e->getMessage());
                Log::error('Error processing prodi for accreditation expiry', [
                    'prodi_id' => $prodi->_id,
                    'error' => $e->getMessage()
                ]);
            }
        }

        $this->info("Process completed. {$notificationsSent} notifications sent.");

        // Log summary
        Log::info('Accreditation expiry check completed', [
            'expiring_prodi_count' => $expiringProdi->count(),
            'admin_count' => $adminUsers->count(),
            'notifications_sent' => $notificationsSent
        ]);
    }
}
