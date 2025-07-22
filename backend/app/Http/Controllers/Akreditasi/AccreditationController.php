<?php

namespace App\Http\Controllers\Akreditasi;

use App\Http\Controllers\Controller;
use App\Services\AccreditationService;
use App\Models\Prodi\Prodi;
use Carbon\Carbon;
use Illuminate\Http\Request;

class AccreditationController extends Controller
{

    public function summary()
    {
        try {
            $summary = AccreditationService::getAccreditationSummary();
            $expiringProdi = AccreditationService::getExpiringAccreditations(6);

            return response()->json([
                'status' => 'success',
                'data' => [
                    'summary' => $summary,
                    'expiring_prodi' => $expiringProdi->map(function ($prodi) {
                        $expiryDate = Carbon::parse($prodi->tanggalKedaluwarsa);
                        $daysUntilExpiry = Carbon::now()->diffInDays($expiryDate);

                        return [
                            'id' => $prodi->_id,
                            'name' => $prodi->name,
                            'jenjang' => $prodi->jenjang,
                            'peringkat' => $prodi->peringkat,
                            'tanggal_kedaluwarsa' => $prodi->tanggalKedaluwarsa,
                            'formatted_expiry_date' => $expiryDate->format('d M Y'),
                            'days_until_expiry' => $daysUntilExpiry,
                            'urgency_level' => $this->getUrgencyLevel($daysUntilExpiry)
                        ];
                    })
                ]
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'status' => 'error',
                'message' => 'Failed to get accreditation summary',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    public function checkExpiry()
    {
        try {
            \Artisan::call('accreditation:check-expiry');
            $output = \Artisan::output();

            return response()->json([
                'status' => 'success',
                'message' => 'Accreditation expiry check completed',
                'output' => $output
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'status' => 'error',
                'message' => 'Failed to run accreditation check',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    private function getUrgencyLevel($daysUntilExpiry)
    {
        if ($daysUntilExpiry <= 30) {
            return 'critical';
        } elseif ($daysUntilExpiry <= 90) {
            return 'high';
        } elseif ($daysUntilExpiry <= 180) {
            return 'medium';
        } else {
            return 'low';
        }
    }
}
