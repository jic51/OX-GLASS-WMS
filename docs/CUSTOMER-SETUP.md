# Setting up your warehouse system — Acopio **Pro**

> ### 📦 Which edition are you setting up?
> This guide is for **Acopio Pro** — the one we set up with you, with your team
> and your racks. If you have **Acopio Basic**, the free single-person edition,
> skip to **"If yours is Acopio Basic"** at the end: three steps, none of them
> the ones below.
>
> **The part that confuses people most, said once:** Basic has **no 🏭 Acopio
> menu inside the sheet**, and it is not that it fails to show up — it *cannot*.
> A menu inside a sheet needs a permission Google classes as sensitive, and the
> free edition deliberately does not ask for it, because asking brings up the
> warning screen that edition exists to avoid. Every "🏭 Acopio → …" below is
> a Pro instruction. And **step 4's scary screen never appears in Basic** —
> that is the whole point of it.

> ### ⚠️ IF SOMEBODY CANNOT SIGN IN, START WITH THE ADDRESS
> It is almost always the same cause: **your app's address is not where it needs
> to be**, or is not the same everywhere. Before looking at anything else, open
> your sheet and run **🏭 Acopio → 🔧 Advanced → 🩺 Check this installation** — it
> checks the address and repairs it. If it still will not let anyone in, write to
> whoever set the system up and tell them the exact message you see.


About 10 minutes, once. You do not need to install anything, and you do not need
to be technical — but there is one screen partway through that looks alarming and
isn't. It's explained below, in step 4.

Everything lives in **your own** Google account. Nobody else can see your
inventory, including us.

---

## 1. Make your copy

Open the link you were sent. It ends in `/copy`.

Google asks where to save it. Click **Make a copy**.

> You'll see a note that "functions and the Apps Script file will also be
> copied". That's the system itself — it has to come along. Nothing to change.

The copy is now yours. It lives in your Google Drive.

## 2. Let it start

The setup window opens by itself. If it doesn't, use the menu at the top:
**🏭 Acopio → 🚀 Set Up Acopio**.

Fill in your company name, what you store, where you store it, and who works
there. Take your time — all of it can be changed later from inside the app.

## 3. Publish it

The last step gives you numbered instructions for turning your copy into a web
address your team can open. Follow them exactly.

**One thing the instructions ask for, that people miss:** when Google shows you
the **Web app URL** ending in `/exec`, **copy it before closing that box**. Paste
it where the setup window asks. That address is your system — bookmark it and
share it with your team.

## 4. The scary-looking screen (this is normal)

Partway through publishing, Google shows:

> ⚠️ **Google hasn't verified this app**
> The app is requesting access to sensitive info in your Google Account.

**This is expected, and it is not a warning about us.**

Here's what's actually happening. You just made your own private copy of the
system. That copy is software running under *your* account, authorized by *you* —
so Google shows you the same caution it shows any developer running their own
code for the first time. The email shown as "the developer" is **your own**.

Google reserves the verified badge for apps published centrally to millions of
users. Your copy is not that — it's yours alone, which is exactly the point: your
inventory never passes through anyone else's servers.

**To continue:** click **Advanced**, then **Go to (your project name)**.

You may also see a note about a missing Privacy Policy link. Same reason — a
private copy has no public listing to point at.

## 5. What it asks permission for, and why

| Permission | What it's for |
|---|---|
| See and manage spreadsheets | Reading and writing your own inventory sheet |
| See and manage Drive files | Storing invoices and photos you attach, and the nightly backup |
| Send email as you | Delivery notices to your project managers, and alerts to you |
| Connect to an external service | Reading document text when you use AI Extract |

It never sees anything outside its own folder, and nothing leaves your Google
account.

## 6. Done

Open the link you saved. Bookmark it. Share it with your team — anyone you added
to the user list can sign in with their Google account.

**Turn on the nightly backup** from the spreadsheet menu:
**🏭 Acopio → 🗄 Backup Now / Enable Daily Backup**. It runs at 2am and keeps a
dated copy for 30 days. The app tells you each time one is made.

---

## If yours is Acopio Basic

The free edition installs in three steps and has **no wizard and no menu**.

1. **Open the link we sent you** and accept **"Make a copy"**.
2. In your copy: **Extensions → Apps Script → Deploy → New deployment → Web
   app**. Google asks for permission once; accept it. (Timed on a clean copy:
   **1 minute 47 seconds**. And the "Google hasn't verified this app" screen
   from step 4 **does not appear** — that is the difference this edition exists
   for.)
3. **Copy the address ending in `/exec`** and open it. That is your app.
   Bookmark it; it is how you will always get in.

**Your company name** is typed inside the app the first time you open it: in
Basic there is no wizard in the sheet to ask you for it.

**What this edition does not include**, so you don't go looking: a team with
their own sign-ins, photos and documents, printed labels and code scanning,
expected deliveries, any email at all, the automatic backup, low-stock alerts,
and reading a supplier email or an invoice to fill the entry in. **They are not
hidden** — you can see them in the app, and touching one tells you what it is.
What it does include is never taken away and does not expire. The full list for
each edition is on [acopio.net](https://www.acopio.net/#pro).

**A backup in Basic?** By hand: **File → Make a copy**, with the date in the
name. Do it before importing or before deleting a lot of rows.

---

## If something goes wrong

**"Sorry, unable to open the file at this time"** on the copy link — check the
address has no extra character (a stray period at the end is the usual cause).

**The link from setup doesn't open** — Google sometimes reports the wrong address
here. Go back to the Apps Script editor, **Deploy → Manage deployments**, copy
the URL shown there, and paste it into the setup window using **"Paste the
correct link"**.

**Someone can't get in** — they must be on the user list (Settings → Directory),
and signed in with the Google account that matches the email on that list.
Being on the company's Google domain identifies you; it does not authorise you.
Both are needed.

**Someone without a company email can't get in** — people outside your Google
domain (a personal Gmail, a contractor) need one extra setup step that is
switched on separately. Ask whoever set the system up; the full workflow and
troubleshooting is in `ACCESO-Y-LOGIN.md`.

---

## ⚠️ IF SIGNING IN FAILS, START WITH THE ADDRESS

**🏭 Acopio → 🔧 Advanced → 🩺 Check this installation.** It checks your app's
address and repairs it.

The three messages you might see, and what each one means:

| What you see | What it is |
|---|---|
| *"Sorry, unable to open the file at this time"* | The saved address points somewhere else. **Check this installation** fixes it |
| *"Access blocked — redirect_uri_mismatch"* | A permission is missing on your company's Google account. **You cannot fix this one yourself** — write to whoever set the system up |
| *"Access not granted — this account is not registered"* | **Not the address.** That email is not registered, or is misspelled. An administrator fixes it in ⚙️ Settings → Permissions |
