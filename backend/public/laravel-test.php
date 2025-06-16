<?php
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

echo "<h1>Laravel Bootstrap Test (Fixed)</h1>";
echo "<p>PHP Version: " . PHP_VERSION . "</p>";
echo "<p>Time: " . date('Y-m-d H:i:s') . "</p>";

echo "<h2>Step 1: Environment Variables</h2>";
$required_env = ['APP_ENV', 'APP_DEBUG', 'APP_KEY', 'DB_CONNECTION', 'MONGODB_URI', 'MONGODB_DATABASE'];
foreach ($required_env as $key) {
  $value = $_ENV[$key] ?? 'NOT SET';
  $display_value = (strlen($value) > 50) ? substr($value, 0, 30) . '...' : $value;
  echo "<strong>$key:</strong> $display_value<br>";
}

echo "<h2>Step 2: Laravel Full Bootstrap</h2>";
try {
  echo "Loading Composer autoload...<br>";
  require_once '../vendor/autoload.php';
  echo "✅ Autoload successful<br><br>";

  echo "Loading Laravel application...<br>";
  $app = require_once '../bootstrap/app.php';
  echo "✅ Laravel app created: " . get_class($app) . "<br><br>";

  echo "Creating HTTP kernel...<br>";
  $kernel = $app->make('Illuminate\Contracts\Http\Kernel');
  echo "✅ HTTP Kernel: " . get_class($kernel) . "<br><br>";

  echo "Bootstrapping Laravel application...<br>";
  // Create fake request to trigger bootstrap
  $request = Illuminate\Http\Request::create('/', 'GET');
  echo "✅ Request created<br>";

  // This will bootstrap all service providers
  echo "Processing request to bootstrap services...<br>";
  $response = $kernel->handle($request);
  echo "✅ Laravel fully bootstrapped!<br>";
  echo "Response status: " . $response->getStatusCode() . "<br><br>";

  echo "Testing configuration access...<br>";
  $config = $app->make('config');
  echo "✅ Config service working<br>";
  echo "App name: " . $config->get('app.name', 'NONE') . "<br>";
  echo "App env: " . $config->get('app.env', 'NONE') . "<br>";
  echo "Default DB: " . $config->get('database.default', 'NONE') . "<br><br>";

  echo "Testing database configuration...<br>";
  $dbConfig = $config->get('database.connections.' . $config->get('database.default'));
  if ($dbConfig) {
    echo "✅ Database config found<br>";
    echo "Driver: " . ($dbConfig['driver'] ?? 'NONE') . "<br>";
    echo "DSN: " . (isset($dbConfig['dsn']) ? 'SET' : 'NOT SET') . "<br>";
    echo "Database: " . ($dbConfig['database'] ?? 'NONE') . "<br><br>";
  } else {
    echo "❌ Database config missing<br><br>";
  }

  echo "Testing MongoDB connection...<br>";
  $db = $app->make('db');
  $connection = $db->connection();
  echo "✅ DB connection established: " . get_class($connection) . "<br><br>";

  echo "<h2 style='color: green;'>🎉 LARAVEL FULLY WORKING!</h2>";
  echo "<p>All services bootstrapped successfully.</p>";

} catch (Exception $e) {
  echo "<h2 style='color: red;'>❌ ERROR FOUND</h2>";
  echo "<div style='background: #f8f8f8; padding: 10px; border-left: 4px solid red;'>";
  echo "<strong>Error:</strong> " . htmlspecialchars($e->getMessage()) . "<br>";
  echo "<strong>File:</strong> " . htmlspecialchars($e->getFile()) . "<br>";
  echo "<strong>Line:</strong> " . $e->getLine() . "<br>";
  echo "<strong>Class:</strong> " . get_class($e) . "<br>";
  echo "</div>";

  echo "<h3>Stack Trace:</h3>";
  echo "<pre style='background: #f0f0f0; padding: 10px; overflow: auto; max-height: 400px;'>";
  echo htmlspecialchars($e->getTraceAsString());
  echo "</pre>";
}
?>