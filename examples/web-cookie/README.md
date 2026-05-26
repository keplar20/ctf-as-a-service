# web-cookie — sample dynamic challenge

Tiny Express app. Stuffs the per-team flag (injected via `FLAG` env var) into
an `admin_note` cookie. Players solve by checking their browser cookies.

## Build

```bash
docker build -t ctfaas/web-cookie:latest ./examples/web-cookie
```

That's it — no registry push required for local dev; the platform pulls from
your local Docker daemon's image store.

## Use it

In the admin panel, create a **dynamic** challenge with:

- **type**: dynamic
- **Docker image**: `ctfaas/web-cookie:latest`
- **Container port**: `80`
- **Flag**: anything (placeholder — the real flag is generated per team)
- **Category**: web

Add it to an event, publish, then a participant clicks "Start instance" and
gets a unique URL like `http://t-abc123-c-web-coo-def4.localtest.me`.
