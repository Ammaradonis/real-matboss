$ErrorActionPreference = 'Stop'

Write-Host 'Building booking-ui...'
npm --prefix .\booking-ui ci
npm --prefix .\booking-ui run build

Write-Host 'Building admin-dashboard...'
npm --prefix .\admin-dashboard ci
npm --prefix .\admin-dashboard run build

Write-Host 'Frontend builds completed.'
