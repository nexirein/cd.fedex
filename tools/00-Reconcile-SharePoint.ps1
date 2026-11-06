<#
.SYNOPSIS
  Clearance Desk - Phase 0 : reconcile the SharePoint lists with doc 38 §4, then seed demo data.

.DESCRIPTION
  The provisioned CD_* lists were created from an earlier draft. The pre-alert sending
  engine cannot be built on them as-is, because the fields it must read do not exist:

    CD_Shipment   23 of 45 spec columns  -> missing ContactEmail, ClearanceType, Broker,
                                          Pipeline, Batch, Status, SendState, TemplateName,
                                          LinkToken, ClaimedBy, Location, ...
    CD_Batch      11 of 17               -> missing Pipeline, Status, SourceFile, UploadedBy
    CD_Case        8 of 15               -> missing AWB, CaseType, Priority, Status, ...
    CD_Message    10 of 17               -> missing Direction, ToEmail, AWB, Path, ...
    CD_ShipmentEvent 3 of  9            -> missing AWB, EventType, Actor
    CD_Task        7 of 11               -> missing Status/CallStatus, TaskType, Owner
    CD_Participant 5 of 10              -> missing Email, Role, Phone, AWB
    CD_AIDecision  5 of  9              -> missing AWB, Path, RiskFlag, MessageRef
    CD_AISummary   5 of  8              -> missing AWB, Pipeline, RiskLevel
    CD_Metric      5 of  8              -> missing Batch, Pipeline, MetricName
    CD_Template    6 of  8              -> missing ClearanceType, Broker
    CD_Broker      3 of  5              -> missing BrokerCode, BrokerName
    CD_Attachment  3 of 11              -> missing AWB, FileName, FileId, MatchQuality ...
    CD_Document    5 of  9              -> missing AWB, DocType, MatchNote, Source

  This script is ADD-ONLY. It never deletes, never edits and never overwrites an
  existing column or list item. It is safe to run repeatedly.

  Default behaviour is a PLAN (dry run). Pass -Apply to actually make changes.

.PARAMETER SiteUrl
  The SharePoint site holding the CD_* lists.

.PARAMETER Apply
  Perform the changes. Without it, only a plan is printed.

.PARAMETER SkipSeed
  Reconcile columns only; do not seed settings, templates and demo rows.

.EXAMPLE
  pwsh -c "Install-Module PnP.PowerShell -Scope CurrentUser -Force"
  pwsh -File ./00-Reconcile-SharePoint.ps1
  pwsh -File ./00-Reconcile-SharePoint.ps1 -Apply
#>
[CmdletBinding()]
param(
  [string]$SiteUrl = 'https://myfedex.sharepoint.com/sites/ClearanceDeskDemo',
  [switch]$Apply,
  [switch]$SkipSeed
)

$ErrorActionPreference = 'Stop'
$script:Changes = [System.Collections.Generic.List[string]]::new()
$script:Created = [System.Collections.Generic.List[string]]::new()

function Write-Step  ($m) { Write-Host "`n==> $m" -ForegroundColor Cyan }
function Write-Ok    ($m) { Write-Host "    [ok]   $m" -ForegroundColor Green }
function Write-Skip  ($m) { Write-Host "    [skip] $m" -ForegroundColor DarkGray }
function Write-New   ($m) { Write-Host "    [add]  $m" -ForegroundColor Yellow }
function Write-Update ($m) { Write-Host "    [upd]  $m" -ForegroundColor Magenta }
function Write-Todo   ($m) { Write-Host "    [TODO] $m" -ForegroundColor Yellow }

# ---------------------------------------------------------------- connect
Write-Step "Connecting to $SiteUrl"
# PnP.PowerShell 3.x requires ClientId; try to reuse existing connection first
try {
    $ctx = Get-PnPContext -ErrorAction SilentlyContinue
    if ($ctx) {
        Write-Ok "using existing connection"
    } else {
        throw "no existing connection"
    }
} catch {
    try {
        Connect-PnPOnline -Url $SiteUrl -Interactive -ClientId "31359c7f-bd7e-475c-86db-fdb8c937548e" -ErrorAction Stop
        Write-Ok "connected"
    } catch {
        try {
            Connect-PnPOnline -Url $SiteUrl -Interactive -ClientId "1b7334b4-58cd-46c5-8087-0b545440e92d" -ErrorAction Stop
            Write-Ok "connected"
        } catch {
            try {
                Connect-PnPOnline -Url $SiteUrl -Interactive -ErrorAction Stop
                Write-Ok "connected"
            } catch {
                Write-Host "Connection failed: $($_.Exception.Message)" -ForegroundColor Red
                Write-Host "In a separate PowerShell window, run:" -ForegroundColor Yellow
                Write-Host "  Connect-PnPOnline -Url '$SiteUrl' -Interactive -ClientId '<your-app-client-id>'" -ForegroundColor Yellow
                Write-Host "Then re-run this script in the same session." -ForegroundColor Yellow
                exit 1
            }
        }
    }
}

# ---------------------------------------------------------------- helpers
function Get-ListSafe([string]$name) {
    try { return Get-PnPList -Identity $name -ErrorAction Stop } catch { return $null }
}

$TypeMap = @{ Text = 1; Memo = 2; Number = 3; Currency = 4; DateTime = 5; Boolean = 6; Choice = 7; MultiChoice = 8 }

function Ensure-Field {
    param(
        [Parameter(Mandatory)][object]$List,
        [Parameter(Mandatory)][string]$Name,
        [Parameter(Mandatory)][ValidateSet('Text','Memo','Number','Currency','DateTime','Boolean','Choice','MultiChoice')][string]$Type,
        [string[]]$Choices = @(),
        [string]$Default = ''
    )
    $existing = Get-PnPField -List $List -Identity $Name -ErrorAction SilentlyContinue
    if ($existing) { Write-Skip "$($List.Title).$Name"; return }

    $params = @{
        List          = $List
        DisplayName   = $Name
        InternalName  = $Name
        Type          = $TypeMap[$Type]
        AddToDefaultView = $true
    }
    if ($Type -eq 'Choice' -or $Type -eq 'MultiChoice') {
        if ($Choices.Count -eq 0) { throw "Choice field $Name needs choices" }
        $params['Choices'] = $Choices
        if ($Default -and ($Choices -contains $Default)) { $params['DefaultValue'] = $Default }
    }
    if ($Apply) {
        Add-PnPField @params | Out-Null
        Write-New "$($List.Title).$Name ($Type)"
        $script:Changes.Add("field $($List.Title).$Name")
    } else {
        Write-Todo "would add $($List.Title).$Name ($Type)"
        $script:Changes.Add("field $($List.Title).$Name")
    }
}

function Ensure-ListItem {
    param(
        [Parameter(Mandatory)][object]$List,
        [Parameter(Mandatory)][string]$Title,
        [Parameter(Mandatory)][hashtable]$Values,
        [switch]$Force
    )
    $existing = Get-PnPListItem -List $List -Filter "Title eq '$Title'" -ErrorAction SilentlyContinue
    $v = @{ Title = $Title }
    foreach ($k in $Values.Keys) { $v[$k] = $Values[$k] }
    if ($existing) {
        if (-not $Force) { Write-Skip "$($List.Title) / '$Title'"; return }
        if ($Apply) {
            Set-PnPListItem -List $List -ItemId $existing.Id -Values $v | Out-Null
            Write-Update "$($List.Title) / '$Title'"
        } else {
            Write-Todo "would update $($List.Title) / '$Title'"
        }
        return
    }
    if ($Apply) {
        Add-PnPListItem -List $List -Values $v | Out-Null
        Write-New "$($List.Title) / '$Title'"
        $script:Created.Add("$($List.Title)/$Title")
    } else {
        Write-Todo "would add $($List.Title) / '$Title'"
        $script:Created.Add("$($List.Title)/$Title")
    }
}

# ---------------------------------------------------------------- field plan
$FieldPlan = @{
  'CD_Batch' = @(
    @{ Name='Pipeline';      Type='Choice'; Choices=@('UBOND','CONSOL','TPHOLD'); Default='UBOND' },
    @{ Name='SourceFile';    Type='Text' },
    @{ Name='SourceMailId';  Type='Text' },
    @{ Name='UploadedBy';    Type='Text' },
    @{ Name='Status';        Type='Text' },
    @{ Name='Notes';         Type='Memo' }
  )
  'CD_Shipment' = @(
    @{ Name='Batch';         Type='Text' },
    @{ Name='Pipeline';      Type='Choice'; Choices=@('UBOND','CONSOL','TPHOLD'); Default='UBOND' },
    @{ Name='Company';       Type='Text' },
    @{ Name='ContactEmail';  Type='Text' },
    @{ Name='ConsigneeName'; Type='Text' },
    @{ Name='Broker';        Type='Choice'; Choices=@('JEENA','SUNIMPEX','OWN'); Default='JEENA' },
    @{ Name='ClearanceType'; Type='Choice'; Choices=@('NFBRK','FEBRK-JEENA','FEBRK-SUNIMPEX','CALLING','HOLD','UNRESOLVED'); Default='NFBRK' },
    @{ Name='TemplateName';  Type='Text' },
    @{ Name='MAWB';          Type='Text' },
    @{ Name='IGMNumber';     Type='Text' },
    @{ Name='Flight';        Type='Text' },
    @{ Name='Origin';        Type='Text' },
    @{ Name='Destination';   Type='Text' },
    @{ Name='HSN';           Type='Text' },
    @{ Name='Currency';      Type='Text' },
    @{ Name='FeeTier';       Type='Choice'; Choices=@('ARRIVAL_DAY','NEXT_DAY_ONWARD'); Default='ARRIVAL_DAY' },
    @{ Name='Status';        Type='Text' },
    @{ Name='SendState';     Type='Text' },
    @{ Name='LinkToken';     Type='Text' },
    @{ Name='ClaimedBy';     Type='Text' },
    @{ Name='Location';      Type='Text' },
    @{ Name='InstructionCD'; Type='Text' },
    @{ Name='PrimaryCEP';    Type='Text' },
    @{ Name='ADCode';        Type='Text' }
  )
  'CD_Case' = @(
    @{ Name='AWB';             Type='Text' },
    @{ Name='Batch';           Type='Text' },
    @{ Name='CaseType';        Type='Choice'; Choices=@('NEEDS_REVIEW','ESCALATED_REPLY','REJECTED_ROW','CONSOL_UNSURE','CONSOL_ORPHAN','PAYMENT_MISMATCH','FLOW_ERROR','CALL_TASK'); Default='NEEDS_REVIEW' },
    @{ Name='Priority';        Type='Choice'; Choices=@('P1','P2','P3'); Default='P2' },
    @{ Name='Status';          Type='Choice'; Choices=@('OPEN','CLAIMED','RESOLVED','DISMISSED'); Default='OPEN' },
    @{ Name='ClaimedBy';       Type='Text' },
    @{ Name='ResolvedBy';      Type='Text' },
    @{ Name='SourceMessageId'; Type='Text' }
  )
  'CD_Message' = @(
    @{ Name='AWB';           Type='Text' },
    @{ Name='Batch';         Type='Text' },
    @{ Name='Direction';     Type='Choice'; Choices=@('INBOUND','OUTBOUND'); Default='OUTBOUND' },
    @{ Name='Channel';       Type='Choice'; Choices=@('EMAIL','PORTAL'); Default='EMAIL' },
    @{ Name='FromEmail';     Type='Text' },
    @{ Name='ToEmail';       Type='Text' },
    @{ Name='MatchedBy';     Type='Choice'; Choices=@('THREAD','CASE_REF','AWB_SENDER','FUZZY','UNMATCHED'); Default='THREAD' },
    @{ Name='Classification';Type='Text' },
    @{ Name='Path';          Type='Choice'; Choices=@('AUTO','DRAFT','ESCALATE','IGNORE'); Default='AUTO' },
    @{ Name='RiskFlag';      Type='Text' }
  )
  'CD_ShipmentEvent' = @(
    @{ Name='AWB';        Type='Text' },
    @{ Name='EventType';  Type='Text' },
    @{ Name='Actor';      Type='Text' },
    @{ Name='Batch';      Type='Text' },
    @{ Name='FromStatus'; Type='Text' },
    @{ Name='ToStatus';   Type='Text' }
  )
  'CD_AIDecision' = @(
    @{ Name='AWB';               Type='Text' },
    @{ Name='MessageRef';        Type='Text' },
    @{ Name='Path';              Type='Choice'; Choices=@('AUTO','DRAFT','ESCALATE','IGNORE'); Default='AUTO' },
    @{ Name='RiskFlag';          Type='Text' },
    @{ Name='ClassifierVersion'; Type='Text' }
  )
  'CD_AISummary' = @(
    @{ Name='AWB';          Type='Text' },
    @{ Name='Pipeline';     Type='Choice'; Choices=@('UBOND','CONSOL'); Default='UBOND' },
    @{ Name='RiskLevel';    Type='Choice'; Choices=@('NONE','LOW','MEDIUM','HIGH'); Default='NONE' },
    @{ Name='ModelVersion'; Type='Text' }
  )
  'CD_Metric' = @(
    @{ Name='Batch';      Type='Text' },
    @{ Name='Pipeline';   Type='Choice'; Choices=@('UBOND','CONSOL'); Default='UBOND' },
    @{ Name='MetricName'; Type='Text' }
  )
  'CD_Task' = @(
    @{ Name='AWB';       Type='Text' },
    @{ Name='TaskType';  Type='Choice'; Choices=@('CALL','CHASE','REVIEW','DO'); Default='CALL' },
    @{ Name='Owner';     Type='Text' },
    @{ Name='Status';    Type='Choice'; Choices=@('TO_CALL','IN_PROGRESS','CONFIRMED','CALLBACK','UNREACHABLE','CLOSED'); Default='TO_CALL' },
    @{ Name='CallStatus';Type='Text' },
    @{ Name='Priority';  Type='Choice'; Choices=@('P1','P2','P3'); Default='P2' }
  )
  'CD_Participant' = @(
    @{ Name='AWB';   Type='Text' },
    @{ Name='Role';  Type='Choice'; Choices=@('CUSTOMER','IGM','CHA','BROKER','FEDEX'); Default='CUSTOMER' },
    @{ Name='Name';  Type='Text' },
    @{ Name='Email'; Type='Text' },
    @{ Name='Phone'; Type='Text' }
  )
  'CD_Template' = @(
    @{ Name='ClearanceType'; Type='Text' },
    @{ Name='Broker';        Type='Text' }
  )
  'CD_Broker' = @(
    @{ Name='BrokerCode'; Type='Text' },
    @{ Name='BrokerName'; Type='Text' }
  )
  'CD_Attachment' = @(
    @{ Name='AWB';             Type='Text' },
    @{ Name='FileName';        Type='Text' },
    @{ Name='FileId';          Type='Text' },
    @{ Name='OriginalFormat';  Type='Text' },
    @{ Name='ConvertedFormat'; Type='Text' },
    @{ Name='ConvertedFileId'; Type='Text' },
    @{ Name='MatchQuality';    Type='Choice'; Choices=@('EXACT','FUZZY','NONE'); Default='EXACT' },
    @{ Name='ConvertStatus';   Type='Text' }
  )
  'CD_Document' = @(
    @{ Name='AWB';      Type='Text' },
    @{ Name='DocType';  Type='Text' },
    @{ Name='MatchNote';Type='Text' },
    @{ Name='Source';   Type='Text' }
  )
  'CD_Setting' = @(
    @{ Name='ValueType'; Type='Text' }
  )
}

# ---------------------------------------------------------------- reconcile
Write-Step "Reconciling columns with doc 38 section 4"
foreach ($listName in ($FieldPlan.Keys | Sort-Object)) {
    $list = Get-ListSafe $listName
    if (-not $list) {
        Write-Host "    [!!] list '$listName' not found on the site - skipped" -ForegroundColor Red
        continue
    }
    Write-Host "  $($list.Title)" -ForegroundColor White
    foreach ($f in $FieldPlan[$listName]) {
        Ensure-Field -List $list -Name $f.Name -Type $f.Type -Choices $f.Choices -Default $f.Default
    }
}

# --- Columns that must hold more than 255 characters.
# Single-line text caps at 255; a real email body or a source row does not fit.
# The app writes a shortened body while these are still single-line, so the
# seed below is an upsert (-Force) and always replaces it with the full body.
foreach ($spec in @(
    @{ List='CD_Shipment';   Field='RawJSON' },
    @{ List='CD_Template';   Field='BodyContent' },
    @{ List='CD_Case';       Field='Reason' }
)) {
    $tgt = Get-ListSafe $spec.List
    if (-not $tgt) { continue }
    $fld = Get-PnPField -List $tgt -Identity $spec.Field -ErrorAction SilentlyContinue
    if ($fld -and $fld.TypeAsString -eq 'SingleLineText') {
        if ($Apply) {
            Set-PnPField -List $tgt -Identity $spec.Field -Type 2 | Out-Null
            Write-Update "$($spec.List).$($spec.Field) -> multi-line text"
            $script:Changes.Add("field $($spec.List).$($spec.Field) -> multiline")
        } else {
            Write-Todo "would convert $($spec.List).$($spec.Field) to multi-line text"
            $script:Changes.Add("field $($spec.List).$($spec.Field) -> multiline")
        }
    } elseif ($fld) {
        Write-Skip "$($spec.List).$($spec.Field) already $($fld.TypeAsString)"
    }
}

# ---------------------------------------------------------------- seed
if (-not $SkipSeed) {
    Write-Step "Seeding configuration and demo rows"

    # --- CD_Setting : doc 38 section 4.13 seed + the Phase 0 send switches
    $settingList = Get-ListSafe 'CD_Setting'
    $settings = [ordered]@{
        'CD_TestMode'                    = @{ v='Yes';    d='Master inert switch' }
        'aiEnabled'                      = @{ v='Yes';    d='AI classification enabled' }
        'autoSendEnabled'                = @{ v='No';     d='Master send switch - test mode forces this off' }
        'followupEnabled'                = @{ v='No';     d='Automatic reminder follow-ups' }
        'callAiEnabled'                  = @{ v='No';     d='Call AI assist' }
        'FeeArrivalDay'                  = @{ v='2600';   d='Base fee, arrival day, excl GST' }
        'FeeNextDay'                     = @{ v='3600';   d='Base fee, next day onward, excl GST' }
        'GSTPercent'                     = @{ v='18';     d='GST percentage' }
        'GSTArrivalDay'                  = @{ v='468';    d='2600 x 0.18' }
        'GSTNextDay'                     = @{ v='648';    d='3600 x 0.18' }
        'FeeTotalArrivalDay'             = @{ v='3068';   d='2600 + 468' }
        'FeeTotalNextDay'                = @{ v='4248';   d='3600 + 648' }
        'ReminderMaxCount'               = @{ v='3';      d='Maximum reminders per case' }
        'Reminder1Hours'                 = @{ v='4';      d='T+4h' }
        'Reminder2Hours'                 = @{ v='8';      d='T+8h' }
        'DraftMinConfidence'             = @{ v='0.7';    d='Below this, a reply is drafted not auto-handled' }
        'AutoSendRoutineMinConfidence'   = @{ v='0.7';    d='Routine auto-send floor' }
        'AutoSendStrictMinConfidence'    = @{ v='0.97';   d='Strict auto-send floor' }
        'SubBatchSize'                   = @{ v='25';     d='Send sub-batch size' }
        'LinkExpiryDays'                 = @{ v='7';      d='Customer link lifetime' }
        'PipelineA'                      = @{ v='UBOND';  d='Pipeline A code' }
        'PipelineB'                      = @{ v='CONSOL'; d='Pipeline B code' }
        'ClassifierVersion'              = @{ v='v1.0.0'; d='Reply classifier version' }
        'sendTestAllowlist'               = @{ v='bipul.sikder@fedex.com'; d='TEST MODE allow-list, semicolon separated. Only these recipients receive mail. Every other row is SKIPPED, never redirected.' }
        'sendSenderAddress'               = @{ v='';       d='Sender mailbox. Empty = the signed-in maker mailbox.' }
        'preflightStrict'                = @{ v='true';   d='Fail the whole send when any row is blocked' }
    }
    if ($settingList) {
        foreach ($k in $settings.Keys) {
            Ensure-ListItem -List $settingList -Title $k -Values @{
                SettingValue = $settings[$k].v
                Description  = $settings[$k].d
                ValueType    = 'Text'
                IsSecret     = $false
            }
        }
    }

    # --- CD_Broker
    $brokerList = Get-ListSafe 'CD_Broker'
    if ($brokerList) {
        Ensure-ListItem -List $brokerList -Title 'JEENA' -Values @{ BrokerCode='JEENA'; BrokerName='Jeena Logistics'; Rules='FEBRK default filer'; Active=$true }
        Ensure-ListItem -List $brokerList -Title 'SUNIMPEX' -Values @{ BrokerCode='SUNIMPEX'; BrokerName='Sunimpex'; Rules='FEBRK alternate filer'; Active=$true }
        Ensure-ListItem -List $brokerList -Title 'OWN' -Values @{ BrokerCode='OWN'; BrokerName="Customer's own CHA"; Rules='Customer appointed their own CHA'; Active=$true }
    }

    # --- CD_Template : doc 38 section 4.7. Jeena body must say Jeena (bug C11).
    $jeenaCC = 'del-fedex.imports@jeena.co.in; madhikari@jeena.co.in; syogesh@jeena.co.in; adtaneja@jeena.co.in; sdutt@jeena.co.in; vjain1@jeena.co.in; ssingh@jeena.co.in; aanand1@jeena.co.in; kbihari@jeena.co.in; iphvdelcargo@corp.ds.fedex.com'
    $tplList = Get-ListSafe 'CD_Template'
    if ($tplList) {
        $nfbrkBody = @'
<p>Dear <b>{CONSIGNEE_NAME}</b>,</p>
<p>We are arranging customs clearance for your shipment.</p>
<p>AWB NUMBER: <b>{AWB}</b><br/>FREIGHT: <b>{FREIGHT} {CURRENCY}</b><br/>DESTINATION: <b>{LOCATION}</b></p>
<p>Please complete the clearance package below and upload the documents listed in the checklist.</p>
<p>Documents not received before the BOE filing window will attract a penalty of Rs. 10,000 per day.</p>
<p>Regards,<br/>FedEx Cargo Clearance Desk</p>
'@
        $jeenaBody = $nfbrkBody -replace 'Documents not received', 'Documents not received'
        $jeenaBody = @"
<p>Dear <b>{CONSIGNEE_NAME}</b>,</p>
<p>Jeena Logistics has been appointed by FedEx to file the Bill of Entry for your shipment.</p>
<p>AWB NUMBER: <b>{AWB}</b><br/>FREIGHT: <b>{FREIGHT} {CURRENCY}</b><br/>DESTINATION: <b>{LOCATION}</b></p>
<p>Please complete the clearance package below and upload the documents listed in the checklist.</p>
<p>Documents not received before the BOE filing window will attract a penalty of Rs. 10,000 per day.</p>
<p>Regards,<br/>FedEx Cargo Clearance Desk</p>
"@
        $sunimpexBody = @"
<p>Dear <b>{CONSIGNEE_NAME}</b>,</p>
<p>Sunimpex has been appointed by FedEx to file the Bill of Entry for your shipment.</p>
<p>AWB NUMBER: <b>{AWB}</b><br/>FREIGHT: <b>{FREIGHT} {CURRENCY}</b><br/>DESTINATION: <b>{LOCATION}</b></p>
<p>Please complete the clearance package below and upload the documents listed in the checklist.</p>
<p>Documents not received before the BOE filing window will attract a penalty of Rs. 10,000 per day.</p>
<p>Regards,<br/>FedEx Cargo Clearance Desk</p>
"@
        Ensure-ListItem -List $tplList -Title 'NFBRK' -Force -Values @{
            SubjectPattern    = 'Pre Alert - {AWB} / {CONSIGNEE_NAME}'
            BodyContent       = $nfbrkBody
            CCEmails          = ''
            Broker            = ''
            ClearanceType     = 'NFBRK'
            SubjectTagEnabled = $true
            Active            = $true
        }
        Ensure-ListItem -List $tplList -Title 'FEBRK-JEENA' -Force -Values @{
            SubjectPattern    = 'CARGO ARRIVAL NOTICE- Pre Alert AWB and freight charges : {AWB} {CONSIGNEE_NAME} {FREIGHT}_{CURRENCY} | FEBRK-DDP'
            BodyContent       = $jeenaBody
            CCEmails          = $jeenaCC
            Broker            = 'JEENA'
            ClearanceType     = 'FEBRK-JEENA'
            SubjectTagEnabled = $true
            Active            = $true
        }
        Ensure-ListItem -List $tplList -Title 'FEBRK-SUNIMPEX' -Force -Values @{
            SubjectPattern    = 'CARGO ARRIVAL NOTICE- Pre Alert AWB and freight charges : {AWB} {CONSIGNEE_NAME} {FREIGHT}_{CURRENCY} | FEBRK-DDU'
            BodyContent       = $sunimpexBody
            CCEmails          = ''
            Broker            = 'SUNIMPEX'
            ClearanceType     = 'FEBRK-SUNIMPEX'
            SubjectTagEnabled = $true
            Active            = $true
        }
    }

    # --- CD_DocumentType : the customer checklist
    $dtList = Get-ListSafe 'CD_DocumentType'
    if ($dtList) {
        $docTypes = @(
            @{ t='Commercial invoice';  m=$true;  c=$true;  b=$true;  s=1 }
            @{ t='IEC / GST';            m=$true;  c=$true;  b=$true;  s=2 }
            @{ t='Bank AD code';         m=$true;  c=$true;  b=$true;  s=3 }
            @{ t='e-way bill';           m=$true;  c=$true;  b=$true;  s=4 }
            @{ t='Auth letter';          m=$true;  c=$true;  b=$true;  s=5 }
            @{ t='Technical writeup';   m=$false; c=$true;  b=$true;  s=6 }
        )
        foreach ($d in $docTypes) {
            Ensure-ListItem -List $dtList -Title $d.t -Values @{
                Mandatory=$d.m; CustomerVisible=$d.c; BlocksCha=$d.b; PreTicked=$false; SortOrder=$d.s
                Condition = $(if ($d.t -eq 'Technical writeup') { 'Required when goods are not of standard grade' } else { '' })
            }
        }
    }

    # --- CD_Batch : two batches so both pipelines are visible
    $batchList = Get-ListSafe 'CD_Batch'
    $now = Get-Date
    if ($batchList) {
        Ensure-ListItem -List $batchList -Title 'BATCH-20261022-0930-UBOND' -Values @{
            Pipeline='UBOND'; SourceFile='UBOND_20261022_0930.xlsx'; UploadedBy='bipul.sikder@fedex.com'
            UploadedAt=$now; RowCountIn=6; AcceptedCount=4; RejectedCount=2; SentCount=0; DocsReceivedCount=0; ClosedCount=0
            Status='READY'; SubBatchSize=25
        }
        Ensure-ListItem -List $batchList -Title 'BATCH-20261022-0945-CONSOL' -Values @{
            Pipeline='CONSOL'; SourceFile='CONSOL_20261022_0945.xlsx'; UploadedBy='bipul.sikder@fedex.com'
            UploadedAt=$now; RowCountIn=2; AcceptedCount=2; RejectedCount=0; SentCount=0; DocsReceivedCount=0; ClosedCount=0
            Status='UPLOADED'; SubBatchSize=25
        }
    }

    # --- CD_Shipment : 6 demo rows covering every branch of the intake gate
    $shipList = Get-ListSafe 'CD_Shipment'
    if ($shipList) {
        $b1 = 'BATCH-20261022-0930-UBOND'
        $ships = @(
            @{ awb='781234567890'; co='Alpha Imports Pvt Ltd'; cn='Alpha Imports Pvt Ltd'; em='bipul.sikder@fedex.com';
               ct='NFBRK'; bk='JEENA'; loc='DELHI'; st='READY'; ss='NOT_SENT'; ft='ARRIVAL_DAY'; fee=3068; cur='INR'; fr=45000; iv=1250000; pc=12; wt=612; frt='AI 161'; org='MUM'; dst='DEL' }
            @{ awb='781234567891'; co='Meridian Textiles';   cn='Meridian Textiles';   em='ops@meridiantextiles.example';
               ct='FEBRK-JEENA'; bk='JEENA'; loc='KOLKATA'; st='READY'; ss='NOT_SENT'; ft='NEXT_DAY_ONWARD'; fee=4248; cur='INR'; fr=98000; iv=2400000; pc=40; wt=1450; frt='AI 162'; org='BLR'; dst='CCU' }
            @{ awb='781234567892'; co='Bharat Electronics';  cn='Bharat Electronics';  em='ops@bharetelectronics.example';
               ct='FEBRK-SUNIMPEX'; bk='SUNIMPEX'; loc='DELHI'; st='READY'; ss='NOT_SENT'; ft='ARRIVAL_DAY'; fee=3068; cur='INR'; fr=22000; iv=780000; pc=8; wt=215; frt='AI 163'; org='MUM'; dst='DEL' }
            @{ awb='781234567893'; co='Arihant Metals';      cn='Arihant Metals';      em='ops@arihantmetals.example';
               ct='UNRESOLVED'; bk='JEENA'; loc='DELHI'; st='ESCALATED'; ss='NOT_SENT'; ft='ARRIVAL_DAY'; fee=0; cur='INR'; fr=61000; iv=1600000; pc=22; wt=880; frt='AI 164'; org='PNQ'; dst='DEL' }
            @{ awb='781234567894'; co='Zenith Exports';      cn='Zenith Exports';      em='';
               ct='NFBRK'; bk='JEENA'; loc='DELHI'; st='REJECTED'; ss='NOT_SENT'; ft='ARRIVAL_DAY'; fee=0; cur='INR'; fr=31000; iv=990000; pc=5; wt=140; frt='AI 165'; org='HYD'; dst='DEL' }
            @{ awb='781234567895'; co='Kirti Overseas';      cn='Kirti Overseas';      em='docs@kirtioverseas.example';
               ct='NFBRK'; bk='JEENA'; loc='KOLKATA'; st='READY'; ss='NOT_SENT'; ft='ARRIVAL_DAY'; fee=3068; cur='INR'; fr=54000; iv=1100000; pc=16; wt=505; frt='AI 166'; org='MUM'; dst='CCU' }
        )
        foreach ($s in $ships) {
            $values = @{
                Batch=$b1; Pipeline='UBOND'; Company=$s.co; ConsigneeName=$s.cn; ContactEmail=$s.em
                Broker=$s.bk; ClearanceType=$s.ct; TemplateName=$s.ct
                Flight=$s.frt; Origin=$s.org; Destination=$s.dst; ArrivalDate=$now.AddDays(4)
                Currency=$s.cur; Freight=$s.fr; InvoiceValue=$s.iv; Pieces=$s.pc; Weight=$s.wt
                FeeINR=$s.fee; FeeTier=$s.ft; FeeBasis=$(if ($s.fee -gt 0) { "$($s.fee) = base + 18% GST" } else { '' })
                Status=$s.st; SendState=$s.ss; TestMode=$true; ReminderCount=0; CustomerResponded=$false
                CreatedAt=$now; UpdatedAt=$now; Location=$s.loc
                # Canonical source row, stored as JSON. This is the intake contract (doc 38 section 7):
                # the normalised keys the engine reads. Kept compact so it also fits a 255-char
                # single-line field before the multi-line conversion below runs.
                RawJSON = ('{"Batch":"' + $b1 + '","AWB":"' + $s.awb + '","Company":"' + $s.co +
                           '","Email":"' + $s.em + '","EndResult":"' + $s.ct + '","Broker":"' + $s.bk +
                           '","Location":"' + $s.loc + '","Freight":"' + $s.fr + '","Currency":"' + $s.cur + '"}')
            }
            if ($s.st -eq 'REJECTED') { $values['RejectReason'] = 'Consignee email missing or malformed' }
            Ensure-ListItem -List $shipList -Title $s.awb -Values $values
        }
    }

    # --- CD_Case : the two cases the intake gate must raise
    $caseList = Get-ListSafe 'CD_Case'
    if ($caseList) {
        $now = Get-Date
        Ensure-ListItem -List $caseList -Title 'CASE-000001' -Values @{
            AWB='781234567893'; Batch='BATCH-20261022-0930-UBOND'; CaseType='CALL_TASK'; Priority='P2'; Status='OPEN'
            Reason='Broker unresolved: bare FEBRK without Jeena or Sunimpex'
            Fix='Confirm the broker with the customer, then unblock every AWB on that line'
            CreatedAt=$now; SlaDueAt=$now.AddHours(4)
        }
        Ensure-ListItem -List $caseList -Title 'CASE-000002' -Values @{
            AWB='781234567894'; Batch='BATCH-20261022-0930-UBOND'; CaseType='REJECTED_ROW'; Priority='P3'; Status='OPEN'
            Reason='Consignee email missing or malformed'
            Fix='Re-upload the row with a valid consignee email address'
            CreatedAt=$now; SlaDueAt=$now.AddHours(8)
        }
    }

    # --- CD_Participant
    $partList = Get-ListSafe 'CD_Participant'
    if ($partList) {
        Ensure-ListItem -List $partList -Title 'Alpha Imports Pvt Ltd' -Values @{ Role='CUSTOMER'; Name='Alpha Imports - Cargo Desk'; Email='ops@alphaimports.example'; Phone='9810000001'; AWB='781234567890'; IsPrimary=$true; Active=$true }
        Ensure-ListItem -List $partList -Title 'Jeena Logistics' -Values @{ Role='CHA'; Name='Jeena - Delhi'; Email='del-fedex.imports@jeena.co.in'; Phone='9810000002'; IsPrimary=$true; Active=$true }
        Ensure-ListItem -List $partList -Title 'Sunimpex' -Values @{ Role='BROKER'; Name='Sunimpex - Delhi'; Email='ops@sunimpex.example'; Phone='9810000003'; IsPrimary=$true; Active=$true }
    }

    # --- CD_ShipmentEvent : audit trail for the first shipment
    $evtList = Get-ListSafe 'CD_ShipmentEvent'
    if ($evtList) {
        $now = Get-Date
        Ensure-ListItem -List $evtList -Title '781234567890 - 2026-10-22T09:30:00Z' -Values @{
            AWB='781234567890'; EventType='BATCH_CREATED'; Actor='bipul.sikder@fedex.com'
            Batch='BATCH-20261022-0930-UBOND'; Detail='Row accepted into BATCH-20261022-0930-UBOND'
            Timestamp=$now; FromStatus=''; ToStatus='READY'
        }
        Ensure-ListItem -List $evtList -Title '781234567890 - 2026-10-22T09:31:00Z' -Values @{
            AWB='781234567890'; EventType='TEMPLATE_ASSIGNED'; Actor='SYSTEM'
            Batch='BATCH-20261022-0930-UBOND'; Detail='Template NFBRK assigned'
            Timestamp=$now; FromStatus=''; ToStatus='READY'
        }
    }
}

# ---------------------------------------------------------------- summary
Write-Step "Summary"
Write-Host "  columns added / to add : $($script:Changes.Count)"
Write-Host "  list items added / to add: $($script:Created.Count)"
if (-not $Apply) {
    Write-Host "`n  PLAN ONLY - nothing was changed." -ForegroundColor Yellow
    Write-Host "  Re-run with -Apply to make these changes." -ForegroundColor Yellow
} else {
    Write-Host "`n  APPLIED." -ForegroundColor Green
}
