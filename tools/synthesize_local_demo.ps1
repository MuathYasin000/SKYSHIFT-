$ErrorActionPreference = 'Stop'
$skyshiftRoot = Split-Path -Parent $PSScriptRoot
$skyshiftScenes = Get-Content -LiteralPath (Join-Path $PSScriptRoot 'local_demo_scenes.json') -Raw | ConvertFrom-Json
$skyshiftAudioFolder = Join-Path $skyshiftRoot 'tmp/local-demo-audio'
New-Item -ItemType Directory -Force -Path $skyshiftAudioFolder | Out-Null
$skyshiftVoice = New-Object -ComObject SAPI.SpVoice
$skyshiftVoice.Rate = -1
foreach ($skyshiftScene in $skyshiftScenes) {
    $skyshiftAudioPath = Join-Path $skyshiftAudioFolder ('scene-' + $skyshiftScene.slide + '.wav')
    $skyshiftStream = New-Object -ComObject SAPI.SpFileStream
    $skyshiftStream.Format.Type = 22
    $skyshiftStream.Open($skyshiftAudioPath, 3, $false)
    $skyshiftVoice.AudioOutputStream = $skyshiftStream
    $skyshiftVoice.Speak($skyshiftScene.narration, 0) | Out-Null
    $skyshiftStream.Close()
}
Write-Output ('Synthesized ' + $skyshiftScenes.Count + ' local release narration scenes using a generic installed Windows voice.')
