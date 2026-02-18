param(
  [Parameter(Mandatory = $true)]
  [string]$BaseUrl
)

$ErrorActionPreference = 'Stop'

$targets = @(
  '/',
  '/live-proof/',
  '/the-ghosts/',
  '/the-system/',
  '/vienna-to-every-dojo/',
  '/book/',
  '/admin/',
  '/api/v1/health',
  '/api/v1/health/ready'
)

Write-Host "Monitoring targets for $BaseUrl"

foreach ($path in $targets) {
  $url = "$BaseUrl$path"
  $sw = [System.Diagnostics.Stopwatch]::StartNew()
  try {
    $response = Invoke-WebRequest -Uri $url -Method GET -MaximumRedirection 5 -TimeoutSec 20
    $sw.Stop()
    Write-Host ("{0} | {1} | {2} ms" -f $response.StatusCode, $path, [Math]::Round($sw.Elapsed.TotalMilliseconds, 2))
  } catch {
    $sw.Stop()
    Write-Host ("ERR | {0} | {1} ms | {2}" -f $path, [Math]::Round($sw.Elapsed.TotalMilliseconds, 2), $_.Exception.Message)
  }
}
