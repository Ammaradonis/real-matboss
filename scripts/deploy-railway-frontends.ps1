param(
  [Parameter(Mandatory = $true)]
  [string]$BookingUiService,

  [Parameter(Mandatory = $true)]
  [string]$AdminDashboardService
)

$ErrorActionPreference = 'Stop'

# Requires Railway CLI to be installed and authenticated.
Write-Host 'Deploying booking-ui to Railway...'
railway up --service $BookingUiService --detach --path-as-root .\booking-ui

Write-Host 'Deploying admin-dashboard to Railway...'
railway up --service $AdminDashboardService --detach --path-as-root .\admin-dashboard

Write-Host 'Railway deployments triggered.'
