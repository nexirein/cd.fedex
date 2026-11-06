#!/usr/bin/env python3
"""
Generates the Clearance Desk canvas screens.

One shell template (sidebar + top bar + accent + content frame) is emitted for every
screen, so a design change lands on all screens at once. Each screen contributes only
its own content block.

    python3 tools/gen_canvas.py

Outputs into ./canvas/*.pa.yaml. Never write into ./canvas-verify2 (sync target).
"""
import os
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "..", "canvas")

# A formula that contains ": " breaks a YAML plain scalar, so it has to be quoted.
FORMULA_RE = re.compile(r"^(\s*)([A-Za-z_][A-Za-z0-9_]*): (=.*)$")


def quote_formulas(lines):
    """Single-quote any formula value that YAML would misread as a plain scalar."""
    out = []
    for ln in lines:
        m = FORMULA_RE.match(ln)
        if not m:
            out.append(ln)
            continue
        indent, key, val = m.group(1), m.group(2), m.group(3)
        if ": " in val or val.endswith(":") or " #" in val:
            out.append("%s%s: '%s'" % (indent, key, val.replace("'", "''")))
        else:
            out.append(ln)
    return out

# Canonical indent for a child item inside a container or card.
CANON = 30

# ---------------------------------------------------------------- palette
PURPLE = "RGBA(77, 20, 140, 1)"
ORANGE = "RGBA(255, 102, 0, 1)"
ORANGE_D = "RGBA(214, 74, 0, 1)"
ORANGE_T = "RGBA(255, 244, 235, 1)"
INK = "RGBA(26, 26, 26, 1)"
MUTED = "RGBA(120, 120, 132, 1)"
SOFT = "RGBA(90, 90, 102, 1)"
LINE = "RGBA(229, 231, 235, 1)"
GREEN = "RGBA(21, 128, 61, 1)"
RED = "RGBA(185, 28, 28, 1)"
PAGE = "RGBA(245, 246, 248, 1)"
WHITE = "RGBA(255, 255, 255, 1)"

NAV = [
    # Only screens that actually work. Nine placeholder screens used to sit in
    # this list; a sidebar where most links open "placeholder" is the single
    # biggest source of "where is what?". They stay in the app, unreachable,
    # until each one is rebuilt for real.
    ("Home", "Home", "ScrHome"),
    ("Upload", "Upload batch", "ScrBatchUpload"),
    ("Board", "Batch board", "ScrBatchBoard"),
]


# ---------------------------------------------------------------- indent
def shift(lines, delta):
    """Move a block of YAML lines left or right by `delta` spaces."""
    if delta == 0:
        return list(lines)
    out = []
    for ln in lines:
        if not ln.strip():
            out.append(ln)
            continue
        if delta > 0:
            out.append(" " * delta + ln)
        else:
            cut = -delta
            lead = 0
            while lead < len(ln) and ln[lead] == " ":
                lead += 1
            out.append(ln[min(cut, lead):])
    return out


def flatten(lines):
    """Accept a list of lines, or a list of lists of lines."""
    out = []
    for item in lines:
        if isinstance(item, list):
            out.extend(flatten(item))
        else:
            out.append(item)
    return out


def child_lines(lines, indent):
    """Children of a node whose `- name:` line sits at `indent` sit at indent + 6."""
    return shift(flatten(lines), indent + 6 - CANON)


def place(lines, target):
    """Shift a block so its least-indented line starts at `target` spaces.

    Safer than child_lines: content assembled directly at the final indent and
    content assembled at CANON both land correctly. child_lines() assumes the
    block was built at CANON, which is true inside a helper but not for a
    screen's top-level content list -- getting that wrong silently turns the
    content into siblings of its container instead of children.
    """
    flat = flatten(lines)
    leads = [len(ln) - len(ln.lstrip(" ")) for ln in flat if ln.strip()]
    if not leads:
        return flat
    return shift(flat, target - min(leads))


# ---------------------------------------------------------------- atoms
def text(name, body, size=14, color=INK, bold=False, wrap=True, autofit=True,
         fillp=0, minw=0, extra=None, indent=CANON, label=None):
    pad = " " * indent
    body = body[1:] if body.startswith("=") else body
    # The accessibility checker accepts a static AccessibleLabel but flags one
    # that is computed per row / per record. Dynamic labels therefore pass an
    # explicit static `label` and only the visible Text stays dynamic.
    L = [
        pad + "- %s:" % name,
        pad + "    Control: ModernText",
        pad + "    Properties:",
        pad + "      Text: =" + body,
        pad + "      AccessibleLabel: =" + (label if label is not None else body),
        pad + "      Color: =" + color,
        pad + "      Size: =%d" % size,
    ]
    if bold:
        L.append(pad + "      FontWeight: =FontWeight.Semibold")
    L.append(pad + "      Wrap: =%s" % ("true" if wrap else "false"))
    if autofit:
        L.append(pad + "      AutoHeight: =true")
    L.append(pad + "      FillPortions: =%d" % fillp)
    L.append(pad + "      LayoutMinWidth: =%d" % minw)
    L.append(pad + "      LayoutMinHeight: =0")
    for e in (extra or []):
        L.append(pad + "      " + e)
    return L


def badge(name, content, theme="'BadgeCanvas.ThemeColor'.Brand", minw=104, height=26,
          fillp=0, indent=CANON, label=None):
    pad = " " * indent
    return [
        pad + "- %s:" % name,
        pad + "    Control: Badge",
        pad + "    Properties:",
        pad + "      Content: =" + content,
        pad + "      AccessibleLabel: =" + (label if label is not None else content),
        pad + "      Appearance: ='BadgeCanvas.Appearance'.Filled",
        pad + "      ThemeColor: =" + theme,
        pad + "      Shape: ='BadgeCanvas.Shape'.Rounded",
        pad + "      Height: =%d" % height,
        pad + "      FillPortions: =%d" % fillp,
        pad + "      LayoutMinWidth: =%d" % minw,
        pad + "      LayoutMinHeight: =0",
    ]


def button(name, label, onselect=None, appearance="Primary", color=PURPLE, minw=200,
           height=50, fillp=0, bold=True, extra=None, indent=CANON):
    pad = " " * indent
    L = [
        pad + "- %s:" % name,
        pad + "    Control: ModernButton",
        pad + "    Properties:",
        pad + "      Text: =" + label,
        pad + "      AccessibleLabel: =" + label,
        pad + "      Layout: =ButtonLayout.TextOnly",
        pad + "      Appearance: =ButtonAppearance.%s" % appearance,
        pad + "      BasePaletteColor: =" + color,
        pad + "      Size: =15",
    ]
    if bold:
        L.append(pad + "      FontWeight: =FontWeight.Semibold")
    L.append(pad + "      Height: =%d" % height)
    L.append(pad + "      FillPortions: =%d" % fillp)
    L.append(pad + "      LayoutMinWidth: =%d" % minw)
    L.append(pad + "      LayoutMinHeight: =0")
    if onselect:
        if "\n" in onselect:
            # A multi-statement behaviour formula needs a block scalar; a
            # plain scalar would lose the line breaks. Only the first
            # statement carries the "=" prefix.
            L.append(pad + "      OnSelect: |-")
            for line in onselect.split("\n"):
                L.append(pad + "        " + line)
        else:
            L.append(pad + "      OnSelect: " + onselect)
    for e in (extra or []):
        L.append(pad + "      " + e)
    return L


def progress(name, value, minw=0, height=10, indent=CANON):
    pad = " " * indent
    return [
        pad + "- %s:" % name,
        pad + "    Control: ModernProgressBar",
        pad + "    Properties:",
        pad + "      Value: =" + value,
        pad + "      Max: =100",
        pad + "      Height: =%d" % height,
        pad + "      FillPortions: =0",
        pad + "      LayoutMinWidth: =%d" % minw,
        pad + "      LayoutMinHeight: =0",
        pad + "      AccessibleLabel: =\"Send progress\"",
    ]


def container(name, direction, children, indent=CANON, extra=None, fillp=0,
              height=None, gap=None, align=None, justify=None, minw=0, variant="AutoLayout"):
    pad = " " * indent
    L = [
        pad + "- %s:" % name,
        pad + "    Control: GroupContainer",
        pad + "    Variant: %s" % variant,
        pad + "    Properties:",
        pad + "      LayoutDirection: =LayoutDirection.%s" % direction,
    ]
    if gap is not None:
        L.append(pad + "      LayoutGap: =%s" % gap)
    if align:
        L.append(pad + "      LayoutAlignItems: =LayoutAlignItems.%s" % align)
    if justify:
        L.append(pad + "      LayoutJustifyContent: =LayoutJustifyContent.%s" % justify)
    L.append(pad + "      FillPortions: =%d" % fillp)
    L.append(pad + "      LayoutMinWidth: =%d" % minw)
    L.append(pad + "      LayoutMinHeight: =0")
    if height is not None:
        L.append(pad + "      Height: =%s" % height)
    # A property may only appear once per node. Drop anything the caller put in
    # `extra` that this function already emits, so the YAML stays valid.
    emitted = {"LayoutDirection", "FillPortions", "LayoutMinWidth", "LayoutMinHeight"}
    if gap is not None:
        emitted.add("LayoutGap")
    if align:
        emitted.add("LayoutAlignItems")
    if justify:
        emitted.add("LayoutJustifyContent")
    if height is not None:
        emitted.add("Height")
    for e in (extra or []):
        key = e.split(":", 1)[0].strip()
        if key in emitted:
            continue
        L.append(pad + "      " + e)
    L.append(pad + "    Children:")
    L.extend(child_lines(children, indent))
    return L


def card(name, children, indent=CANON, extra=None, fillp=0, height=None, gap=None,
         fill=None):
    # Only the visual skin is added here; container() owns the layout props.
    props = [
        "Fill: =" + (fill or WHITE),
        "RadiusTopLeft: =14",
        "RadiusTopRight: =14",
        "RadiusBottomLeft: =14",
        "RadiusBottomRight: =14",
        "PaddingTop: =18",
        "PaddingBottom: =18",
        "PaddingLeft: =20",
        "PaddingRight: =20",
    ]
    props += (extra or [])
    return container(name, "Vertical", children, indent=indent, extra=props,
                     fillp=fillp, height=height, gap=gap, align="Stretch")


def gallery(name, variant, items, children, indent=CANON, extra=None, onselect=None,
            template=54, height=330, width="Parent.Width"):
    pad = " " * indent
    L = [
        pad + "- %s:" % name,
        pad + "    Control: Gallery",
        pad + "    Variant: %s" % variant,
        pad + "    Properties:",
        pad + "      Items: =" + items,
        pad + "      TemplateSize: =%d" % template,
        pad + "      TemplatePadding: =4",
        pad + "      Height: =%s" % height,
        pad + "      Width: =%s" % width,
        pad + "      FillPortions: =0",
        pad + "      LayoutMinWidth: =0",
        pad + "      LayoutMinHeight: =0",
        pad + "      AccessibleLabel: =\"%s\"" % name,
        pad + "      TabIndex: =0",
    ]
    if variant == "Horizontal":
        L.insert(L.index(pad + "      TemplatePadding: =4") + 1,
                 pad + "      WrapCount: =3")
    if onselect:
        L.append(pad + "      OnSelect: " + onselect)
    for e in (extra or []):
        L.append(pad + "      " + e)
    L.append(pad + "    Children:")
    L.extend(child_lines(children, indent))
    return L


# ---------------------------------------------------------------- demo seed
# The demo dataset is written by the app itself, using only columns that already
# exist on the provisioned lists. It is idempotent: a row is written only when it
# is missing, so re-running the app never duplicates anything.
JEENA_CC = ("del-fedex.imports@jeena.co.in; madhikari@jeena.co.in; syogesh@jeena.co.in; "
            "adtaneja@jeena.co.in; sdutt@jeena.co.in; vjain1@jeena.co.in; ssingh@jeena.co.in; "
            "aanand1@jeena.co.in; kbihari@jeena.co.in; iphvdelcargo@corp.ds.fedex.com")

BODY_TAIL = (
    "<p>AWB {AWB} | Freight {FREIGHT} {CURRENCY} | To {LOCATION}</p>"
    "<p>Send the documents before the BOE window. Late documents attract Rs. 10,000/day.</p>"
    "<p>Regards,<br/>FedEx Cargo Desk</p>")

# Kept under 250 characters so the seed also lands when CD_Template.BodyContent
# is still a single-line SharePoint field. The reconcile script upgrades the
# column to multi-line text and then writes the full production body.
BODY_PLAIN = "<p>Dear {CONSIGNEE_NAME},</p>" + BODY_TAIL
BODY_JEENA = ("<p>Dear {CONSIGNEE_NAME},</p>"
              "<p>Broker: Jeena.</p>" + BODY_TAIL)
BODY_SUNIMPEX = ("<p>Dear {CONSIGNEE_NAME},</p>"
                 "<p>Broker: Sunimpex.</p>" + BODY_TAIL)

DEMO_TEMPLATES = [
    ("NFBRK", "Pre Alert - {AWB} / {CONSIGNEE_NAME}", BODY_PLAIN, ""),
    ("FEBRK-JEENA",
     "CARGO ARRIVAL NOTICE- Pre Alert AWB and freight charges : {AWB} {CONSIGNEE_NAME} {FREIGHT}_{CURRENCY} | FEBRK-DDP",
     BODY_JEENA, JEENA_CC),
    ("FEBRK-SUNIMPEX",
     "CARGO ARRIVAL NOTICE- Pre Alert AWB and freight charges : {AWB} {CONSIGNEE_NAME} {FREIGHT}_{CURRENCY} | FEBRK-DDU",
     BODY_SUNIMPEX, ""),
]

DEMO_BATCHES = [
    ("BATCH-20261022-0930-UBOND", 6, 5, 1),
    ("BATCH-20261022-0945-CONSOL", 1, 1, 0),
]

# batch, awb, company, email, end result, broker, location, freight, currency, fee
# 893 is a bare FEBRK and 896 is HOLD: both are real values from a live file and
# both must come out SKIPPED, not as data errors.
DEMO_SHIPMENTS = [
    ("BATCH-20261022-0930-UBOND", "781234567890", "Alpha Imports Pvt Ltd",
     "bipul.sikder@fedex.com", "NFBRK", "JEENA", "DELHI", 45000, "INR", 3068),
    ("BATCH-20261022-0930-UBOND", "781234567891", "Meridian Textiles",
     "ops@meridiantextiles.example", "FEBRK-JEENA", "JEENA", "KOLKATA", 98000, "INR", 4248),
    ("BATCH-20261022-0930-UBOND", "781234567892", "Bharat Electronics",
     "ops@bharetelectronics.example", "FEBRK-SUNIMPEX", "SUNIMPEX", "DELHI", 22000, "INR", 3068),
    ("BATCH-20261022-0930-UBOND", "781234567893", "Arihant Metals",
     "ops@arihantmetals.example", "FEBRK", "", "DELHI", 61000, "INR", 0),
    ("BATCH-20261022-0930-UBOND", "781234567894", "Zenith Exports",
     "", "NFBRK", "JEENA", "DELHI", 31000, "INR", 0),
    ("BATCH-20261022-0930-UBOND", "781234567896", "Orbit Freight Solutions",
     "ops@orbitfreight.example", "HOLD", "", "MUMBAI", 12000, "INR", 0),
    ("BATCH-20261022-0945-CONSOL", "781234567895", "Kirti Overseas",
     "docs@kirtioverseas.example", "NFBRK", "JEENA", "KOLKATA", 54000, "INR", 3068),
]

DEMO_CASES = [
    ("CASE-000001", "781234567893",
     "Broker unresolved: bare FEBRK without Jeena or Sunimpex",
     "Confirm the broker, then unblock every AWB on that line", 4),
    ("CASE-000002", "781234567894",
     "Consignee email missing or malformed",
     "Re-upload the row with a valid consignee email address", 8),
]

DEMO_SETTINGS = [
    ("sendTestAllowlist", "bipul.sikder@fedex.com",
     "TEST MODE allow-list, semicolon separated. Only these recipients receive mail."),
    ("SubBatchSize", "25", "Send sub-batch size"),
    ("sendableEndResults", "NFBRK;FEBRK-JEENA;FEBRK-SUNIMPEX",
     "Semicolon separated end results eligible for pre-alert. Anything else is SKIPPED."),
    ("CD_TestMode", "Yes", "Master inert switch"),
    ("aiEnabled", "Yes", "AI classification enabled"),
    ("autoSendEnabled", "No", "Master send switch"),
    ("followupEnabled", "No", "Automatic reminder follow-ups"),
    ("callAiEnabled", "No", "Call AI assist"),
]


def pf_str(s):
    """A Power Fx string literal.

    Power Fx has no backslash escape. A double quote inside a string is
    written by doubling it.
    """
    return '"' + s.replace('"', '""') + '"'


def shipment_json(batch, awb, company, email, end, broker, loc, freight, currency):
    return ('{"Batch":"%s","AWB":"%s","Company":"%s","Email":"%s","EndResult":"%s",'
            '"Broker":"%s","Location":"%s","Freight":"%s","Currency":"%s"}'
            % (batch, awb, company, email, end, broker, loc, freight, currency))


def app_yaml():
    L = []
    A = L.append
    # Power Fx behaviour formula: statements are separated by ";".
    # Only the FIRST statement carries the "=" prefix; every later one must not,
    # otherwise the formula reads as "=Set(...) =Set(...)" and fails to parse.
    stmts = []

    def st(expr):
        stmts.append(expr)

    st('Set(varTestMode, Coalesce(LookUp(CD_Setting, Title = "CD_TestMode").SettingValue, "Yes") = "Yes")')
    st('Set(varAiEnabled, Coalesce(LookUp(CD_Setting, Title = "aiEnabled").SettingValue, "Yes") = "Yes")')
    st('Set(varAutoSendEnabled, Coalesce(LookUp(CD_Setting, Title = "autoSendEnabled").SettingValue, "No") = "Yes")')
    st('Set(varFollowupEnabled, Coalesce(LookUp(CD_Setting, Title = "followupEnabled").SettingValue, "No") = "Yes")')
    st('Set(varCallAiEnabled, Coalesce(LookUp(CD_Setting, Title = "callAiEnabled").SettingValue, "No") = "Yes")')
    # A blank or non-positive SubBatchSize would divide by zero on the board,
    # so fall back to 25 rather than trusting the setting blindly.
    st('Set(varSubBatchSize, If(Value(Coalesce(LookUp(CD_Setting, Title = "SubBatchSize").SettingValue, "0")) <= 0, 25, Value(LookUp(CD_Setting, Title = "SubBatchSize").SettingValue)))')
    st('Set(varAllowlist, ";" & Lower(Trim(Coalesce(LookUp(CD_Setting, Title = "sendTestAllowlist").SettingValue, ""))) & ";")')
    # Sendable end results come from a setting, not a hardcoded list, so ops can
    # add a type without a code change. Anything not on it becomes SKIPPED with
    # an explicit reason rather than a vague "blocked" (real files contain
    # Calling, HOLD and bare FEBRK).
    st('Set(varSendable, "|" & Substitute(Coalesce(LookUp(CD_Setting, Title = "sendableEndResults").SettingValue, "NFBRK;FEBRK-JEENA;FEBRK-SUNIMPEX"), ";", "|") & "|")')

    # ---------------- demo seed
    # Every row gets its own statement. A single If() cannot carry a list of
    # expressions, and a trailing comma is a parse error in Power Fx.
    def guard(list_name, title, patch):
        st("If(IsBlank(LookUp(%s, Title = %s)), %s)"
           % (list_name, pf_str(title), patch))

    for title, value, desc in DEMO_SETTINGS:
        guard("CD_Setting", title,
              "Patch(CD_Setting, Defaults(CD_Setting), {Title: %s, SettingValue: %s, Description: %s})"
              % (pf_str(title), pf_str(value), pf_str(desc)))
    for title, subject, body, cc in DEMO_TEMPLATES:
        guard("CD_Template", title,
              "Patch(CD_Template, Defaults(CD_Template), {Title: %s, SubjectPattern: %s, "
              "BodyContent: %s, CCEmails: %s, SubjectTagEnabled: true, Active: true})"
              % (pf_str(title), pf_str(subject), pf_str(body), pf_str(cc)))
    for title, rows, acc, rej in DEMO_BATCHES:
        guard("CD_Batch", title,
              "Patch(CD_Batch, Defaults(CD_Batch), {Title: %s, RowCountIn: %d, "
              "AcceptedCount: %d, RejectedCount: %d, SentCount: 0, DocsReceivedCount: 0, "
              "ClosedCount: 0, SubBatchSize: 25, UploadedAt: Now()})"
              % (pf_str(title), rows, acc, rej))
    for batch, awb, company, email, end, broker, loc, freight, cur, fee in DEMO_SHIPMENTS:
        raw = shipment_json(batch, awb, company, email, end, broker,
                            loc, freight, cur)
        extra = ""
        if not email:
            extra = ", RejectReason: %s" % pf_str("Consignee email missing or malformed")
        if end == "UNRESOLVED":
            extra = ", RejectReason: %s" % pf_str("Broker unresolved: bare FEBRK")
        guard("CD_Shipment", awb,
              "Patch(CD_Shipment, Defaults(CD_Shipment), {Title: %s, RawJSON: %s, "
              "Freight: %d, FeeINR: %d, FeeBasis: %s, Summary: %s, TestMode: true, "
              "ReminderCount: 0, CustomerResponded: false, CreatedAt: Now(), "
              "UpdatedAt: Now()%s})"
              % (pf_str(awb), pf_str(raw), freight, fee,
                 pf_str("%d = base + 18%% GST" % fee if fee else ""),
                 pf_str("%s - %s" % (company, end)), extra))
    for title, awb, reason, fix, hours in DEMO_CASES:
        guard("CD_Case", title,
              "Patch(CD_Case, Defaults(CD_Case), {Title: %s, Reason: %s, Fix: %s, "
              "CreatedAt: Now(), SlaDueAt: Now() + %d/24})"
              % (pf_str(title), pf_str("AWB %s - %s" % (awb, reason)), pf_str(fix), hours))

    # ---------------- load
    st("ClearCollect(colBatch, CD_Batch)")
    st("ClearCollect(colCase, CD_Case)")
    st("ClearCollect(colShipment, CD_Shipment)")
    st("ClearCollect(colTemplate, CD_Template)")
    st("ClearCollect(colMessage, CD_Message)")

    A("App:")
    A("  Properties:")
    A("    OnStart: |-")
    for i, s in enumerate(stmts):
        prefix = "=" if i == 0 else ""
        tail = ";" if i < len(stmts) - 1 else ""
        A("      %s%s%s" % (prefix, s, tail))
    A("    StartScreen: =ScrHome")
    A("    Theme: =PowerAppsTheme")
    return "\n".join(quote_formulas(L)) + "\n"


# ---------------------------------------------------------------- shell
def nav_items(pfx, active_id):
    out = []
    for nid, label, screen in NAV:
        active = nid == active_id
        out.append("- btn%sNav%s:" % (pfx, nid))
        out.append("    Control: ModernButton")
        out.append("    Properties:")
        out.append('      Text: ="%s"' % label)
        out.append('      AccessibleLabel: ="%s"' % label)
        out.append("      Layout: =ButtonLayout.TextOnly")
        out.append("      Appearance: =ButtonAppearance.%s"
                   % ("Primary" if active else "Subtle"))
        if active:
            out.append("      BasePaletteColor: =%s" % PURPLE)
            out.append("      FontWeight: =FontWeight.Semibold")
        out.append("      Size: =15")
        out.append("      Align: =Align.Left")
        out.append("      Height: =42")
        out.append("      FillPortions: =0")
        out.append("      LayoutMinWidth: =0")
        out.append("      LayoutMinHeight: =0")
        out.append("      OnSelect: =Navigate(%s, ScreenTransition.None)" % screen)
    return out


def shell(pfx, screen_name, page_title, active_id, onvisible=None, content=None):
    L = []
    A = L.append
    A("Screens:")
    A("  %s:" % screen_name)
    A("    Properties:")
    A("      Fill: =%s" % PAGE)
    if onvisible:
        A("      OnVisible: |-")
        for line in onvisible.strip("\n").split("\n"):
            A("        " + line)
    A("    Children:")
    A("      - con%sRoot:" % pfx)
    A("          Control: GroupContainer")
    A("          Variant: AutoLayout")
    A("          Properties:")
    A("            Fill: =%s" % PAGE)
    A("            Height: =Parent.Height")
    A("            Width: =Parent.Width")
    A("            LayoutDirection: =LayoutDirection.Horizontal")
    A("            LayoutAlignItems: =LayoutAlignItems.Stretch")
    A("            LayoutGap: =0")
    A("          Children:")

    # ---------------------------------------------------------- sidebar
    A("            - con%sSidebar:" % pfx)
    A("                Control: GroupContainer")
    A("                Variant: AutoLayout")
    A("                Properties:")
    A("                  Width: =252")
    A("                  FillPortions: =0")
    A("                  LayoutMinWidth: =0")
    A("                  LayoutMinHeight: =0")
    A("                  LayoutDirection: =LayoutDirection.Vertical")
    A("                  LayoutAlignItems: =LayoutAlignItems.Stretch")
    A("                  LayoutGap: =0")
    A("                  Fill: =%s" % WHITE)
    A("                  PaddingTop: =18")
    A("                  PaddingBottom: =16")
    A("                  LayoutOverflowY: =LayoutOverflow.Scroll")
    A("                Children:")
    A("                  - con%sSbBrand:" % pfx)
    A("                      Control: GroupContainer")
    A("                      Variant: AutoLayout")
    A("                      Properties:")
    A("                        LayoutDirection: =LayoutDirection.Horizontal")
    A("                        LayoutGap: =12")
    A("                        LayoutAlignItems: =LayoutAlignItems.Center")
    A("                        FillPortions: =0")
    A("                        PaddingLeft: =20")
    A("                        PaddingRight: =20")
    A("                        PaddingBottom: =16")
    A("                        LayoutMinWidth: =0")
    A("                        LayoutMinHeight: =0")
    A("                      Children:")
    A("                        - con%sSbLogo:" % pfx)
    A("                            Control: GroupContainer")
    A("                            Variant: ManualLayout")
    A("                            Properties:")
    A("                              Width: =40")
    A("                              Height: =40")
    A("                              FillPortions: =0")
    A("                              LayoutMinWidth: =0")
    A("                              LayoutMinHeight: =0")
    A("                              Fill: =%s" % ORANGE)
    A("                              RadiusTopLeft: =10")
    A("                              RadiusTopRight: =10")
    A("                              RadiusBottomLeft: =10")
    A("                              RadiusBottomRight: =10")
    A("                            Children:")
    A("                              - lbl%sSbLogo:" % pfx)
    A("                                  Control: ModernText")
    A("                                  Properties:")
    A('                                    Text: ="FX"')
    A('                                    AccessibleLabel: ="FedEx logo"')
    A("                                    Color: =%s" % WHITE)
    A("                                    Size: =16")
    A("                                    FontWeight: =FontWeight.Bold")
    A("                                    Align: =Align.Center")
    A("                                    VerticalAlign: =VerticalAlign.Middle")
    A("                                    Width: =40")
    A("                                    Height: =40")
    A("                                    X: =0")
    A("                                    Y: =0")
    A("                        - con%sSbName:" % pfx)
    A("                            Control: GroupContainer")
    A("                            Variant: AutoLayout")
    A("                            Properties:")
    A("                              LayoutDirection: =LayoutDirection.Vertical")
    A("                              LayoutGap: =1")
    A("                              LayoutAlignItems: =LayoutAlignItems.Start")
    A("                              FillPortions: =1")
    A("                              LayoutMinWidth: =0")
    A("                              LayoutMinHeight: =0")
    A("                            Children:")
    A("                              - lbl%sSbName:" % pfx)
    A("                                  Control: ModernText")
    A("                                  Properties:")
    A('                                    Text: ="Clearance Desk"')
    A('                                    AccessibleLabel: ="Clearance Desk"')
    A("                                    Color: =%s" % PURPLE)
    A("                                    Size: =18")
    A("                                    FontWeight: =FontWeight.Semibold")
    A("                                    Wrap: =false")
    A("                                    AutoHeight: =true")
    A("                                    FillPortions: =0")
    A("                                    LayoutMinWidth: =0")
    A("                                    LayoutMinHeight: =0")
    A("                              - lbl%sSbSub:" % pfx)
    A("                                  Control: ModernText")
    A("                                  Properties:")
    A('                                    Text: ="Cargo · Phase 1"')
    A('                                    AccessibleLabel: ="Cargo, Phase 1"')
    A("                                    Color: =%s" % MUTED)
    A("                                    Size: =12")
    A("                                    Wrap: =false")
    A("                                    AutoHeight: =true")
    A("                                    FillPortions: =0")
    A("                                    LayoutMinWidth: =0")
    A("                                    LayoutMinHeight: =0")
    A("                  - con%sSbDividerTop:" % pfx)
    A("                      Control: GroupContainer")
    A("                      Variant: AutoLayout")
    A("                      Properties:")
    A("                        LayoutDirection: =LayoutDirection.Horizontal")
    A("                        Height: =1")
    A("                        FillPortions: =0")
    A("                        LayoutMinWidth: =0")
    A("                        LayoutMinHeight: =0")
    A("                        Fill: =%s" % LINE)
    A("                  - con%sSbNav:" % pfx)
    A("                      Control: GroupContainer")
    A("                      Variant: AutoLayout")
    A("                      Properties:")
    A("                        LayoutDirection: =LayoutDirection.Vertical")
    A("                        LayoutGap: =2")
    A("                        LayoutAlignItems: =LayoutAlignItems.Stretch")
    A("                        FillPortions: =0")
    A("                        PaddingLeft: =12")
    A("                        PaddingRight: =12")
    A("                        PaddingTop: =12")
    A("                        LayoutMinWidth: =0")
    A("                        LayoutMinHeight: =0")
    A("                      Children:")
    L.extend(shift(nav_items(pfx, active_id), 24))
    A("                  - con%sSbSpacer:" % pfx)
    A("                      Control: GroupContainer")
    A("                      Variant: AutoLayout")
    A("                      Properties:")
    A("                        LayoutDirection: =LayoutDirection.Vertical")
    A("                        FillPortions: =1")
    A("                        LayoutMinWidth: =0")
    A("                        LayoutMinHeight: =0")
    A("                  - con%sSbDividerBot:" % pfx)
    A("                      Control: GroupContainer")
    A("                      Variant: AutoLayout")
    A("                      Properties:")
    A("                        LayoutDirection: =LayoutDirection.Horizontal")
    A("                        Height: =1")
    A("                        FillPortions: =0")
    A("                        LayoutMinWidth: =0")
    A("                        LayoutMinHeight: =0")
    A("                        Fill: =%s" % LINE)
    A("                  - con%sSbFoot:" % pfx)
    A("                      Control: GroupContainer")
    A("                      Variant: AutoLayout")
    A("                      Properties:")
    A("                        LayoutDirection: =LayoutDirection.Vertical")
    A("                        LayoutGap: =3")
    A("                        LayoutAlignItems: =LayoutAlignItems.Start")
    A("                        FillPortions: =0")
    A("                        PaddingLeft: =20")
    A("                        PaddingRight: =20")
    A("                        PaddingTop: =14")
    A("                        LayoutMinWidth: =0")
    A("                        LayoutMinHeight: =0")
    A("                      Children:")
    A("                        - lbl%sSbUser:" % pfx)
    A("                            Control: ModernText")
    A("                            Properties:")
    A('                              Text: ="bipul.sikder@fedex.com"')
    A('                              AccessibleLabel: ="Signed in as bipul.sikder at fedex.com"')
    A("                              Color: =%s" % SOFT)
    A("                              Size: =12")
    A("                              Wrap: =false")
    A("                              AutoHeight: =true")
    A("                              FillPortions: =0")
    A("                              LayoutMinWidth: =0")
    A("                              LayoutMinHeight: =0")
    A("                        - lbl%sSbVer:" % pfx)
    A("                            Control: ModernText")
    A("                            Properties:")
    A('                              Text: ="Demo build · v0.1"')
    A('                              AccessibleLabel: ="Demo build version 0.1"')
    A("                              Color: =RGBA(150, 150, 160, 1)")
    A("                              Size: =11")
    A("                              Wrap: =false")
    A("                              AutoHeight: =true")
    A("                              FillPortions: =0")
    A("                              LayoutMinWidth: =0")
    A("                              LayoutMinHeight: =0")
    A("            - con%sSidebarRule:" % pfx)
    A("                Control: GroupContainer")
    A("                Variant: AutoLayout")
    A("                Properties:")
    A("                  Width: =1")
    A("                  FillPortions: =0")
    A("                  LayoutMinWidth: =0")
    A("                  LayoutMinHeight: =0")
    A("                  LayoutDirection: =LayoutDirection.Vertical")
    A("                  Fill: =%s" % LINE)

    # ---------------------------------------------------------- main column
    A("            - con%sMain:" % pfx)
    A("                Control: GroupContainer")
    A("                Variant: AutoLayout")
    A("                Properties:")
    A("                  FillPortions: =1")
    A("                  LayoutMinWidth: =0")
    A("                  LayoutMinHeight: =0")
    A("                  LayoutDirection: =LayoutDirection.Vertical")
    A("                  LayoutAlignItems: =LayoutAlignItems.Stretch")
    A("                  LayoutGap: =0")
    A("                  Fill: =%s" % PAGE)
    A("                Children:")
    A("                  - con%sTopBar:" % pfx)
    A("                      Control: GroupContainer")
    A("                      Variant: AutoLayout")
    A("                      Properties:")
    A("                        LayoutDirection: =LayoutDirection.Horizontal")
    A("                        LayoutGap: =16")
    A("                        LayoutAlignItems: =LayoutAlignItems.Center")
    A("                        LayoutJustifyContent: =LayoutJustifyContent.SpaceBetween")
    A("                        Width: =Parent.Width")
    A("                        Height: =72")
    A("                        FillPortions: =0")
    A("                        LayoutMinWidth: =0")
    A("                        LayoutMinHeight: =0")
    A("                        Fill: =%s" % WHITE)
    A("                        PaddingLeft: =28")
    A("                        PaddingRight: =28")
    A("                      Children:")
    A("                        - con%sTopLeft:" % pfx)
    A("                            Control: GroupContainer")
    A("                            Variant: AutoLayout")
    A("                            Properties:")
    A("                              LayoutDirection: =LayoutDirection.Horizontal")
    A("                              LayoutGap: =12")
    A("                              LayoutAlignItems: =LayoutAlignItems.Center")
    A("                              FillPortions: =0")
    A("                              LayoutMinWidth: =0")
    A("                              LayoutMinHeight: =0")
    A("                            Children:")
    A("                              - lbl%sPageTitle:" % pfx)
    A("                                  Control: ModernText")
    A("                                  Properties:")
    A('                                    Text: ="%s"' % page_title)
    A('                                    AccessibleLabel: ="%s"' % page_title)
    A("                                    Color: =%s" % INK)
    A("                                    Size: =22")
    A("                                    FontWeight: =FontWeight.Semibold")
    A("                                    Wrap: =false")
    A("                                    AutoHeight: =true")
    A("                                    FillPortions: =0")
    A("                                    LayoutMinWidth: =0")
    A("                                    LayoutMinHeight: =0")
    A("                              - lbl%sBadgeTest:" % pfx)
    A("                                  Control: Badge")
    A("                                  Properties:")
    A('                                    Content: ="TEST MODE"')
    A('                                    AccessibleLabel: ="Test mode"')
    A("                                    Appearance: ='BadgeCanvas.Appearance'.Filled")
    A("                                    ThemeColor: ='BadgeCanvas.ThemeColor'.Warning")
    A("                                    Shape: ='BadgeCanvas.Shape'.Rounded")
    A("                                    Height: =26")
    A("                                    FillPortions: =0")
    A("                                    LayoutMinWidth: =120")
    A("                                    LayoutMinHeight: =0")
    A("                        - con%sTopRight:" % pfx)
    A("                            Control: GroupContainer")
    A("                            Variant: AutoLayout")
    A("                            Properties:")
    A("                              LayoutDirection: =LayoutDirection.Horizontal")
    A("                              LayoutGap: =20")
    A("                              LayoutAlignItems: =LayoutAlignItems.Center")
    A("                              LayoutJustifyContent: =LayoutJustifyContent.End")
    A("                              FillPortions: =0")
    A("                              LayoutMinWidth: =0")
    A("                              LayoutMinHeight: =0")
    A("                            Children:")
    for key, label, lmin, var, setting in (
        ("Ai", "AI", 96, "varAiEnabled", "aiEnabled"),
        ("Send", "Send", 106, "varAutoSendEnabled", "autoSendEnabled"),
        ("Followup", "Follow-up", 122, "varFollowupEnabled", "followupEnabled"),
        ("Call", "Call AI", 112, "varCallAiEnabled", "callAiEnabled"),
    ):
        A("                              - tog%s%s:" % (pfx, key))
        A("                                  Control: ModernToggle")
        A("                                  Properties:")
        A('                                    Label: ="%s"' % label)
        A('                                    AccessibleLabel: ="%s switch"' % label)
        A("                                    LabelPosition: =ToggleLabelPosition.After")
        A("                                    Default: =%s" % var)
        A("                                    Size: =14")
        A("                                    Height: =40")
        A("                                    FillPortions: =0")
        A("                                    LayoutMinWidth: =%d" % lmin)
        A("                                    LayoutMinHeight: =0")
        for state, literal in (("OnCheck", "true"), ("OnUncheck", "false")):
            A("                                    %s: |-" % state)
            A("                                      =Set(%s, %s);" % (var, literal))
            A('                                      If(IsBlank(LookUp(CD_Setting, Title = "%s")),' % setting)
            A('                                         Patch(CD_Setting, Defaults(CD_Setting), {Title: "%s", SettingValue: "%s"}),'
              % (setting, "Yes" if literal == "true" else "No"))
            A('                                         Patch(CD_Setting, LookUp(CD_Setting, Title = "%s"), {SettingValue: "%s"}))'
              % (setting, "Yes" if literal == "true" else "No"))
    A("                  - con%sAccent:" % pfx)
    A("                      Control: GroupContainer")
    A("                      Variant: AutoLayout")
    A("                      Properties:")
    A("                        LayoutDirection: =LayoutDirection.Horizontal")
    A("                        Width: =Parent.Width")
    A("                        Height: =4")
    A("                        FillPortions: =0")
    A("                        LayoutMinWidth: =0")
    A("                        LayoutMinHeight: =0")
    A("                        Fill: =%s" % ORANGE)
    A("                  - con%sContent:" % pfx)
    A("                      Control: GroupContainer")
    A("                      Variant: AutoLayout")
    A("                      Properties:")
    A("                        FillPortions: =1")
    A("                        LayoutMinWidth: =0")
    A("                        LayoutMinHeight: =0")
    A("                        LayoutDirection: =LayoutDirection.Vertical")
    A("                        LayoutAlignItems: =LayoutAlignItems.Stretch")
    A("                        LayoutGap: =18")
    A("                        LayoutOverflowY: =LayoutOverflow.Scroll")
    A("                        PaddingLeft: =28")
    A("                        PaddingRight: =28")
    A("                        PaddingTop: =22")
    A("                        PaddingBottom: =40")
    A("                      Children:")
    if content:
        L.extend(place(content, 24))
    return "\n".join(quote_formulas(L)) + "\n"


# ---------------------------------------------------------------- engine
def jv(key):
    """Read one canonical key out of the raw source row.

    The business fields live in CD_Shipment.RawJSON (a canonical JSON object)
    until the reconcile script adds the typed columns. ParseJSON is used here
    because JSONValue does not exist in canvas apps.
    """
    return 'Text(ParseJSON(RawJSON).%s)' % key


def preflight_expr():
    """
    The intake gate (doc 38 section 4.14.1 and 8.3), as ordered AddColumns
    passes. Power Fx only lets a column reference columns added in an earlier
    pass, so the passes are layered deliberately.

    Two canvas-app quirks are baked in here:
      * AddColumns names the new column with a bare identifier, not a quoted
        string: AddColumns(t, Awb, expr). A quoted name is a parse error.
      * Fields are referenced implicitly (the source table's own columns),
        because this formula runs in the screen's OnVisible where ThisItem
        does not exist. DropColumns removes Title from the source scope so
        that "Title" inside a template LookUp can only mean the template.
    """
    p1 = [
        'Awb, %s' % jv("AWB"),
        'Company, %s' % jv("Company"),
        'Email, %s' % jv("Email"),
        'EndResult, %s' % jv("EndResult"),
        'Broker, %s' % jv("Broker"),
        'Location, %s' % jv("Location"),
        'FreightTxt, %s' % jv("Freight"),
        'Currency, %s' % jv("Currency"),
        'BatchKey, %s' % jv("Batch"),
    ]
    # "Sendable" is a SETTING, not a hardcoded list. Real consignments carry
    # end results this engine has never seen (Calling, HOLD, bare FEBRK), and
    # hardcoding three values silently turned every one of those into a
    # data-error "blocked" row instead of an honest "not sendable, and here is
    # why". varSendable is "|NFBRK|FEBRK-JEENA|FEBRK-SUNIMPEX|".
    p2 = [
        'AwbOk, !IsBlank(Trim(Awb)) && Len(Trim(Awb)) >= 11 && Len(Trim(Awb)) <= 12',
        'EmailOk, !IsBlank(Trim(Email)) && (Find("@", Lower(Trim(Email))) > 0)',
        'Sendable, Find("|" & Trim(EndResult) & "|", varSendable) > 0',
        'TplName, If(Find("|" & Trim(EndResult) & "|", varSendable) = 0, "", '
        'If(EndResult = "NFBRK", "NFBRK", '
        'If(Broker = "JEENA", "FEBRK-JEENA", '
        'If(Broker = "SUNIMPEX", "FEBRK-SUNIMPEX", ""))))',
    ]
    p3 = [
        'TplSubject, LookUp(colTemplate, Title = TplName).SubjectPattern',
        'TplBody, LookUp(colTemplate, Title = TplName).BodyContent',
        'TplCc, LookUp(colTemplate, Title = TplName).CCEmails',
        'TplTag, LookUp(colTemplate, Title = TplName).SubjectTagEnabled',
        'CaseTitle, LookUp(colCase, Find(Awb, Reason) > 0).Title',
    ]
    p4 = [
        'PfRecipient, If(IsBlank(Trim(Email)), "missing", '
        'If(EmailOk, "valid", "bad email"))',
        'PfType, If(IsBlank(Trim(EndResult)), "unresolved", Trim(EndResult))',
        'PfMissing, If(IsBlank(Trim(Awb)), ", AWB", "") & '
        'If(IsBlank(Trim(Company)), ", CONSIGNEE_NAME", "") & '
        'If(IsBlank(Trim(FreightTxt)), ", FREIGHT", "") & '
        'If(IsBlank(Trim(Currency)), ", CURRENCY", "") & '
        'If(IsBlank(Trim(Location)), ", LOCATION", "") & '
        'If(IsBlank(TplSubject), ", TEMPLATE", "")',
    ]
    # Three outcomes, not two:
    #   PASS    -- would send
    #   BLOCKED -- the row is meant to send but its data is wrong (a person fixes it)
    #   SKIPPED -- the row is not a pre-alert at all (HOLD, Calling, bare FEBRK)
    # Conflating SKIPPED with BLOCKED would bury real data errors in noise.
    p5 = [
        'PfPlaceholders, If(!Sendable, "n/a — " & Trim(EndResult), '
        'If(IsBlank(PfMissing), "all set", Trim(PfMissing) & " missing"))',
        'PfResult, If(!Sendable, "SKIPPED", '
        'If(AwbOk && EmailOk && IsBlank(PfMissing), "PASS", "BLOCKED"))',
    ]
    p6 = [
        'PfReason, If(PfResult = "PASS", "", '
        'If(!Sendable, '
        '"End result " & Trim(EndResult) & " is not on the sendable list. " & '
        'If(Trim(EndResult) = "HOLD", "On hold — do not pre-alert. ", "") & '
        'If(Trim(EndResult) = "Calling", "Marked Calling — a call has to clear this first. ", "") & '
        'If(Trim(EndResult) = "FEBRK", "Bare FEBRK — name the broker, then set it to FEBRK-JEENA or FEBRK-SUNIMPEX. ", ""), '
        'If(!AwbOk, "AWB missing or malformed. ", "") & '
        'If(!EmailOk, "Consignee email missing or malformed. ", "") & '
        'If(!IsBlank(PfMissing), "Placeholder missing: " & PfMissing & ". ", "")))',
        'PfFix, If(PfResult = "PASS", "", '
        'If(!Sendable, If(Trim(EndResult) = "HOLD", "Release the hold, then re-run pre-flight. ", '
        'If(Trim(EndResult) = "Calling", "Complete the call and update the end result. ", '
        'If(Trim(EndResult) = "FEBRK", "Confirm the broker for this AWB, then unblock the line. ", '
        '"If this type should be pre-alerted, add it to the sendableEndResults setting. "))), '
        'If(!AwbOk, "Re-upload the row with an 11 or 12 digit AWB. ", "") & '
        'If(!EmailOk, "Re-upload the row with a valid consignee email. ", "") & '
        'If(!IsBlank(PfMissing), "Supply the missing value and re-run pre-flight. ", "")))',
        'RenderSubject, Substitute(Substitute(Substitute(Substitute(Substitute('
        'TplSubject, "{AWB}", Awb), "{CONSIGNEE_NAME}", Company), "{FREIGHT}", FreightTxt), '
        '"{CURRENCY}", Currency), "{LOCATION}", Location) & '
        'If(!IsBlank(CaseTitle) && TplTag = true, " [" & CaseTitle & "]", "")',
        'RenderBody, Substitute(Substitute(Substitute(Substitute(Substitute('
        'TplBody, "{AWB}", Awb), "{CONSIGNEE_NAME}", Company), "{FREIGHT}", FreightTxt), '
        '"{CURRENCY}", Currency), "{LOCATION}", Location)',
    ]
    expr = ('Filter(DropColumns(colShipment, Title), !IsBlank(RawJSON) && %s = varBdBatch)'
            % jv("Batch"))
    for p in (p1, p2, p3, p4, p5, p6):
        expr = "AddColumns(%s,\n    %s)" % (expr, ",\n    ".join(p))
    return expr


# ---------------------------------------------------------------- probes
# Temporary harness: set PROBE = True to emit one formula per candidate
# Power Fx construct so a single compile reports exactly which ones this
# canvas app supports. Findings for this app (verified by compile):
#   * AddColumns names the new column with a BARE IDENTIFIER, not a quoted
#     string. AddColumns(t, "Col", expr) is a parse error; AddColumns(t, Col, expr)
#     compiles. The column is visible to later (outer) AddColumns passes.
#   * A column added in the SAME AddColumns call cannot be referenced by a
#     sibling column of that call -> layer the passes.
#   * Fields are referenced implicitly (the source table's own columns) when
#     the formula is not inside a gallery. ThisItem does not exist on a
#     screen property.
#   * ParseJSON works, JSONValue does not exist.
#   * "contains" is NOT a recognised operator here. Use Find(a, b) > 0.
#   * Concat takes only two arguments and rejects plain text here. Use &.
#   * Ceiling does not exist. Use RoundUp(x, 0).
#   * Split's result column is named "Value", not "Result".
#   * Let does not exist.
PROBE = False


def probe_content():
    C = []
    # NOTE: the text() helper adds the leading "=" itself.
    # One formula per candidate, so a single compile reports every verdict.
    probes = []
    for name, formula in probes:
        C += text(name, formula, size=10, color=MUTED)
    return C


# ---------------------------------------------------------------- board
def board_content():
    C = []
    A = C.append

    # ---- page head -----------------------------------------------------
    head_left = []
    head_left += text("lblBdHeadTitle", '"Batch board"', size=22, color=INK, bold=True,
                      wrap=False)
    head_left += text("lblBdHeadSub",
                      '"Pre-flight runs per row. One bad row never blocks the good ones."',
                      size=13, color=MUTED, wrap=False)
    head = container("conBdHeadLeft", "Vertical", head_left, gap=4, align="Start", fillp=1)
    head += badge("lblBdBatchChip", "varBdBatch", minw=240, height=30)
    C += container("conBdHead", "Horizontal", head, indent=24, gap=16, align="Center",
                   justify="SpaceBetween")

    # ---- batch picker --------------------------------------------------
    chip = container("conBdBatchChip", "Horizontal", [
        text("lblBdBatchChipText", "ThisItem.Title", size=13, color=INK, bold=True, wrap=False),
    ], gap=0, align="Center", fillp=1, extra=[
        "Height: =44",
        "PaddingLeft: =14",
        "PaddingRight: =14",
        "Fill: =If(ThisItem.Title = varBdBatch, %s, %s)" % (ORANGE_T, PAGE),
        "RadiusTopLeft: =10",
        "RadiusTopRight: =10",
        "RadiusBottomLeft: =10",
        "RadiusBottomRight: =10",
        "BorderColor: =If(ThisItem.Title = varBdBatch, %s, %s)" % (ORANGE, LINE),
        "BorderThickness: =1",
    ])
    gal = gallery("galBdBatches", "Horizontal", "colBatch", chip,
                  template=230, height=64,
                  onselect="=Set(varBdBatch, ThisItem.Title); "
                           "Set(varBdSel, If(CountRows(Filter(colBdAll, BatchKey = ThisItem.Title)) > 0, "
                           "First(Filter(colBdAll, BatchKey = ThisItem.Title)), Blank()))")
    picker = text("lblBdPickHead", '"Batch"', size=13, color=MUTED, wrap=False)
    picker += gal
    C += container("conBdPicker", "Vertical", picker, indent=24, gap=8, align="Start")

    # ---- stats strip ---------------------------------------------------
    # One card with inline label/value pairs, per the approved mockup. Five
    # separate 104px cards each held three lines of text and read as clutter.
    stats_row = []
    stat_defs = [
        ("Rows in",
         '=Text(Coalesce(LookUp(colBatch, Title = varBdBatch).RowCountIn, 0), "#,##0")',
         INK),
        ("Pre-flight pass",
         '=Text(CountRows(Filter(colBdAll, BatchKey = varBdBatch && PfResult = "PASS")), "#,##0")',
         GREEN),
        ("Blocked",
         '=Text(CountRows(Filter(colBdAll, BatchKey = varBdBatch && PfResult = "BLOCKED")), "#,##0")',
         RED),
        ("Not sendable",
         '=Text(CountRows(Filter(colBdAll, BatchKey = varBdBatch && PfResult = "SKIPPED")), "#,##0")',
         MUTED),
        ("Sent",
         '=Text(Coalesce(LookUp(colBatch, Title = varBdBatch).SentCount, 0), "#,##0")',
         PURPLE),
    ]
    FOCUS = {"Rows in": "RowsIn", "Blocked": "Need", "Sent": "Sent"}
    for label, value, colour in stat_defs:
        pair = []
        key = "BdStat" + label.replace(" ", "").replace("-", "")
        focus = FOCUS.get(label, "")
        pair += text(key + "Lbl", '"%s"' % label, size=12, color=MUTED, wrap=False)
        pair += text(key + "Val", value, size=22,
                     color='If(locStat = "%s", %s, %s)' % (focus, ORANGE_D, colour)
                     if focus else colour,
                     bold=True, wrap=False, label='"%s"' % label)
        stats_row += container("conBdStat" + label.replace(" ", "").replace("-", ""),
                               "Vertical", pair, gap=2, align="Start", fillp=0)
    progress_row = []
    progress_row += text("lblBdProgCap",
                         '"Send progress · sub-batch " & varBdSubBatch & " of " & varBdSubBatches '
                         '& " · " & varBdSentCount & " / " & varBdReadyCount & " sent"',
                         size=12, color=MUTED, wrap=False,
                         label='"Send progress"')
    progress_row += text("lblBdProgPct",
                         'Text(Round(If(varBdReadyCount = 0, 0, varBdSentCount / varBdReadyCount) * 100, 0)) & "%"',
                         size=12, color=INK, bold=True, wrap=False, fillp=1,
                         label='"Send progress percent"')
    stats_body = []
    stats_body += container("conBdStatRow", "Horizontal", stats_row, indent=CANON, gap=34,
                            align="Start", fillp=0)
    stats_body += container("conBdProgCapRow", "Horizontal", progress_row, indent=CANON,
                            gap=12, align="Center", fillp=0)
    stats_body += progress("prgBdBatchTotal",
                           'If(varBdReadyCount = 0, 0, varBdSentCount / varBdReadyCount)',
                           indent=CANON)
    C += card("conBdStats", stats_body, indent=24, gap=14, fillp=0)

    # ---- pre-flight table ----------------------------------------------
    tbl = []
    tbl += text("lblBdPfHead", '"Pre-flight — per row"', size=17, color=INK, bold=True,
                wrap=False)
    tbl += text("lblBdPfCount",
                '=CountRows(Filter(colBdAll, BatchKey = varBdBatch && PfResult = "PASS")) '
                '& " pass · " & CountRows(Filter(colBdAll, BatchKey = varBdBatch && PfResult = "BLOCKED")) '
                '& " blocked · " & CountRows(Filter(colBdAll, BatchKey = varBdBatch && PfResult = "SKIPPED")) '
                '& " not sendable"',
                size=12, color=MUTED, wrap=False,
                label='"Pre-flight pass and blocked counts"')
    # Proportional columns. Fixed widths totalling ~944px clipped on a 13"
    # laptop (main area is width - 252 sidebar - 56 padding); only AWB and the
    # result badge keep a fixed footprint.
    COLS = (("AWB", 0, 124), ("Company", 3, 0), ("Placeholders", 3, 0),
            ("Clearance type", 2, 0), ("Recipient", 2, 0), ("Result", 0, 108))
    hdr = []
    for lbl, portion, minw in COLS:
        hdr += text("lblBdHdr" + lbl.replace(" ", ""), '"%s"' % lbl, size=11, color=MUTED,
                    wrap=False, minw=minw, fillp=portion)
    tbl += container("conBdPfHeader", "Horizontal", hdr, indent=CANON, gap=12, height=28,
                     align="Center")
    tbl += container("conBdHdrLine", "Horizontal", [], indent=CANON, gap=0, height=1,
                     extra=["Fill: =%s" % LINE])

    cells = []
    cells += text("lblBdRowAwb", "ThisItem.Awb", size=13, color=INK, bold=True,
                  wrap=False, minw=124, label='"AWB"')
    cells += text("lblBdRowCo", "ThisItem.Company", size=13, color=INK,
                  wrap=False, minw=0, fillp=3, label='"Consignee company"')
    cells += text("lblBdRowPh", "ThisItem.PfPlaceholders", size=12,
                  color='If(ThisItem.PfResult = "PASS", %s, %s)' % (SOFT, ORANGE_D),
                  wrap=False, minw=0, fillp=3, label='"Placeholders"')
    cells += text("lblBdRowType", "ThisItem.PfType", size=12, color=SOFT,
                  wrap=False, minw=0, fillp=2, label='"Clearance type"')
    cells += text("lblBdRowRec", "ThisItem.PfRecipient", size=12,
                  color='If(ThisItem.PfRecipient = "valid", %s, %s)' % (SOFT, ORANGE_D),
                  wrap=False, minw=0, fillp=2, label='"Recipient"')
    cells += badge("bdgBdRowResult",
                   'ThisItem.PfResult',
                   theme='If(ThisItem.PfResult = "PASS", \'BadgeCanvas.ThemeColor\'.Success, '
                         'If(ThisItem.PfResult = "BLOCKED", \'BadgeCanvas.ThemeColor\'.Warning, '
                         '\'BadgeCanvas.ThemeColor\'.Informative))',
                   minw=108, label='"Pre-flight result"')
    row_inner = container("conBdRowInner", "Horizontal", cells, indent=CANON, gap=12,
                          height=44, align="Center")
    # A hairline under every row: without it the rows read as one grey block.
    row_rule = container("conBdRowLine", "Horizontal", [], indent=CANON, gap=0, height=1,
                         fillp=0, extra=["Fill: =%s" % LINE])
    row_shell = container("conBdRowShell", "Vertical", [row_inner, row_rule], indent=CANON, gap=0,
                          fillp=1, extra=[
        "Width: =Parent.TemplateWidth",
        "Height: =Parent.TemplateHeight",
        "Fill: =If(ThisItem.Awb = varBdSel.Awb, %s, %s)" % (ORANGE_T, WHITE),
        "BorderColor: =" + LINE,
        "BorderThickness: =1",
        "RadiusTopLeft: =8",
        "RadiusTopRight: =8",
        "RadiusBottomLeft: =8",
        "RadiusBottomRight: =8",
    ])
    tbl += gallery("galBdRows", "Vertical", 'Filter(colBdAll, BatchKey = varBdBatch)',
                   [row_shell], indent=CANON, template=54, height=330,
                   onselect="=Set(varBdSel, ThisItem)")
    C += card("conBdPfCard", tbl, indent=24, height=560, gap=14)

    # ---- send panel ----------------------------------------------------
    send_left = []
    send_left += text("lblBdSendHead", '"Send pre-alerts"', size=17, color=INK, bold=True,
                      wrap=False)
    send_left += text("lblBdSendSub",
                      '"Runs in sub-batches of 25, paced. A failed sub-batch is retryable; the rest keep going."',
                      size=13, color=MUTED)
    send_left += text("lblBdSendPreviewHead", '"Preview"', size=12, color=MUTED, wrap=False)
    send_left += text("lblBdSendPreview",
                      'If(IsBlank(varBdSel), "Select a row to preview the rendered pre-alert.", '
                      '"Subject: " & varBdSel.RenderSubject & "   Recipient: " & varBdSel.Email '
                      '& "   Body: " & Left(varBdSel.RenderBody, 160))',
                      size=12, color=INK, label='"Selected row preview"')

    # ---- TEST MODE safety rail -----------------------------------------
    # The allow-list is a hard gate: a row whose recipient is not on it is
    # SKIPPED, never redirected. These two lines make that visible before
    # anyone presses send.
    send_left += text("lblBdGuardMode",
                      'If(varTestMode, '
                      '"TEST MODE · allow-list: " & varAllowlist, '
                      '"LIVE MODE · mail goes to the real consignee.")',
                      size=12, color=ORANGE_D, wrap=True,
                      label='"Test mode and allow-list"')
    send_left += text("lblBdGuardDecision",
                      'If(IsBlank(varBdSel), "No row selected.", '
                      'If(!varTestMode, "LIVE send to " & varBdSel.Email & ".", '
                      'If(Find(";" & Lower(Trim(varBdSel.Email)) & ";", varAllowlist) > 0, '
                      '"Allow-listed: " & varBdSel.Email & " will receive the pre-alert.", '
                      '"Not allow-listed: " & varBdSel.Email & " will be SKIPPED.")))',
                      size=12,
                      color='If(IsBlank(varBdSel), %s, '
                            'If(!varTestMode, %s, '
                            'If(Find(";" & Lower(Trim(varBdSel.Email)) & ";", varAllowlist) > 0, '
                            '%s, %s)))' % (MUTED, ORANGE_D, SOFT, ORANGE_D),
                      wrap=True,
                      label='"Allow-list decision for the selected row"')

    send_right = []
    send_right += text("lblBdSendStatus",
                       'If(varBdSendState = "IDLE", "Ready to send", varBdSendState)',
                       size=14, color=INK, bold=True, wrap=False)
    send_right += text("lblBdSendStatusSub",
                       '"Sub-batch " & varBdSubBatch & " of " & varBdSubBatches '
                       '& "   ·   " & varBdSentCount & " of " & varBdReadyCount & " sent"',
                       size=12, color=MUTED, wrap=False)
    send_right += progress("prgBdSend",
                           'If(varBdReadyCount = 0, 0, varBdSentCount / varBdReadyCount * 100)')
    btn_send_run = (
        "=Set(varBdSendState, \"DRY RUN\");\n"
        "Set(varBdSentCount, 0);\n"
        "Set(varBdSubBatch, 0);\n"
        "Notify(\n"
        "    \"Dry run: \" & CountRows(Filter(colBdAll, BatchKey = varBdBatch "
        "&& PfResult = \"PASS\" && Find(\";\" & Lower(Trim(Email)) & \";\", varAllowlist) > 0)) "
        "& \" of \" & varBdReadyCount\n"
        "    & \" ready rows are allow-listed and would send. \" & varBdBlockedCount "
        "& \" rows are blocked. \"\n"
        "    & \"The mail connector is not attached, so nothing was sent.\",\n"
        "    NotificationType.Warning\n"
        ")"
    )
    send_right += button("btnBdSend",
                         'If(varBdReadyCount = 0, "NOTHING READY TO SEND", "DRY RUN PRE-FLIGHT")',
                         btn_send_run,
                         appearance="Primary", color=ORANGE, minw=300, height=48)
    send_right += button("btnBdReviewBlocked",
                         '"REVIEW " & varBdBlockedCount & " BLOCKED"',
                         "=Navigate(ScrNeedsAttention, ScreenTransition.None)",
                         appearance="Outline", color=PURPLE, minw=300, height=48)

    if PROBE:
        C += container("conBdProbe", "Vertical", probe_content(), indent=24, gap=4,
                       align="Start")

    send = container("conBdSendLeft", "Vertical", send_left, indent=CANON, gap=6,
                     align="Start", fillp=1)
    send += container("conBdSendRight", "Vertical", send_right, indent=CANON, gap=8,
                      align="Start", extra=["Width: =320", "FillPortions: =0"])
    C += card("conBdSendCard", [container("conBdSend", "Horizontal", send, indent=CANON,
                                           gap=20, align="Center")],
              indent=24, height=250)
    return C


def board_onvisible():
    return """
=Set(varTestMode, Coalesce(LookUp(CD_Setting, Title = "CD_TestMode").SettingValue, "Yes") = "Yes");
Set(varAllowlist, ";" & Lower(Trim(Coalesce(LookUp(CD_Setting, Title = "sendTestAllowlist").SettingValue, ""))) & ";");
Set(varSubBatchSize, If(Value(Coalesce(LookUp(CD_Setting, Title = "SubBatchSize").SettingValue, "0")) <= 0, 25, Value(LookUp(CD_Setting, Title = "SubBatchSize").SettingValue)));
Set(varSendable, "|" & Substitute(Coalesce(LookUp(CD_Setting, Title = "sendableEndResults").SettingValue, "NFBRK;FEBRK-JEENA;FEBRK-SUNIMPEX"), ";", "|") & "|");
Set(varBdBatch, Coalesce(LookUp(SortByColumns(colBatch, "UploadedAt", SortOrder.Descending), Title <> "").Title, ""));
Set(varBdSel, Blank());
Set(varBdSendState, "IDLE");
Set(varBdSentCount, 0);
Set(varBdSubBatch, 0);
Set(varBdSubBatches, 0);
Set(varBdReadyCount, 0);
Set(varBdBlockedCount, 0);
ClearCollect(colBdAll, %s);
Set(varBdReadyCount, CountRows(Filter(colBdAll, BatchKey = varBdBatch && PfResult = "PASS")));
Set(varBdBlockedCount, CountRows(Filter(colBdAll, BatchKey = varBdBatch && PfResult = "BLOCKED")));
Set(varBdSubBatches, If(varBdReadyCount = 0, 0, RoundUp(varBdReadyCount / varSubBatchSize, 0)));
Set(varBdSel, If(CountRows(Filter(colBdAll, BatchKey = varBdBatch)) > 0, First(Filter(colBdAll, BatchKey = varBdBatch)), Blank()))
""" % preflight_expr()


def main():
    screens = {}
    screens["ScrBatchBoard"] = shell(
        "Bd", "ScrBatchBoard", "Batch board", "Board",
        onvisible=board_onvisible(), content=board_content())

    for name, text_yaml in screens.items():
        path = os.path.join(OUT, "%s.pa.yaml" % name)
        with open(path, "w") as fh:
            fh.write(text_yaml)
        print("wrote %s (%d lines)" % (path, text_yaml.count("\n")))

    app_path = os.path.join(OUT, "App.pa.yaml")
    with open(app_path, "w") as fh:
        fh.write(app_yaml())
    print("wrote %s" % app_path)
    return 0


if __name__ == "__main__":
    sys.exit(main())
