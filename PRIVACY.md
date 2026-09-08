# Privacy Policy for Tether

Tether is a browser extension that synchronizes video playback between two people watching the same streaming service in separate browser tabs, plus a small shared notes pad and chat for people using it together.

## What Tether does and does not do

Tether never accesses, records, or transmits the video content you stream. It only reads the play/pause state and current timestamp of the video player already visible on the page you're on, and shares that timing information with the other person in your room so your playback stays in sync.

## What data is stored

Using Tether sends the following to a Firebase Realtime Database (a cloud database), so it can be shared between the people in your room:

- Playback state: whether the video is playing or paused, and its current timestamp
- Chat messages you type into the extension's Chat tab
- Notes you type into the extension's Notes tab
- A randomly generated room code, used to keep separate groups of users from seeing each other's data

This data lives under a room code that only you and whoever you share that code with know. Tether does not collect your name, email address, IP address, or any information about which websites you visit beyond detecting that you have a supported streaming site open.

## Data sharing

Tether does not sell, rent, or share your data with any third party, other than Firebase (Google), which is the database used to relay it between your own devices and the people you choose to share a room code with. Tether's developer does not separately access, read, or use the contents of your chats or notes.

## Data retention and deletion

Chat and notes data persists in the shared database for as long as the room exists. Deleting the extension does not delete existing room data. To request deletion of data associated with a specific room code, open an issue at [github.com/tamkin-anwar/tether/issues](https://github.com/tamkin-anwar/tether/issues).

## Changes to this policy

This policy may be updated as Tether adds features. Check back here for the current version.

Contact: [github.com/tamkin-anwar/tether/issues](https://github.com/tamkin-anwar/tether/issues)

---

Tether is built and run by Anwar Creative Studio. If anything here ever stops matching what the extension actually does, tell us directly.
