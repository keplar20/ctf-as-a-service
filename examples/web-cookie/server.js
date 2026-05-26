// Tiny vulnerable web app for the CTF platform.
// The flag is injected via the FLAG env var. It's hidden in a cookie
// — players just need to inspect their cookies after visiting the site.

const express = require("express");
const app = express();
const FLAG = process.env.FLAG || "ctf{no_flag_set}";

app.use((req, res, next) => {
  res.cookie("session", "anonymous");
  res.cookie("admin_note", FLAG);
  next();
});

app.get("/", (_req, res) => {
  res.type("html").send(`<!doctype html>
<html><head><title>Cookie Shop</title>
<style>body{font-family:monospace;background:#000;color:#0f0;padding:2rem}</style>
</head><body>
<h1>🍪 The Cookie Shop</h1>
<p>Welcome! We're all out of cookies in the kitchen.</p>
<p>...but check yours.</p>
</body></html>`);
});

app.get("/robots.txt", (_req, res) => {
  res.type("text/plain").send("User-agent: *\nDisallow: /admin\n");
});

const port = Number(process.env.PORT) || 80;
app.listen(port, () => console.log(`web-cookie listening on ${port}`));
