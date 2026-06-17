// LicenseGuard.cs — Vigno in-game device license check.
//
// Drop this single file anywhere under your Unity project's Assets/ folder. It
// runs automatically BEFORE the first scene loads and QUITS the game if it isn't
// running on the licensed machine — so a copied game folder won't run elsewhere.
//
// HOW IT FITS: the Vigno Launcher decrypts the game, then writes a small signed
// token (disguised filename) into the game's <Game>_Data folder. This script
// verifies our signature + that the bound machine id == this PC, and quits if not.
//
// ── ONE-TIME SETUP (must match your Vigno server) ────────────────────────────
//   1. LICENSE_FILE   : equal to the server's LICENSE_GUARD_FILE (default "app.dat").
//   2. PUBLIC_MODULUS  : the "modulus" value from  GET /.well-known/game-license-public-key
//   3. PUBLIC_EXPONENT : the "exponent" value from the same place (usually "AQAB").
//   Then build for Windows Standalone as usual.
//
// Why modulus/exponent (not a PEM): Unity's Mono runtime does NOT support PEM
// import (ImportSubjectPublicKeyInfo) — it throws "Operation is not supported on
// this platform". Importing raw modulus/exponent (RSAParameters) works everywhere.
//
// Requirements: Windows Standalone build. Player Settings → Api Compatibility
// Level = .NET Standard 2.1 (or .NET Framework — both work with this method).
// -----------------------------------------------------------------------------

using System;
using System.IO;
using System.Text;
using System.Security.Cryptography;
using UnityEngine;
#if UNITY_STANDALONE_WIN
using Microsoft.Win32;
#endif

public static class LicenseGuard
{
    // ── EDIT THESE TO MATCH YOUR SERVER ──────────────────────────────────────
    const string LICENSE_FILE = "app.dat"; // == server LICENSE_GUARD_FILE

    // From GET /.well-known/game-license-public-key  ("modulus" and "exponent").
    const string PUBLIC_MODULUS = "PASTE_MODULUS_HERE";
    const string PUBLIC_EXPONENT = "AQAB"; // 65537 — paste if your server differs
    // ─────────────────────────────────────────────────────────────────────────

    [Serializable]
    class Payload { public string c; public string m; public string u; public long iat; public long exp; }

    [RuntimeInitializeOnLoadMethod(RuntimeInitializeLoadType.BeforeSceneLoad)]
    static void Check()
    {
        // Don't enforce inside the Unity Editor (no launcher/token there) so devs
        // can keep testing. The guard only runs in real builds.
        if (Application.isEditor) return;

        string reason;
        bool ok;
        try { ok = Validate(out reason); }
        catch (Exception e) { ok = false; reason = "license check error: " + e.Message; }

        if (!ok)
        {
            Debug.LogError("[LicenseGuard] " + reason);
            Quit();
        }
    }

    static bool Validate(out string reason)
    {
        reason = "";
        string path = Path.Combine(Application.dataPath, LICENSE_FILE);
        if (!File.Exists(path)) { reason = "No license found — launch this title through the Vigno Launcher."; return false; }

        string token = File.ReadAllText(path).Trim();
        int dot = token.IndexOf('.');
        if (dot <= 0) { reason = "Malformed license."; return false; }
        string body = token.Substring(0, dot);
        byte[] signature = FromBase64Url(token.Substring(dot + 1));

        // Mono-safe RSA-PKCS1-SHA256 verification (no PEM import).
        using (var rsa = new RSACryptoServiceProvider())
        {
            rsa.ImportParameters(new RSAParameters
            {
                Modulus = FromBase64Url(PUBLIC_MODULUS),
                Exponent = FromBase64Url(PUBLIC_EXPONENT),
            });
            using (var sha = SHA256.Create())
            {
                byte[] hash = sha.ComputeHash(Encoding.UTF8.GetBytes(body));
                var deformatter = new RSAPKCS1SignatureDeformatter(rsa);
                deformatter.SetHashAlgorithm("SHA256");
                if (!deformatter.VerifySignature(hash, signature)) { reason = "Invalid license signature."; return false; }
            }
        }

        var p = JsonUtility.FromJson<Payload>(Encoding.UTF8.GetString(FromBase64Url(body)));
        long now = DateTimeOffset.UtcNow.ToUnixTimeSeconds();
        if (p == null) { reason = "Unreadable license."; return false; }
        if (p.exp < now) { reason = "License expired — reopen via the Vigno Launcher to refresh."; return false; }
        if (!string.Equals(p.m, MachineId(), StringComparison.OrdinalIgnoreCase))
        { reason = "This copy is not licensed for this device."; return false; }

        return true; // ✓ signed by Vigno, not expired, bound to THIS machine
    }

    // Same id the launcher binds the token to (Windows MachineGuid from the registry).
    static string MachineId()
    {
#if UNITY_STANDALONE_WIN
        try
        {
            using (var k = Registry.LocalMachine.OpenSubKey(@"SOFTWARE\Microsoft\Cryptography"))
                return k != null ? (k.GetValue("MachineGuid") as string ?? "") : "";
        }
        catch { return ""; }
#else
        return SystemInfo.deviceUniqueIdentifier;
#endif
    }

    static byte[] FromBase64Url(string s)
    {
        s = s.Replace('-', '+').Replace('_', '/');
        switch (s.Length % 4) { case 2: s += "=="; break; case 3: s += "="; break; }
        return Convert.FromBase64String(s);
    }

    static void Quit()
    {
#if UNITY_EDITOR
        UnityEditor.EditorApplication.isPlaying = false;
#else
        Application.Quit();
        // Hard stop so nothing runs after a failed check (Application.Quit is deferred).
        System.Diagnostics.Process.GetCurrentProcess().Kill();
#endif
    }
}
