<?php
// File: public/debug.php
error_reporting(E_ALL);
ini_set('display_errors', 1);

echo "<h1>Debug Information</h1>";
echo "PHP Version: " . PHP_VERSION . "<br>";
echo "Working Directory: " . getcwd() . "<br>";
echo "Time: " . date('Y-m-d H:i:s') . "<br>";

echo "<h2>Environment Variables:</h2>";
$env_vars = ['APP_ENV', 'APP_DEBUG', 'APP_KEY', 'DB_CONNECTION', 'MONGODB_URI', 'MONGODB_DATABASE'];
foreach ($env_vars as $var) {
  echo $var . ": " . ($_ENV[$var] ?? 'NOT SET') . "<br>";
}

echo "<h2>File System:</h2>";
echo "vendor/autoload.php: " . (file_exists('../vendor/autoload.php') ? 'EXISTS' : 'MISSING') . "<br>";
echo "bootstrap/app.php: " . (file_exists('../bootstrap/app.php') ? 'EXISTS' : 'MISSING') . "<br>";

echo "<h2>Testing Laravel Bootstrap:</h2>";
try {
  require_once '../vendor/autoload.php';
  echo "✓ Autoload successful<br>";

  $app = require_once '../bootstrap/app.php';
  echo "✓ Laravel app created: " . get_class($app) . "<br>";

  $kernel = $app->make('Illuminate\Contracts\Http\Kernel');
  echo "✓ Kernel created: " . get_class($kernel) . "<br>";

} catch (Throwable $e) {
  echo "<span style='color:red'>✗ ERROR: " . $e->getMessage() . "</span><br>";
  echo "File: " . $e->getFile() . "<br>";
  echo "Line: " . $e->getLine() . "<br>";
}
?>