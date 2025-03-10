<?php
namespace App\Http\Controllers;

use App\Models\Prodi;
use App\Models\Jurusan;
use App\Models\Lam;
use App\Models\Strata;
use Facebook\WebDriver\Remote\RemoteWebDriver;
use Facebook\WebDriver\Chrome\ChromeOptions;
use Facebook\WebDriver\Remote\DesiredCapabilities;
use Facebook\WebDriver\WebDriverBy;
use Facebook\WebDriver\WebDriverExpectedCondition;
use Illuminate\Support\Carbon;

class ScraperController extends Controller
{
    private $jurusans;
    private $stratas;
    private $driver;

    public function __construct()
    {
        $this->jurusans = collect();
        $this->stratas = collect();
    }

    public function scrape(string $perguruan_tinggi, string $strata)
    {
        try {
            \Log::info("Starting scrape for: {$perguruan_tinggi} - {$strata}");

            $options = new ChromeOptions();
            $options->addArguments([
                '--headless=new',
                '--disable-gpu',
                '--window-size=1920,1080',
                '--no-sandbox',
                '--disable-dev-shm-usage'
            ]);

            \Log::info("Initializing WebDriver...");
            $this->driver = RemoteWebDriver::create(
                'http://localhost:9515',
                DesiredCapabilities::chrome()->setCapability(ChromeOptions::CAPABILITY, $options)
            );

            \Log::info("Navigating to BAN-PT website...");
            $this->driver->get('https://www.banpt.or.id/direktori/prodi/pencarian_prodi.php');

            // if (!$this->checkPageStructure()) {
            //     throw new \Exception('Website structure has changed');
            // }

            if (!$this->performSearch($perguruan_tinggi, $strata)) {
                throw new \Exception('Search failed');
            }

            $processedCount = $this->processAllPages();

            \Log::info("Total records processed: {$processedCount}");

            return response()->json([
                'message' => 'Data updated successfully',
                'records_processed' => $processedCount
            ]);

        } catch (\Exception $e) {
            \Log::error('Scraping error: ' . $e->getMessage());
            \Log::error($e->getTraceAsString());
            return response()->json([
                'error' => 'Failed to update data',
                'message' => $e->getMessage()
            ], 500);
        } finally {
            if (isset($this->driver)) {
                $this->driver->quit();
            }
        }
    }

    private function checkPageStructure()
    {
        try {
            \Log::info("Waiting for page elements...");
            $this->driver->wait(20, 1000)->until(
                WebDriverExpectedCondition::presenceOfElementLocated(
                    WebDriverBy::cssSelector('input.form-control[placeholder="Perguruan Tinggi"]')
                )
            );

            $pageStructure = $this->driver->executeScript('
                return {
                    hasSearchInput: !!document.querySelector("input.form-control[placeholder=\"Perguruan Tinggi\"]"),
                    hasStrataSelect: !!document.querySelector("select[name=\"strata\"]"),
                    hasDataTable: !!document.querySelector("#table"),
                    hasPagination: !!document.querySelector("#table_paginate")
                };
            ');

            \Log::info("Page structure check:", $pageStructure);

            return $pageStructure['hasSearchInput'] &&
                $pageStructure['hasStrataSelect'] &&
                $pageStructure['hasDataTable'] &&
                $pageStructure['hasPagination'];
        } catch (\Exception $e) {
            \Log::error("Page structure check failed: " . $e->getMessage());
            return false;
        }
    }

    private function performSearch($perguruan_tinggi, $strata)
    {
        try {
            $searchInput = $this->driver->findElement(
                WebDriverBy::cssSelector('input.form-control[placeholder="Perguruan Tinggi"]')
            );
            $strataSelect = $this->driver->findElement(
                WebDriverBy::cssSelector('select[name="strata"]')
            );

            \Log::info("Entering search criteria: PT={$perguruan_tinggi}, Strata={$strata}");

            $searchInput->sendKeys($perguruan_tinggi);
            $strataSelect->findElement(WebDriverBy::cssSelector("option[value='{$strata}']"))->click();

            sleep(10);

            \Log::info("Waiting for table to load...");
            $this->driver->wait(20, 1000)->until(
                WebDriverExpectedCondition::presenceOfElementLocated(
                    WebDriverBy::cssSelector('#table tbody tr')
                )
            );

            sleep(5);
            return true;
        } catch (\Exception $e) {
            \Log::error("Search failed: " . $e->getMessage());
            return false;
        }
    }

    private function processAllPages()
    {
        $processedCount = 0;
        $pageCount = 1;

        \Log::info("Loading jurusans and stratas...");
        $this->loadJurusans();
        $this->loadStratas(); // Tambahkan pemanggilan method untuk memuat data strata

        sleep(10);

        do {
            \Log::info("Processing page {$pageCount}");

            $currentPageData = $this->driver->executeScript('
                    return Array.from(document.querySelectorAll("#table tbody tr")).map(row => 
                        Array.from(row.querySelectorAll("td")).map(cell => cell.textContent.trim())
                    );
                ');

            if (!empty($currentPageData)) {
                $this->processBatch($currentPageData);
                $processedCount += count($currentPageData);
                \Log::info("Processed {$processedCount} records so far");
            }

            try {
                $nextButton = $this->driver->findElement(WebDriverBy::cssSelector('#table_next:not(.disabled)'));
                if (!$nextButton) {
                    \Log::info("No more pages to process");
                    break;
                }
                $nextButton->click();
                sleep(5);
                $pageCount++;
            } catch (\Exception $e) {
                \Log::info("Navigation ended");
                break;
            }
        } while (true);

        return $processedCount;
    }

    private function loadJurusans()
    {
        $this->jurusans = Jurusan::all()->keyBy('name');
        \Log::info('Jurusans loaded: ' . $this->jurusans->count());
    }

    /**
     * Memuat semua data Strata dari database
     */
    private function loadStratas()
    {
        $this->stratas = Strata::all();
        \Log::info('Stratas loaded: ' . $this->stratas->count());
    }

    /**
     * Mendapatkan strataId berdasarkan nama strata dari hasil scraping
     */
    private function getStrataId($strataName)
    {
        $strataName = strtoupper(trim($strataName));

        $strataMapping = [
            'D-III' => 'D-III',
            'D3' => 'D-III',
            'D-IV' => 'D-IV',
            'D4' => 'D-IV',
            'S1' => 'S1',
            'SARJANA' => 'S1',
            'S2' => 'S2',
            'MAGISTER' => 'S2',
            'S3' => 'S3',
            'DOKTOR' => 'S3',
            'Profesi' => 'Profesi',
            'Spesialis' => 'Spesialis'
        ];

        if (array_key_exists($strataName, $strataMapping)) {
            $strataName = $strataMapping[$strataName];
        }

        $strata = $this->stratas->first(function ($strata) use ($strataName) {
            return $strata->name === $strataName;
        });

        if ($strata) {
            \Log::info("Strata found: {$strataName} => {$strata->_id}");
            return $strata->_id;
        }

        \Log::warning("Strata not found: {$strataName}");
        return null;
    }

    private function processBatch(array $rows)
    {
        foreach ($rows as $row) {
            try {
                $prodiName = $row[2] . ' ' . $row[1];
                $strata = $row[2];
                \Log::info("Processing: {$prodiName}");

                $jurusanId = $this->getJurusanId($prodiName);
                \Log::info("Jurusan ID: {$jurusanId}");

                $strataId = $this->getStrataId($strata);
                \Log::info("Strata ID: {$strataId}");

                $skParts = explode('/', $row[4]);
                $lembagaAkreditasi = count($skParts) >= 4 ? $skParts[2] : null;
                \Log::info("Lembaga Akreditasi: {$lembagaAkreditasi}");

                try {
                    $tanggalKedaluwarsa = Carbon::createFromFormat('Y-m-d', $row[7])->setTime(7, 0, 0);
                    \Log::info("Tanggal Kedaluwarsa: {$tanggalKedaluwarsa}");
                } catch (\Exception $e) {
                    \Log::error("Error parsing date for {$prodiName}: {$row[7]}");
                    continue;
                }

                $prodi = Prodi::updateOrCreate(
                    [
                        'name' => $prodiName,
                        'akreditasi.nomorSK' => $row[4]
                    ],
                    [
                        'name' => $prodiName,
                        'jurusanId' => $jurusanId,
                        'strataId' => $strataId,
                        'akreditasi' => [
                            'nomorSK' => $row[4],
                            'tahun' => (int) $row[5],
                            'peringkat' => $row[6],
                            'tanggalKedaluwarsa' => $tanggalKedaluwarsa,
                            'lembagaAkreditasi' => $lembagaAkreditasi
                        ]
                    ]
                );

                \Log::info("Successfully processed: {$prodi->_id} - {$prodiName}");

            } catch (\Exception $e) {
                \Log::error("Error processing prodi {$prodiName}: {$e->getMessage()}");
                \Log::error($e->getTraceAsString());
                continue;
            }
        }
    }

    private function getJurusanId($prodiName)
    {
        $mapping = (new Prodi)->getJurusanKeyword($prodiName);
        return $mapping && $this->jurusans->has($mapping)
            ? $this->jurusans[$mapping]->_id
            : null;
    }
}