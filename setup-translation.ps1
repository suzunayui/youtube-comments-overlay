$ErrorActionPreference = 'Stop'
Set-Location -LiteralPath $PSScriptRoot
if (-not (Test-Path -LiteralPath '.venv/Scripts/python.exe')) {
    py -3.13 -m venv .venv
    if ($LASTEXITCODE -ne 0) { throw 'Python 3.13で仮想環境を作れませんでした。' }
}
& '.venv/Scripts/python.exe' -m pip install -r translation/requirements.txt -r subtitles/requirements.txt -r subtitles/requirements-cuda.txt pyinstaller
if ($LASTEXITCODE -ne 0) { throw '翻訳の依存パッケージをインストールできませんでした。' }
node scripts/prepare-translation-runtime.cjs
if ($LASTEXITCODE -ne 0) { throw '翻訳ランタイムを取得できませんでした。' }
Write-Host '翻訳の準備完了。npm startで起動できます。'
