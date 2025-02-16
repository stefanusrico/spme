<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class RumusSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        DB::table('rumuses')->insert([
            [
                'nomor' => 10,
                'sub' => 'A',
                'rumus' => '((a * N1) + (b * N2) + (c * N3)) / NDTPS'
            ],
            [
                'nomor' => 10,
                'sub' => 'B',
                'rumus' => '4 * ((A + B + (C / 2)) - (A * B) - ((A * C) / 2) - ((B * C) / 2) + ((A * B * C) / 2))'
            ],
        ]);
    }
}