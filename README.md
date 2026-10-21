# World Mission School Student & Events Portal

A React/Vite campus portal with a student dashboard, event schedule and pass reservations, plus an admin stage and live-production control room.

## Run locally

```sh
npm install
npm run dev
```

Use `npm run build` to create a production build and `npm run lint` to run Oxlint.

## OBS live-production control room

The admin control room connects to OBS Studio's WebSocket v5 server. In OBS, enable **Tools → WebSocket Server Settings**, keep the server password enabled, and note the server address and port (OBS defaults to port `4455`). In the control room, enter the WebSocket URL (for a same-computer local setup, `ws://127.0.0.1:4455`) and password, then connect.

After connecting, the control room can load and switch scenes, use Studio Mode preview/take, monitor stream status/runtime/congestion, start or stop streaming and recording, and control OBS audio input mute and levels. Recording uses the destination configured in OBS. To publish a student player, choose an event, enter its public HTTPS YouTube or Vimeo watch link, and start the stream. The player is published only after OBS confirms that its output is active. OBS stream-stop events unpublish it automatically.

Connect cameras and capture cards as sources in OBS scenes. The browser's optional camera preview is only a local monitor; it is not sent to OBS or to students. Browser camera access requires permission and HTTPS or `localhost`.

OBS remains responsible for the streaming provider account, stream key, ingest destination, and output profile. Configure those in OBS; this app never asks for provider credentials. Do not expose the OBS WebSocket port to the public internet. Restrict it with host firewall/network rules, use a strong password, and use a trusted secure `wss://` endpoint for remote access. Browsers may block insecure `ws://` connections from an HTTPS-hosted portal. The password is held only while connecting and is cleared after OBS authenticates; it is not persisted by the app.

## Demo data and production deployment

This frontend has no application backend, authentication service, shared database, or media server. Events, reservations, and on-air state are in-memory demo state and are not synchronized between users or devices; favorites and some presentation preferences are stored in the browser. Uploaded banner photos are local to the browser session. A production deployment needs authenticated admin access, a shared API/database, durable image storage, and an approved streaming/signaling service. OBS connection and live output should be tested with the actual production network, OBS version, capture hardware, and provider before an event.
