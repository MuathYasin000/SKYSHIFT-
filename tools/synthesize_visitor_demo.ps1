$ErrorActionPreference = 'Stop'
$skyshiftRoot = Split-Path -Parent $PSScriptRoot
$skyshiftScenes = Get-Content -LiteralPath (Join-Path $PSScriptRoot 'visitor_demo_scenes.json') -Raw | ConvertFrom-Json
$skyshiftAudioFolder = Join-Path $skyshiftRoot 'tmp/visitor-demo-audio'
New-Item -ItemType Directory -Force -Path $skyshiftAudioFolder | Out-Null
$skyshiftVoice = New-Object -ComObject SAPI.SpVoice
$skyshiftVoice.Rate = 0
foreach ($skyshiftScene in $skyshiftScenes) {
    $skyshiftStream = New-Object -ComObject SAPI.SpFileStream
    $skyshiftStream.Format.Type = 22
    $skyshiftStream.Open((Join-Path $skyshiftAudioFolder ('scene-' + $skyshiftScene.id + '.wav')), 3, $false)
    $skyshiftVoice.AudioOutputStream = $skyshiftStream
    $skyshiftVoice.Speak($skyshiftScene.narration, 0) | Out-Null
    $skyshiftStream.Close()
}
Write-Output ('Synthesized ' + $skyshiftScenes.Count + ' scenes with an installed generic Windows voice.')
