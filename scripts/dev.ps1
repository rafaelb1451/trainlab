#!/usr/bin/env pwsh
# Sobe backend (Spring Boot :8080) e frontend (Vite :5173) juntos, no Windows.
# Equivalente ao scripts/dev.sh (Linux/macOS).
#
# Uso:  .\scripts\dev.ps1
# Saia com Ctrl+C — os dois processos sao encerrados.

$ErrorActionPreference = 'Stop'

$root = Split-Path -Parent $PSScriptRoot

function Fail($msg) {
    Write-Host "ERRO: $msg" -ForegroundColor Red
    exit 1
}

# --- JDK 21 ---------------------------------------------------------------
$javaExe = if ($env:JAVA_HOME) { Join-Path $env:JAVA_HOME 'bin\java.exe' } else { $null }
if (-not $javaExe -or -not (Test-Path $javaExe)) {
    $javaCmd = Get-Command java -ErrorAction SilentlyContinue
    if (-not $javaCmd) { Fail "JDK 21 nao encontrado. Defina JAVA_HOME ou coloque o java no PATH." }
    $javaExe = $javaCmd.Source
}

$version = (& $javaExe -version 2>&1 | Select-Object -First 1)
if ($version -notmatch '"21\.') {
    Write-Host "AVISO: JAVA_HOME aponta para $version (o projeto pede JDK 21)." -ForegroundColor Yellow
}
Write-Host "JDK: $version"

# --- Maven ----------------------------------------------------------------
$mvn = Get-Command mvn -ErrorAction SilentlyContinue
if (-not $mvn) {
    $wrapper = Join-Path $root 'mvnw.cmd'
    if (Test-Path $wrapper) { $mvnPath = $wrapper }
    else { Fail "Maven nao encontrado. Instale o Maven 3.9+ ou adicione o wrapper (mvn wrapper:wrapper)." }
} else {
    $mvnPath = $mvn.Source
}

if (-not (Get-Command node -ErrorAction SilentlyContinue)) { Fail "Node 22+ nao encontrado no PATH." }

if (-not (Test-Path (Join-Path $root 'frontend\node_modules'))) {
    Write-Host "Instalando dependencias do frontend..." -ForegroundColor Cyan
    Push-Location (Join-Path $root 'frontend')
    & npm install
    Pop-Location
}

# --- processos ------------------------------------------------------------
$backend = $null
$frontend = $null

function Stop-All {
    Write-Host "`nEncerrando servicos..." -ForegroundColor Yellow
    foreach ($p in @($backend, $frontend)) {
        if ($p -and -not $p.HasExited) {
            try { Stop-Process -Id $p.Id -Force -ErrorAction SilentlyContinue } catch { }
        }
    }
}

try {
    Write-Host "Backend  -> http://localhost:8080" -ForegroundColor Green
    $env:JAVA_HOME = if ($env:JAVA_HOME) { $env:JAVA_HOME } else { Split-Path -Parent (Split-Path -Parent $javaExe) }
    $backend = Start-Process -FilePath $mvnPath -ArgumentList '-q', 'spring-boot:run', '-Dspring-boot.run.profiles=dev' `
        -WorkingDirectory (Join-Path $root 'backend') -PassThru -NoNewWindow

    # espera a porta 8080 aceitar conexao (ate 120s)
    $ready = $false
    for ($i = 0; $i -lt 120; $i++) {
        if ($backend.HasExited) { Fail "O backend encerrou durante a inicializacao. Veja o log acima." }
        try {
            $client = New-Object System.Net.Sockets.TcpClient
            $client.Connect('127.0.0.1', 8080)
            $client.Close()
            $ready = $true
            break
        } catch { Start-Sleep -Seconds 1 }
    }
    if (-not $ready) { Fail "Backend nao respondeu na porta 8080 em 120s." }
    Write-Host "Backend no ar" -ForegroundColor Green

    Write-Host "Frontend -> http://localhost:5173" -ForegroundColor Green
    $frontend = Start-Process -FilePath 'npm.cmd' -ArgumentList 'run', 'dev', '--', '--host' `
        -WorkingDirectory (Join-Path $root 'frontend') -PassThru -NoNewWindow

    Write-Host "`nCtrl+C para encerrar os dois.`n" -ForegroundColor Cyan
    Wait-Process -Id $backend.Id, $frontend.Id
}
finally {
    Stop-All
}
