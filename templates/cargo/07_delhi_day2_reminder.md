# 07 — Delhi Second-Day Reminder
**Source:** `cargo-paf/Template/POST/second day/mail.md` (35 lines)
**Route:** Delhi · D/O not collected, second reminder
**Status:** DRAFT — awaiting sign-off

**Subject**
```
Reminder: D/O collection overdue | AWB {{AWB}}, {{CONSIGNEE}}
```

---

Dear Customer,

This shipment has arrived at **Delhi** under cargo mode, and the **Delivery Order is still pending for collection.**

The administration fee now applies. The D/O charges for collection the following day or later are **INR 4,248 (INR 3,600 + 18% GST) per shipment.**

{{FEE_TABLE}}

Authorization letter and GST details are **compulsory**.

### For collection

Please write to **{{DO_MAILBOX}}** for D/O collection.

For freight-related queries please write to **{{FREIGHT_MAILBOX}}**.

{{DESK_SIGN_OFF}}

---

## Changes from source

| Source | Was | Now |
|---|---|---|
| `mail.md:1` | `Dear Customer,` — a different salutation from every other template | "Dear Sir or Madam" |
| **no subject line** | The file has no subject; the operator wrote one each time | subject defined |
| `mail.md:5` | *"Please refer details given below to file Bill of Entry by your CHA"* | **removed — see below** |
| `mail.md:9-11` | A sentence about DO charges, no table | `{{FEE_TABLE}}` |
| `mail.md:13` | Trailing whitespace after "compulsory" | — |
| `mail.md:33` | `Ayush Saklani \| Clearance Administrator, Delhi \| office 18001033339 \| Ext:891008` | `{{DESK_SIGN_OFF}}` — **A-2** |
| `mail.md:34` | Postal address hard-coded | signature-block config |

### ⚠️ One content change, flagged

`second day/mail.md:5` opens *"Please refer details given below to file Bill of Entry by your CHA:"* and then the rest of the mail is **only about D/O charges and how to pay them.** Nothing about filing a Bill of Entry follows.

Either the BOE instruction was left over from a different mail, or the D/O is genuinely the only outstanding item. I have written the template as the D/O reminder it evidently is, and removed the dangling BOE sentence.

**If the second-day mail is also meant to chase a late Bill of Entry, say so** — that is a real requirement I should not have decided alone, and it changes which facts this mail must carry.
