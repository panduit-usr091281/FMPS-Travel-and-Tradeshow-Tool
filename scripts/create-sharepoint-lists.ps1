<#
.SYNOPSIS
    Creates SharePoint Lists required for the FMPS Coordination Tool.
.DESCRIPTION
    Run this script once to provision all necessary SharePoint Lists on your target site.
    Requires PnP PowerShell module: Install-Module PnP.PowerShell
.PARAMETER SiteUrl
    The SharePoint site URL where lists will be created.
.EXAMPLE
    .\create-sharepoint-lists.ps1 -SiteUrl "https://panduit.sharepoint.com/sites/FMPSCoordination"
#>

param(
    [Parameter(Mandatory = $true)]
    [string]$SiteUrl
)

# Connect to SharePoint
Write-Host "Connecting to SharePoint site: $SiteUrl" -ForegroundColor Cyan
Connect-PnPOnline -Url $SiteUrl -Interactive

# ============================================================
# LIST 1: Events
# ============================================================
Write-Host "Creating 'Events' list..." -ForegroundColor Yellow
$list = New-PnPList -Title "Events" -Template GenericList -ErrorAction SilentlyContinue

Add-PnPField -List "Events" -DisplayName "EventType" -InternalName "EventType" -Type Choice -Choices @(
    "Trade Show", "Trade Show + Partner Booth", "Trade Show + Speaking",
    "Trade Show + Industry Training", "Trade Show + Showcase", "Thought Leadership",
    "Local / Regional Event", "Webinar", "PEC Event", "Partner Onboarding",
    "Panduit ONE Roadshow", "Sales Training", "FMPS Sales Pitch",
    "Consultant Workshop", "Distributer Event", "Customer Visit",
    "Marketing Event", "Installation - Partner Meeting", "Hands-On Demo",
    "PTO - Vacation", "Media - Podcast, Interview", "Tabletop Display + Speaking",
    "Tabletop Display", "Partner Kickoff"
)

Add-PnPField -List "Events" -DisplayName "Theater" -InternalName "Theater" -Type Choice -Choices @(
    "NA", "LATAM", "EMEA", "APAC"
)

Add-PnPField -List "Events" -DisplayName "TradeshowOwner" -InternalName "TradeshowOwner" -Type Text
Add-PnPField -List "Events" -DisplayName "BUOwner" -InternalName "BUOwner" -Type Text
Add-PnPField -List "Events" -DisplayName "TeamMembers" -InternalName "TeamMembers" -Type Note
Add-PnPField -List "Events" -DisplayName "DisplayType" -InternalName "DisplayType" -Type Text

Add-PnPField -List "Events" -DisplayName "Status" -InternalName "Status" -Type Choice -Choices @(
    "Confirmed", "Placeholder", "Cancelled", "Done", "Pending"
)

Add-PnPField -List "Events" -DisplayName "SpeakerDeadline" -InternalName "SpeakerDeadline" -Type DateTime
Add-PnPField -List "Events" -DisplayName "StartDate" -InternalName "StartDate" -Type DateTime
Add-PnPField -List "Events" -DisplayName "EndDate" -InternalName "EndDate" -Type DateTime
Add-PnPField -List "Events" -DisplayName "GraphicsDeadline" -InternalName "GraphicsDeadline" -Type DateTime
Add-PnPField -List "Events" -DisplayName "Budget" -InternalName "Budget" -Type Currency
Add-PnPField -List "Events" -DisplayName "Support" -InternalName "Support" -Type Text
Add-PnPField -List "Events" -DisplayName "TravelDetails" -InternalName "TravelDetails" -Type Note
Add-PnPField -List "Events" -DisplayName "LeadsData" -InternalName "LeadsData" -Type Note
Add-PnPField -List "Events" -DisplayName "ShowNotes" -InternalName "ShowNotes" -Type Note
Add-PnPField -List "Events" -DisplayName "Year" -InternalName "Year" -Type Number
Add-PnPField -List "Events" -DisplayName "BoothSize" -InternalName "BoothSize" -Type Choice -Choices @(
    "10 x 10", "10 x 20", "20 x 20", "20 x 30", "30 x 30",
    "Innovation Area", "Showcase", "Walking Only", "No Booth", "Partner Booth",
    "Counter Show", "6' Table", "Lab"
)
Add-PnPField -List "Events" -DisplayName "BoothProperty" -InternalName "BoothProperty" -Type Note

Write-Host "  Events list created with all fields." -ForegroundColor Green

# ============================================================
# LIST 2: Assets
# ============================================================
Write-Host "Creating 'Assets' list..." -ForegroundColor Yellow
New-PnPList -Title "Assets" -Template GenericList -ErrorAction SilentlyContinue

Add-PnPField -List "Assets" -DisplayName "PartNumber" -InternalName "PartNumber" -Type Text
Add-PnPField -List "Assets" -DisplayName "Category" -InternalName "Category" -Type Choice -Choices @(
    "Mobile Demo", "Full Demo", "Rack Display", "Banner", "Kiosk",
    "Backdrop", "Bannerstand", "Tower", "Pelican Box", "Inline",
    "Hands-on Kit", "4-Post Rack"
)
Add-PnPField -List "Assets" -DisplayName "TotalQuantity" -InternalName "TotalQuantity" -Type Number
Add-PnPField -List "Assets" -DisplayName "Location" -InternalName "Location" -Type Text
Add-PnPField -List "Assets" -DisplayName "Notes" -InternalName "Notes" -Type Note

Write-Host "  Assets list created." -ForegroundColor Green

# ============================================================
# LIST 3: AssetReservations
# ============================================================
Write-Host "Creating 'AssetReservations' list..." -ForegroundColor Yellow
New-PnPList -Title "AssetReservations" -Template GenericList -ErrorAction SilentlyContinue

Add-PnPField -List "AssetReservations" -DisplayName "AssetId" -InternalName "AssetId" -Type Text
Add-PnPField -List "AssetReservations" -DisplayName "EventId" -InternalName "EventId" -Type Text
Add-PnPField -List "AssetReservations" -DisplayName "Quantity" -InternalName "Quantity" -Type Number
Add-PnPField -List "AssetReservations" -DisplayName "StartDate" -InternalName "StartDate" -Type DateTime
Add-PnPField -List "AssetReservations" -DisplayName "EndDate" -InternalName "EndDate" -Type DateTime
Add-PnPField -List "AssetReservations" -DisplayName "ReservedBy" -InternalName "ReservedBy" -Type Text
Add-PnPField -List "AssetReservations" -DisplayName "Status" -InternalName "Status" -Type Choice -Choices @(
    "Reserved", "Checked Out", "Returned", "Cancelled"
)

Write-Host "  AssetReservations list created." -ForegroundColor Green

# ============================================================
# LIST 4: ThoughtLeadership
# ============================================================
Write-Host "Creating 'ThoughtLeadership' list..." -ForegroundColor Yellow
New-PnPList -Title "ThoughtLeadership" -Template GenericList -ErrorAction SilentlyContinue

Add-PnPField -List "ThoughtLeadership" -DisplayName "SubmissionDeadline" -InternalName "SubmissionDeadline" -Type DateTime
Add-PnPField -List "ThoughtLeadership" -DisplayName "EventDateTime" -InternalName "EventDateTime" -Type DateTime
Add-PnPField -List "ThoughtLeadership" -DisplayName "PresentationTitle" -InternalName "PresentationTitle" -Type Text
Add-PnPField -List "ThoughtLeadership" -DisplayName "Speakers" -InternalName "Speakers" -Type Note
Add-PnPField -List "ThoughtLeadership" -DisplayName "TargetAudience" -InternalName "TargetAudience" -Type Note
Add-PnPField -List "ThoughtLeadership" -DisplayName "LearningObjectives" -InternalName "LearningObjectives" -Type Note
Add-PnPField -List "ThoughtLeadership" -DisplayName "Abstract" -InternalName "Abstract" -Type Note
Add-PnPField -List "ThoughtLeadership" -DisplayName "MediaLink" -InternalName "MediaLink" -Type URL
Add-PnPField -List "ThoughtLeadership" -DisplayName "SpeakerBios" -InternalName "SpeakerBios" -Type Note
Add-PnPField -List "ThoughtLeadership" -DisplayName "Status" -InternalName "TLStatus" -Type Choice -Choices @(
    "Draft", "Submitted", "Approved", "Presented"
)

Write-Host "  ThoughtLeadership list created." -ForegroundColor Green

# ============================================================
# LIST 5: DropdownConfig
# ============================================================
Write-Host "Creating 'DropdownConfig' list..." -ForegroundColor Yellow
New-PnPList -Title "DropdownConfig" -Template GenericList -ErrorAction SilentlyContinue

Add-PnPField -List "DropdownConfig" -DisplayName "Category" -InternalName "Category" -Type Choice -Choices @(
    "EventType", "BoothSize", "BoothProperty", "Region", "BUOwner", "DisplayType"
)
Add-PnPField -List "DropdownConfig" -DisplayName "SortOrder" -InternalName "SortOrder" -Type Number
Add-PnPField -List "DropdownConfig" -DisplayName "IsActive" -InternalName "IsActive" -Type Boolean

Write-Host "  DropdownConfig list created." -ForegroundColor Green

# ============================================================
# LIST 6: TeamMembers
# ============================================================
Write-Host "Creating 'TeamMembers' list..." -ForegroundColor Yellow
New-PnPList -Title "TeamMembers" -Template GenericList -ErrorAction SilentlyContinue

Add-PnPField -List "TeamMembers" -DisplayName "Email" -InternalName "Email" -Type Text
Add-PnPField -List "TeamMembers" -DisplayName "Role" -InternalName "Role" -Type Choice -Choices @(
    "TSE", "Manager", "Admin"
)
Add-PnPField -List "TeamMembers" -DisplayName "IsActive" -InternalName "IsActive" -Type Boolean

Write-Host "  TeamMembers list created." -ForegroundColor Green

# ============================================================
# Seed Team Members
# ============================================================
Write-Host "`nSeeding team members..." -ForegroundColor Yellow

$teamMembers = @(
    @{ Title = "Mahmoud"; Email = ""; Role = "TSE"; IsActive = $true },
    @{ Title = "Vince"; Email = ""; Role = "TSE"; IsActive = $true },
    @{ Title = "Chuks"; Email = ""; Role = "TSE"; IsActive = $true },
    @{ Title = "Bob"; Email = ""; Role = "TSE"; IsActive = $true },
    @{ Title = "Deb"; Email = ""; Role = "Manager"; IsActive = $true },
    @{ Title = "Joe"; Email = ""; Role = "TSE"; IsActive = $true },
    @{ Title = "Jeff Yeary"; Email = ""; Role = "TSE"; IsActive = $true },
    @{ Title = "Greg Batcho"; Email = ""; Role = "TSE"; IsActive = $true }
)

foreach ($member in $teamMembers) {
    Add-PnPListItem -List "TeamMembers" -Values $member
}

Write-Host "  Team members seeded." -ForegroundColor Green

# Done
Write-Host "`n✓ All SharePoint lists created successfully!" -ForegroundColor Green
Write-Host "  Site: $SiteUrl" -ForegroundColor Cyan
Write-Host "  Lists: Events, Assets, AssetReservations, ThoughtLeadership, DropdownConfig, TeamMembers" -ForegroundColor Cyan

Disconnect-PnPOnline
