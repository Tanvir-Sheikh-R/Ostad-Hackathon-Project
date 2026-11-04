#Requires -Version 5.1
<#
.SYNOPSIS
    Run the Boi Bondhu backend image locally on a host port that is actually free.

.DESCRIPTION
    Publishing a fixed host port is the usual source of pain on Windows:
      * Windows/Hyper-V reserves whole port ranges, and binding inside one fails with
        "An attempt was made to access a socket in a way forbidden by its access
        permissions" (that is what happened with 8123).
      * Other apps grab well-known dev ports (8010 is held by Adobe Premiere's
        TeamProjectsLocalHub on this machine).
    This script walks a candidate list, skips listening ports and netsh-excluded ranges,
    publishes the container's :8000 there, then waits for the container healthcheck.

    Keep this file ASCII-only. Windows PowerShell 5.1 reads a BOM-less .ps1 as ANSI, so a
    stray em-dash becomes a cp1252 quote and breaks the parser.

.PARAMETER Tag
    Image tag that already exists locally.

.PARAMETER PreferPort
    First port to try. Default 8000.

.PARAMETER Name
    Container name. An existing container with this name is replaced.

.EXAMPLE
    powershell -ExecutionPolicy Bypass -File scripts\docker-run.ps1

.EXAMPLE
    powershell -ExecutionPolicy Bypass -File scripts\docker-run.ps1 -Tag v2 -PreferPort 8100
#>
[CmdletBinding()]
param(
    [string]$Tag = 'latest',
    [string]$Repo = 'tanvirsheikh/boibondhu-hackathon-backend',
    [int]$PreferPort = 8000,
    [string]$Name = 'boibondhu-local',
    [int]$TimeoutSeconds = 150
)

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$image = "${Repo}:${Tag}"

function Get-ExcludedTcpRanges {
    # Windows/Hyper-V reservations: binding inside one fails with WSAEACCES.
    $ranges = New-Object System.Collections.ArrayList
    $lines = & netsh int ipv4 show excludedportrange protocol=tcp 2>$null
    foreach ($line in $lines) {
        if ($line -match '^\s*(\d+)\s+(\d+)\s') {
            [void]$ranges.Add([pscustomobject]@{
                Start = [int]$Matches[1]
                End   = [int]$Matches[2]
            })
        }
    }
    return $ranges
}

function Test-PortUsable {
    param([int]$Port, $Excluded)
    foreach ($range in $Excluded) {
        if ($Port -ge $range.Start -and $Port -le $range.End) { return $false }
    }
    $listening = Get-NetTCPConnection -State Listen -LocalPort $Port -ErrorAction SilentlyContinue
    return ($null -eq $listening)
}

function Find-FreePort {
    param([int]$Start, $Excluded)
    $candidates = @($Start) + @(8000..8050) + @(8100..8250) + @(9000..9100)
    foreach ($port in ($candidates | Select-Object -Unique)) {
        if (Test-PortUsable -Port $port -Excluded $Excluded) { return $port }
    }
    throw 'No free TCP port found in the candidate ranges.'
}

Push-Location $root
try {
    Write-Host '== preflight ==' -ForegroundColor Cyan

    & docker info --format '{{.ServerVersion}}' 2>&1 | Out-Null
    if ($LASTEXITCODE -ne 0) { throw 'Docker daemon is not running. Start Docker Desktop and retry.' }

    & docker image inspect $image 2>&1 | Out-Null
    if ($LASTEXITCODE -ne 0) {
        throw "Image $image not found locally. Build it first: scripts\docker-build.ps1 -Tag $Tag"
    }

    $envFile = Join-Path $root '.env'
    $envArgs = @()
    if (Test-Path $envFile) {
        $envArgs = @('--env-file', $envFile)
        Write-Host '  ok: using .env for LLM keys' -ForegroundColor Green
    } else {
        Write-Host '  warn: .env not found - LLM providers will report "no key"' -ForegroundColor Yellow
    }

    $excluded = Get-ExcludedTcpRanges
    if ($excluded.Count -gt 0) {
        $first = $excluded[0]
        Write-Host ("  skip: {0} Windows-reserved TCP range(s), e.g. {1}-{2}" -f $excluded.Count, $first.Start, $first.End) -ForegroundColor DarkGray
    }

    $port = Find-FreePort -Start $PreferPort -Excluded $excluded
    if ($port -ne $PreferPort) {
        Write-Host "  port $PreferPort is busy - using $port instead" -ForegroundColor Yellow
    }

    & docker rm -f $Name 2>&1 | Out-Null

    Write-Host "== run: $image on http://127.0.0.1:$port ==" -ForegroundColor Cyan
    $runArgs = @('run', '-d', '--name', $Name, '-p', "${port}:8000") + $envArgs + @($image)
    & docker @runArgs
    if ($LASTEXITCODE -ne 0) { throw "docker run failed (exit $LASTEXITCODE)." }

    Write-Host '   waiting for the container healthcheck (model load ~25s) ...'
    $healthy = $false
    $probes = [int][Math]::Ceiling($TimeoutSeconds / 3)
    for ($i = 0; $i -lt $probes; $i++) {
        Start-Sleep -Seconds 3
        $status = (& docker inspect --format '{{.State.Health.Status}}' $Name 2>$null | Select-Object -First 1)
        if ($status -eq 'healthy') { $healthy = $true; break }
        if ($status -eq 'unhealthy') { break }
    }

    if ($healthy) {
        $health = curl.exe -s -m 10 --noproxy '*' "http://127.0.0.1:$port/api/health"
        Write-Host ''
        Write-Host "  UP   http://127.0.0.1:$port" -ForegroundColor Green
        Write-Host "       API docs: http://127.0.0.1:$port/api/docs"
        Write-Host "       $health"
    } else {
        Write-Host '  container did not become healthy - last logs:' -ForegroundColor Red
        & docker logs --tail 30 $Name
    }

    Write-Host ''
    Write-Host ("  logs : docker logs -f {0}" -f $Name)
    Write-Host ("  stop : docker rm -f {0}" -f $Name)
} finally {
    Pop-Location
}
