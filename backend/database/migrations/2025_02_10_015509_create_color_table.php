<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\Schema;
use Illuminate\Database\Schema\Blueprint;

return new class extends Migration
{
    public function up()
    {
        Schema::connection('mongodb')->create('colors', function ($collection) {
            $collection->id(); // Untuk ObjectId
            $collection->string('value'); // Warna dalam format HEX
            $collection->double('rangeStart'); // Rentang awal
            $collection->double('rangeEnd'); // Rentang akhir
            $collection->timestamps(); // created_at dan updated_at otomatis
        });
    }

    public function down()
    {
        Schema::connection('mongodb')->dropIfExists('colors');
    }
};
