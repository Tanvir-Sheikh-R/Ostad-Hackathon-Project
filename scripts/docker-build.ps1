#Requires -Version 5.1
<#
.SYNOPSIS
    Build the Boi Bondhu backend image from the repo root, optionally pushing to Docker Hub.

.DESCRIPTION
    Wraps "docker build -f deploy/Dockerfile.backend" with the checks that are easy to
    get wrong:
      * Docker Desktop must be running.
      * The build context must be the repo root (model_cache/, embedding_cache/,
        chapters.json, chapter_titles_en.json all live there).
      * The flattened model directory must exist - it is git-ignored, so a fresh clone
        does not have it and the build fails deep inside COPY.

    Keep this file ASCII-only. Windows PowerShell 5.1 reads a BOM-less .ps1 as ANSI, so a
    stray em-dash becomes a cp1252 quote and breaks the parser.

.PARAMETER Tag
    Image tag to build. Use a new one (v2, v3, ...) for every release so EC2 can roll back.

.PARAMETER Repo
    Docker Hub repository. Pass '' to build a local-only name.

.PARAMETER Push
    Also push. When Tag is not 'latest', the same image is additionally pushed as
    :latest.

.PARAMETER NoCache
    Rebuild every layer (slow; only when the base image or pip resolution matters).

.EXAMPLE
    powershell -ExecutionPolicy Bypass -File scripts\docker-build.ps1

.EXAMPLE
    powershell -ExecutionPolicy Bypass -File scripts\docker-build.ps1 -Tag v2 -Push
#>
[CmdletBinding()]
param(
    [string]$Tag = 'latest',
    [string]$Repo = 'tanvirsheikh/boibondhu-hackathon-backend',
    [switch]$Push,
    [switch]$NoCache
)

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$image = if ($Repo) { "${Repo}:${Tag}" } else { "boibondhu-hackathon-backend:${Tag}" }

Push-Location $root
try {
    Write-Host '== preflight ==' -ForegroundColor Cyan

    if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
        throw 'docker CLI not found in PATH. Install Docker Desktop.'
    }

    & docker info --format '{{.ServerVersion}}' 2>&1 | Out-Null
    if ($LASTEXITCODE -ne 0) {
        throw 'Docker daemon is not running. Start Docker Desktop, wait for the whale icon, then retry.'
    }

    $required = @(
        'deploy/Dockerfile.backend',
        'requirements.txt',
        'chapters.json',
        'chapter_titles_en.json',
        'model_cache/e5-base/config.json',
        'model_cache/e5-base/model.safetensors',
        'embedding_cache',
        'backend/app.py'
    )
    $missing = @($required | Where-Object { -not (Test-Path (Join-Path $root $_)) })
    if ($missing.Count -gt 0) {
        $list = ($missing -join [Environment]::NewLine + '  ')
        throw ("Missing build inputs under {0}:{1}  {2}{1}" -f $root, [Environment]::NewLine, $list) +
              'model_cache/e5-base/ is git-ignored (~1.1 GB) - restore it before building.'
    }

    Write-Host '  ok: docker running, model cache, corpus and sources present' -ForegroundColor Green

    $buildArgs = @('build', '-f', 'deploy/Dockerfile.backend', '-t', $image)
    if ($NoCache) { $buildArgs += '--no-cache' }
    $buildArgs += '.'

    Write-Host "== build: $image ==" -ForegroundColor Cyan
    $started = Get-Date
    & docker @buildArgs
    if ($LASTEXITCODE -ne 0) { throw "docker build failed (exit $LASTEXITCODE)." }

    $elapsed = [int]((Get-Date) - $started).TotalSeconds
    $size = (& docker images $image --format '{{.Size}}' | Select-Object -First 1)
    Write-Host ("  built {0} ({1}) in {2}s" -f $image, $size, $elapsed) -ForegroundColor Green

    if ($Push) {
        if (-not $Repo) { throw '-Push needs -Repo (a Docker Hub repository name).' }

        Write-Host "== push: $image ==" -ForegroundColor Cyan
        & docker push $image
        if ($LASTEXITCODE -ne 0) { throw "docker push failed (exit $LASTEXITCODE). Log in first: docker login" }

        if ($Tag -ne 'latest') {
            $latestRef = "${Repo}:latest"
            & docker tag $image $latestRef
            Write-Host "== push: $latestRef ==" -ForegroundColor Cyan
            & docker push $latestRef
            if ($LASTEXITCODE -ne 0) { throw "pushing $latestRef failed." }
        }
    }

    Write-Host ''
    Write-Host 'next:' -ForegroundColor Cyan
    Write-Host "  test locally : powershell -ExecutionPolicy Bypass -File scripts\docker-run.ps1 -Tag $Tag"
    if (-not $Push) {
        Write-Host "  publish      : powershell -ExecutionPolicy Bypass -File scripts\docker-build.ps1 -Tag $Tag -Push"
    } else {
        Write-Host '  on EC2       :'
        Write-Host "    BACKEND_IMAGE=$image docker compose -f docker-compose.aws.yml up -d"
        Write-Host '    (and point Vercel API_PROXY_TARGET at http://13.48.12.56:8000)'
    }
} finally {
    Pop-Location
}
