param(
  [Parameter(Mandatory = $true)]
  [string]$StaticSitesService
)

$ErrorActionPreference = 'Stop'

Write-Host 'Deploying static-sites to Railway...'
railway up --service $StaticSitesService --detach --path-as-root .\static-sites

Write-Host 'Railway deployment triggered for static-sites.'
