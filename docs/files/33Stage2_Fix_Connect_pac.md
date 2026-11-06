# Stage 2 Fix — Get pac Connected
**Status:** you are signed in. The connection just needs the right environment value.

---

## What just happened

Read your output carefully, because most of it was good news:

```
'bipul.sikder@fedex.com' authenticated successfully.     ← your sign-in WORKED
Error: The value passed to '--environment' is invalid.    ← only the environment failed
```

**Authentication succeeded.** You signed in, MFA passed, Microsoft accepted you. The failure is one value: the URL.

### Why the URL was wrong

You passed this:

```
https://make.powerapps.com/e/Default-b945c813-.../canvas?utm_source=office&utm_medium=...
```

That is a **Power Apps portal link** — the address your browser uses to open the app builder. It contains campaign tracking tags and points at a web page, not a database.

`pac` needs to connect to a **Dataverse environment**, which has a different address: `https://yourorg.crm.dynamics.com`

Same environment, two completely different addresses:

| Purpose | Address shape |
|---|---|
| What your browser uses | `https://make.powerapps.com/e/<id>/canvas?...` |
| What `pac` needs | `https://<org>.crm.dynamics.com` |

**No harm done.** The sign-in was valid. Only the connection step needs redoing, and it will be faster this time because the browser session is already warm.

### About the browser page

> "Authentication complete. You can return to the application... For your security: Do not share the contents of this page, the address bar, or take screenshots."

That page is **empty of anything useful** — it is a standard Microsoft sign-in completion screen. There is no code, token, or secret on it. Nothing was exposed, and you have nothing to redact. Microsoft shows this on every device-code sign-in.

You do not need to close anything or worry about it. Just switch back to the terminal.

---

## The fix: two commands

The cleanest path is to let `pac` discover your environments, rather than guessing the URL.

### Command 1 — sign in, no environment

```bash
pac auth create
```

**No `--environment` this time.** Note the difference:

| You ran | Correct |
|---|---|
| `pac auth create --environment "https://make.powerapps.com/..."` | `pac auth create` |

Your browser will open again — just sign in, it should be quicker. This creates a profile attached to your account.

### Command 2 — see what you actually have access to

```bash
pac auth who
```

```bash
pac env list
```

`pac env list` calls Microsoft's Global Discovery Service and shows **every environment your account can reach**, with its real URL. This is the command that tells us the correct value.

---

## What to send me

The output of these two:

```bash
pac auth who
```

```bash
pac env list
```

### What I am looking for

`pac env list` will show rows like this:

```
Display Name          Environment Id    Type        Url
-------------          ------------    ----        ---
MyFedEx (Upgrade)     Default-b945...   Default     https://orgXXXXX.crm.dynamics.com
```

**The `Url` column is what I need.** That is the value for `--environment` in every future command.

---

## What happens next, depending on what we find

This is why listing first matters — the answer changes the plan.

### If a usable environment appears

You may already have somewhere to build. If `MyFedEx (Upgrade)` is a real environment you can write to, we skip the Developer Plan signup entirely and start on the schema today.

That would be the fastest possible outcome.

### If it is read-only or limited

You have a Maker role but no write access. Then we use the free **Power Apps Developer Plan** as planned, and your FedEx access request continues in parallel with your manager.

### If nothing is listed

Then the developer environment is the only route, and we go back to Stage 1.

**All three outcomes are fine.** None of them block you. We find out in one command.

---

## One thing worth knowing

The environment ID in the link you used — `Default-b945c813-dce6-41f8-8457-5a12c2fe15bf` — is a real environment in your FedEx tenant. It exists and your account can open it.

**That is worth knowing for a second reason:** the wall you hit earlier was *"disabled environment creation for non-admin users."* That blocks creating **new** environments. It does not necessarily mean you lack access to the **existing** one.

So the question your manager's access request needs to answer is narrower than drafted: not "please create an environment" but "please grant me write access to this one that already exists."

I will adjust doc 24 once we see what `pac env list` returns. That is a smaller ask, and smaller asks get approved faster.

---

## Summary

| Item | State |
|---|---|
| `dotnet` + `pac` | ✅ installed, 2.12.2 |
| Your sign-in | ✅ **worked** — `bipul.sikder@fedex.com` |
| Environment connection | ❌ wrong URL — portal link, not Dataverse |
| Security exposure | ✅ none |
| Next action | `pac auth create` (no `--environment`) then `pac env list` |

**Two commands. Send me the output and I will know exactly where we stand.**

---

**For:** Bipul Sikder · Trace / Clearance Desk
