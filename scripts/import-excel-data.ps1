<#
.SYNOPSIS
    Imports data from the existing FMPS Marketing & Tradeshows Excel file into SharePoint Lists.
.DESCRIPTION
    Reads the Excel workbook and migrates events, assets, and thought leadership data
    into the newly created SharePoint Lists.
    Requires: PnP.PowerShell, ImportExcel module
.PARAMETER SiteUrl
    The SharePoint site URL.
.PARAMETER ExcelPath
    Path to the FMPS Marketing & Tradeshows.xlsx file.
.EXAMPLE
    .\import-excel-data.ps1 -SiteUrl "https://panduit.sharepoint.com/sites/FMPSCoordination" -ExcelPath ".\FMPS Marketing & Tradeshows.xlsx"
#>

param(
    [Parameter(Mandatory = $true)]
    [string]$SiteUrl,
    
    [Parameter(Mandatory = $false)]
    [string]$ExcelPath = "..\FMPS Marketing & Tradeshows.xlsx"
)

# Check for required modules
if (-not (Get-Module -ListAvailable -Name ImportExcel)) {
    Write-Host "Installing ImportExcel module..." -ForegroundColor Yellow
    Install-Module ImportExcel -Scope CurrentUser -Force
}

Import-Module ImportExcel

# Connect to SharePoint
Write-Host "Connecting to SharePoint: $SiteUrl" -ForegroundColor Cyan
Connect-PnPOnline -Url $SiteUrl -Interactive

# ============================================================
# Import Assets
# ============================================================
Write-Host "`nImporting Assets..." -ForegroundColor Yellow

$assetData = @(
    @{ Title = "PXTC1ARA"; PartNumber = "PXTC1ARA"; Category = "Mobile Demo"; TotalQuantity = 2 },
    @{ Title = "PXU1AJANNNXX"; PartNumber = "PXU1AJANNNXX"; Category = "Mobile Demo"; TotalQuantity = 3 },
    @{ Title = "PXTM1AF"; PartNumber = "PXTM1AF"; Category = "Mobile Demo"; TotalQuantity = 9 },
    @{ Title = "PXR1AJD"; PartNumber = "PXR1AJD"; Category = "Mobile Demo"; TotalQuantity = 3 },
    @{ Title = "PXUP316AWH-UQ"; PartNumber = "PXUP316AWH-UQ"; Category = "Mobile Demo"; TotalQuantity = 1 },
    @{ Title = "PXT515C19146"; PartNumber = "PXT515C19146"; Category = "Mobile Demo"; TotalQuantity = 3 },
    @{ Title = "Mobile Demo Kit"; PartNumber = "DEMO-MOBILE"; Category = "Mobile Demo"; TotalQuantity = 1 },
    @{ Title = "Rack Display (Modified Full)"; PartNumber = "RACK-FULL"; Category = "Rack Display"; TotalQuantity = 1 },
    @{ Title = "Full Demo Unit"; PartNumber = "DEMO-FULL"; Category = "Full Demo"; TotalQuantity = 1 },
    @{ Title = "Yellow Pelican Box (Dummy)"; PartNumber = "PELICAN-YLW"; Category = "Pelican Box"; TotalQuantity = 1 },
    @{ Title = "FMPS Banner"; PartNumber = "BANNER-FMPS"; Category = "Banner"; TotalQuantity = 1 }
)

foreach ($asset in $assetData) {
    Add-PnPListItem -List "Assets" -Values $asset
    Write-Host "  Added: $($asset.Title)" -ForegroundColor Gray
}

Write-Host "  Assets imported: $($assetData.Count) items" -ForegroundColor Green

# ============================================================
# Import Events from 2025 Sheet
# ============================================================
Write-Host "`nImporting Events from Excel..." -ForegroundColor Yellow

$excel = New-Object -ComObject Excel.Application
$excel.Visible = $false
$wb = $excel.Workbooks.Open((Resolve-Path $ExcelPath).Path)
$ws = $wb.Sheets.Item("Trade Show - Roadshow 25")
$usedRange = $ws.UsedRange
$rowCount = $usedRange.Rows.Count
$importCount = 0

for ($r = 9; $r -le $rowCount; $r++) {
    $eventType = $ws.Cells.Item($r, 1).Text
    $eventName = $ws.Cells.Item($r, 2).Text
    
    if (-not $eventName -or $eventName.Trim() -eq "") { continue }
    
    $theater = $ws.Cells.Item($r, 3).Text
    $tsOwner = $ws.Cells.Item($r, 4).Text
    $buOwner = $ws.Cells.Item($r, 5).Text
    $teamMembers = $ws.Cells.Item($r, 6).Text
    $display = $ws.Cells.Item($r, 7).Text
    $status = $ws.Cells.Item($r, 8).Text
    $travelDetails = $ws.Cells.Item($r, 27).Text
    $showNotes = $ws.Cells.Item($r, 29).Text
    
    # Determine dates from monthly columns (10-21 = Jan-Dec)
    $dateInfo = ""
    for ($m = 10; $m -le 21; $m++) {
        $val = $ws.Cells.Item($r, $m).Text
        if ($val) {
            $monthNum = $m - 9
            $dateInfo = "$monthNum/$val"
            break
        }
    }
    
    $values = @{
        Title = $eventName.Substring(0, [Math]::Min($eventName.Length, 255))
        EventType = if ($eventType) { $eventType } else { "Trade Show" }
        Theater = if ($theater) { $theater } else { "NA" }
        TradeshowOwner = $tsOwner
        BUOwner = $buOwner
        TeamMembers = $teamMembers
        DisplayType = $display
        Status = if ($status -in @("Confirmed", "Placeholder", "Cancelled", "Done", "Pending")) { $status } else { "Pending" }
        TravelDetails = $travelDetails
        ShowNotes = $showNotes
        Year = 2025
    }
    
    try {
        Add-PnPListItem -List "Events" -Values $values
        $importCount++
        Write-Host "  [$importCount] $($values.Title.Substring(0, [Math]::Min(60, $values.Title.Length)))..." -ForegroundColor Gray
    }
    catch {
        Write-Host "  SKIP: $($values.Title.Substring(0, [Math]::Min(40, $values.Title.Length))) - $($_.Exception.Message)" -ForegroundColor Red
    }
}

$excel.Quit()
[System.Runtime.Interopservices.Marshal]::ReleaseComObject($excel) | Out-Null

Write-Host "  Events imported: $importCount items" -ForegroundColor Green

# ============================================================
# Import Thought Leadership
# ============================================================
Write-Host "`nImporting Thought Leadership entries..." -ForegroundColor Yellow

$excel = New-Object -ComObject Excel.Application
$excel.Visible = $false
$wb = $excel.Workbooks.Open((Resolve-Path $ExcelPath).Path)
$ws = $wb.Sheets.Item("Thought Leadership")
$usedRange = $ws.UsedRange
$rowCount = $usedRange.Rows.Count
$tlCount = 0

for ($r = 2; $r -le $rowCount; $r++) {
    $eventName = $ws.Cells.Item($r, 1).Text
    $title = $ws.Cells.Item($r, 4).Text
    
    if (-not $eventName -or $eventName.Trim() -eq "") { continue }
    if (-not $title -or $title.Trim() -eq "") { continue }
    
    $values = @{
        Title = $eventName.Substring(0, [Math]::Min($eventName.Length, 255))
        PresentationTitle = $title.Substring(0, [Math]::Min($title.Length, 255))
        Speakers = $ws.Cells.Item($r, 5).Text
        TargetAudience = $ws.Cells.Item($r, 6).Text
        LearningObjectives = $ws.Cells.Item($r, 7).Text
        Abstract = $ws.Cells.Item($r, 8).Text
        SpeakerBios = $ws.Cells.Item($r, 10).Text
        TLStatus = "Submitted"
    }
    
    try {
        Add-PnPListItem -List "ThoughtLeadership" -Values $values
        $tlCount++
        Write-Host "  [$tlCount] $($values.Title)" -ForegroundColor Gray
    }
    catch {
        Write-Host "  SKIP: $($values.Title) - $($_.Exception.Message)" -ForegroundColor Red
    }
}

$excel.Quit()
[System.Runtime.Interopservices.Marshal]::ReleaseComObject($excel) | Out-Null

Write-Host "  Thought Leadership imported: $tlCount items" -ForegroundColor Green

# ============================================================
# Summary
# ============================================================
Write-Host "`n============================================" -ForegroundColor Cyan
Write-Host "  IMPORT COMPLETE" -ForegroundColor Green
Write-Host "  Assets:            $($assetData.Count)" -ForegroundColor White
Write-Host "  Events:            $importCount" -ForegroundColor White
Write-Host "  Thought Leadership: $tlCount" -ForegroundColor White
Write-Host "============================================" -ForegroundColor Cyan

Disconnect-PnPOnline
