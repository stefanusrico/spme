<?php

namespace App\Observers;

use App\Models\LkpsData;

class LkpsDataObserver
{
    /**
     * Handle the LkpsData "created" event.
     */
    public function created(LkpsData $lkpsData): void
    {
        //
    }

    /**
     * Handle the LkpsData "updated" event.
     */
    public function updated(LkpsData $lkpsData): void
    {
        //
    }

    /**
     * Handle the LkpsData "deleted" event.
     */
    public function deleted(LkpsData $lkpsData): void
    {
        //
    }

    /**
     * Handle the LkpsData "restored" event.
     */
    public function restored(LkpsData $lkpsData): void
    {
        //
    }

    /**
     * Handle the LkpsData "force deleted" event.
     */
    public function forceDeleted(LkpsData $lkpsData): void
    {
        //
    }
}