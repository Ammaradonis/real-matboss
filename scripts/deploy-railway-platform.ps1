param(
  [Parameter(Mandatory = $true)]
  [string]$BookingApiService,

  [Parameter(Mandatory = $true)]
  [string]$BookingUiService,

  [Parameter(Mandatory = $true)]
  [string]$AdminDashboardService,

  [Parameter(Mandatory = $true)]
  [string]$StaticSitesService
)

$ErrorActionPreference = 'Stop'

Write-Host 'Deploying booking-api to Railway...'
railway up --service $BookingApiService --detach --path-as-root .\booking-api

Write-Host 'Deploying booking-ui to Railway...'
railway up --service $BookingUiService --detach --path-as-root .\booking-ui

Write-Host 'Deploying admin-dashboard to Railway...'
railway up --service $AdminDashboardService --detach --path-as-root .\admin-dashboard

Write-Host 'Deploying static-sites to Railway...'
railway up --service $StaticSitesService --detach --path-as-root .\static-sites

Write-Host 'Railway deployments triggered for full platform.'
