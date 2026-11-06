# Do This Now — 2 Commands

**Copy these. Run them. Send me the output.**

---

## Command 1

```bash
pac auth create
```

⏎ Enter.

**Your browser will open.** Sign in. Done.

> ⚠️ **No `--environment` this time.** That flag is what failed last time.

---

## Command 2

```bash
pac env list
```

⏎ Enter.

**Send me the output of this.**

---

## That's it

| | |
|---|---|
| Time | 2 minutes |
| Approvals needed | none |
| Passwords needed | none |

---

## Why command 2 matters

`pac env list` shows every environment your FedEx account can open, **with the correct web address**.

Last time you gave `pac` a browser link. It needed this instead:

```
https://<something>.crm.dynamics.com
```

Command 2 prints that. Then we know exactly where to build.

---

## Nothing to worry about

**The browser page you saw** ("Authentication complete, do not share...") — it is empty. No code, no token, no secret. Microsoft shows it on every sign-in. **Nothing was exposed.**

**You already signed in successfully.** `'bipul.sikder@fedex.com' authenticated successfully` — that part worked. Only the address was wrong.

---

## Stuck?

| Message | What to do |
|---|---|
| Browser does not open | Look for a code printed in the terminal. Open the URL it shows, on your phone if easier |
| Terminal asks for a tenant | Skip it. Press ⏎ — Enter alone works |
| It says "invalid" again | Send me the output, do not retry blindly |
| Nothing happens for 30s | Wait. Then ⌃C and try once more |

---

**Just the two commands. Then paste what `pac env list` says.**

---
*Once that works, the build starts. I write the database, you approve, one command puts it live.*
