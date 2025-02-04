<?php

namespace App\Http\Controllers;

use App\Models\Prodi;
use App\Models\Jurusan;
use App\Models\Lam;
use Facebook\WebDriver\Remote\RemoteWebDriver;
use Facebook\WebDriver\Chrome\ChromeOptions;
use Facebook\WebDriver\Remote\DesiredCapabilities;
use Facebook\WebDriver\WebDriverBy;
use Illuminate\Support\Carbon;

class ScraperController extends Controller
{
    public function scrape(string $perguruan_tinggi, string $strata)
    {
        try {
            $options = new ChromeOptions();
            $options->addArguments(['--headless=new', '--disable-gpu', '--window-size=1920,1080']);

            $driver = RemoteWebDriver::create(
                'http://localhost:9515',
                DesiredCapabilities::chrome()->setCapability(ChromeOptions::CAPABILITY, $options)
            );

            $driver->get('https://www.banpt.or.id/direktori/prodi/pencarian_prodi.php');

            $pageStructure = $driver->executeScript('
                return {
                    hasSearchInput: !!document.querySelector("input.form-control[placeholder=\"Perguruan Tinggi\"]"),
                    hasStrataSelect: !!document.querySelector("select[name=\"strata\"]"),
                    hasDataTable: !!document.querySelector("#table"),
                    hasPagination: !!document.querySelector("#table_paginate")
                };
            ');

            if (
                !$pageStructure['hasSearchInput'] || !$pageStructure['hasStrataSelect'] ||
                !$pageStructure['hasDataTable'] || !$pageStructure['hasPagination']
            ) {
                throw new \Exception('Website structure has changed');
            }

            $searchInput = $driver->findElement(WebDriverBy::cssSelector('input.form-control[placeholder="Perguruan Tinggi"]'));
            $strataSelect = $driver->findElement(WebDriverBy::cssSelector('select[name="strata"]'));

            $searchInput->sendKeys($perguruan_tinggi);
            $strataSelect->findElement(WebDriverBy::cssSelector("option[value='$strata']"))->click();

            sleep(10);
            $tableData = [];

            do {
                $currentPageData = $driver->executeScript('
                    return Array.from(document.querySelectorAll("#table tbody tr")).map(row => 
                        Array.from(row.querySelectorAll("td")).map(cell => cell.textContent.trim())
                    );
                ');

                $tableData = array_merge($tableData, $currentPageData);

                $nextButton = $driver->findElements(WebDriverBy::cssSelector('#table_next:not(.disabled)'));
                if (empty($nextButton))
                    break;

                $nextButton[0]->click();
                sleep(2);
            } while (true);


            $jurusans = Jurusan::all()->keyBy('name');
            foreach ($tableData as $row) {
                try {
                    $prodiName = $row[2] . ' ' . $row[1];
                    $jurusanId = null;

                    $mapping = (new Prodi)->getJurusanKeyword($prodiName);
                    if ($mapping && isset($jurusans[$mapping])) {
                        $jurusanId = $jurusans[$mapping]->_id;
                    }

                    $prodi = Prodi::updateOrCreate(
                        [
                            'name' => $prodiName,
                            'nomorSK' => $row[4]
                        ],
                        [
                            'jurusanId' => $jurusanId,
                            'tahunSK' => (int) $row[5],
                            'peringkat' => $row[6],
                            'tanggalKedaluwarsa' => Carbon::create($row[7])->setTime(7, 0, 0),
                        ]
                    );

                    \Log::info("Processed Prodi: {$prodi->_id}");

                } catch (\Exception $e) {
                    \Log::error("Error processing prodi {$prodiName}: {$e->getMessage()}");
                    continue;
                }
            }

            \Log::info("Total records processed: " . count($tableData));

            return response()->json([
                'message' => 'Data updated successfully',
                'records_processed' => count($tableData)
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'error' => 'Failed to update data',
                'message' => $e->getMessage()
            ], 500);
        } finally {
            if (isset($driver)) {
                $driver->quit();
            }
        }
    }
}