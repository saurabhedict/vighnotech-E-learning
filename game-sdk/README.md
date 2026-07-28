# Vigno Game SDK — device-locked licensing (`LicenseGuard`)

Make a game refuse to run on any machine except the one it was licensed for —
even if someone copies the **decrypted, extracted** game folder to another PC.

This closes the "copy the running game folder and share it" gap. It is a strong
deterrent (stops virtually all casual copying); like all client-side DRM, a
determined reverse-engineer can still patch the check out of the binary.

## How it works

```
Buyer clicks Play in the Vigno Launcher
        │
        ├─ Launcher verifies license + device with the server
        ├─ Server signs a token bound to THIS machine's GUID (RSA-2048)
        ├─ Launcher decrypts + extracts the game, and writes the token into
        │  <Game>_Data/<disguised-name>   (e.g. app.dat)
        └─ Game starts → LicenseGuard runs BEFORE the first scene:
              • verifies our signature (token can't be forged)
              • checks token's machine id == this PC's machine id
              • checks not expired
            → mismatch / missing / expired  ⇒  game quits immediately
```

A copied folder carries a token bound to the **original** machine, so on any other
PC the machine id won't match → the game quits. A copied folder **without** the
token → no license → quits. The token can't be forged (only the server has the
private key).

## Integrate (one file, ~2 minutes)

1. Copy [`LicenseGuard.cs`](./LicenseGuard.cs) anywhere under your game's `Assets/`.
2. Get the public key:
   ```
   GET https://<your-api>/.well-known/game-license-public-key
   ```
   Paste it into `PUBLIC_KEY_PEM` in the script.
3. Set `LICENSE_FILE` in the script to match the server's `LICENSE_GUARD_FILE`
   (default `app.dat`). Choose something that blends into `_Data` (e.g.
   `app.dat`, `resources.dat`) and set the SAME value in the backend `.env`.
4. **Player Settings → Other → Api Compatibility Level = `.NET Standard 2.1`.**
5. Build for **Windows (Standalone)** as usual.

That's it — every build is now device-locked.

## Configure the server

In `backend/.env`:
```
LICENSE_GUARD_FILE=app.dat        # disguised filename (must match the Unity script)
GAME_LICENSE_TTL_DAYS=7           # how long a token stays valid offline
```
The signing keypair is generated automatically into `backend/keys/` on first use
(`game-license-private.pem` / `-public.pem`). **Never commit the private key.**

## Test it

1. Build the game with the guard + launch it through the Vigno Launcher on your PC
   → it runs (valid token for this machine).
2. Copy the extracted game folder (from `%Temp%\vigno-game-…` while it runs) to a
   second PC and run the `.exe` directly → **it quits** ("not licensed for this
   device").

## Honest limits (tell stakeholders)

- ✅ Stops casual copying/sharing of the decrypted folder — the headline win.
- ✅ Token is unforgeable and device-bound; expires; works offline within the TTL.
- ❌ A skilled cracker can disassemble the build and remove the check — true of
  **all** PC DRM (Steam, Denuvo included). For a hard guarantee that files never
  reach the user, the only answer is **cloud-streaming** the game.

To raise the bar further: obfuscate the build (e.g. an IL2CPP build + a commercial
packer/anti-tamper) so the guard is much harder to locate and patch.
