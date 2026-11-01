param(
  [string]$InputDocx = "$PSScriptRoot/../output/docx/MakanApp_Backend_Messaging_Policy_FA_20261101.docx",
  [string]$OutputPdf = "$PSScriptRoot/../output/pdf/MakanApp_Backend_Messaging_Policy_FA_20261101.pdf"
)
$ErrorActionPreference = 'Stop'
$sourcePath = (Resolve-Path -LiteralPath $InputDocx).Path
$targetPath = [System.IO.Path]::GetFullPath($OutputPdf)
$word = $null
$document = $null
$hadDocuments = $false
$oldAlerts = $null
try {
  $word = New-Object -ComObject Word.Application
  $hadDocuments = $word.Documents.Count -gt 0
  $oldAlerts = $word.DisplayAlerts
  if (-not $hadDocuments) { $word.Visible = $false }
  $word.DisplayAlerts = 0
  $document = $word.Documents.Open($sourcePath, $false, $true, $false)
  $document.Repaginate()
  $pages = $document.ComputeStatistics(2)
  $document.ExportAsFixedFormat($targetPath, 17)
  $document.Close(0)
  [System.Runtime.InteropServices.Marshal]::FinalReleaseComObject($document) | Out-Null
  $document = $null
  [pscustomobject]@{ pdf=$targetPath; pages=$pages; renderer='Microsoft Word native PDF export' } | ConvertTo-Json -Compress
} finally {
  if ($null -ne $document) { $document.Close(0); [System.Runtime.InteropServices.Marshal]::FinalReleaseComObject($document) | Out-Null }
  if ($null -ne $word) {
    if ($null -ne $oldAlerts) { $word.DisplayAlerts = $oldAlerts }
    if (-not $hadDocuments -and $word.Documents.Count -eq 0) { $word.Quit(0) }
    [System.Runtime.InteropServices.Marshal]::FinalReleaseComObject($word) | Out-Null
  }
}
