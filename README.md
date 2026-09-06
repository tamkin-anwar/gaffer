# Tandem

Watch Netflix together while you're apart — playback stays in sync across both your tabs, plus a shared notes pad and chat, without needing five different apps.

## How it works

Same architecture as Teleparty/SyncUp: this never touches the actual video stream (which is DRM-protected and off-limits to any third party). Instead, each of you streams from your own Netflix account in your own browser tab, and the extension mirrors play/pause/seek events between your tabs through a small shared database. Because it only ever calls standard playback controls, it works within Netflix's terms rather than around them.

That also means **it only works when you're both watching in a desktop browser tab** (e.g. netflix.com in Chrome) — it can't reach into Netflix's iPhone or Smart TV apps, since those don't expose any way for a third-party extension to see or control them.

## One-time setup (you'll need to do this part)

Firebase Realtime Database is the shared "phone line" between your two tabs. I can't create this account for you, but it takes about two minutes:

1. Go to [firebase.google.com](https://firebase.google.com) → **Get started** → sign in with any Google account.
2. **Add project** → name it anything (e.g. "tandem") → you can skip Google Analytics → **Create project**.
3. In the left sidebar, click **Build → Realtime Database** → **Create Database** → pick any location → start in **test mode** for now (we'll paste in real rules below).
4. Once it's created, copy the URL shown at the top of the database page — it looks like `https://tandem-xxxxx-default-rtdb.firebaseio.com`.
5. Click the **Rules** tab (next to Data) and replace the contents with:
   ```json
   {
     "rules": {
       "rooms": {
         "$roomId": {
           ".read": true,
           ".write": true
         }
       }
     }
   }
   ```
   This keeps things simple for now — anyone who knows your room code can read/write it, same trust model as a Google Doc link. It's easy to lock down further later with real accounts if this grows beyond just the two of you.
6. Click **Publish**.

## Installing the extension

1. In Chrome, go to `chrome://extensions`, turn on **Developer mode** (top right).
2. Click **Load unpacked**, and select this `Tandem` folder.
3. Click the Tandem icon in your toolbar, paste the Database URL from step 4 above into **Firebase Database URL**, and click **Save**.
4. Send your girlfriend this same folder (or once we're happy with it, publish it to the Chrome Web Store so she can just install it) and have her do steps 1–3 with the *same* Database URL.
5. One of you opens the popup and copies the **room code**; the other pastes it into **Or enter their room code** and clicks **Join**. You're now in the same room.
6. Both open Netflix, both hit play on the same title — playback will mirror from here.

## What's here now, and what's next

- ✅ Play/pause/seek sync on Netflix, with periodic drift correction so long viewing sessions don't slowly slip out of sync
- ✅ A shared notes pad and a basic chat, both in the popup
- ⏭ Not yet: Hulu/Disney+/Max/Prime Video support (same approach, just needs a small site-specific adapter per service, like `content_scripts/netflix.js`)
- ⏭ Not yet: a shared file drop (needs Firebase Storage, a bit more setup than Realtime Database)
- ⏭ Not yet: an on-page chat overlay while watching, instead of only in the popup

## Credits

Built by **Anwar Creative Studio**.
