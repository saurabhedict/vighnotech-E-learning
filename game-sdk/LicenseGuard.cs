// LicenseGuard.cs — Vigno in-game device license check.
//
// Drop this single file anywhere under your Unity project's Assets/ folder. It
// runs automatically BEFORE the first scene loads and QUITS the game if it isn't
// running on the licensed machine — so a copied game folder won't run on another
// PC (even the decrypted files extracted at runtime).
//
// HOW IT FITS: the Vigno Launcher decrypts the game, then writes a small signed
// token (disguised filename) into the game's <Game>_Data folder. This script reads
// it, verifies our RSA signature, and checks the bound machine id == this PC.
//
// ── ONE-TIME SETUP (must match your Vigno server) ────────────────────────────
//   1. LICENSE_FILE   : set equal to the server's LICENSE_GUARD_FILE (default "app.dat").
//   2. PUBLIC_KEY_PEM  : paste the key from  GET /.well-known/game-license-public-key
//   Then build your game normally. Done.
//
// Requirements: Unity 2021 LTS+ with Player Settings → "Api Compatibility Level"
//   = .NET Standard 2.1 (needed for RSA.ImportSubjectPublicKeyInfo). Windows target.
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
    // ── EDIT THESE TWO TO MATCH YOUR SERVER ──────────────────────────────────
    const string LICENSE_FILE = "app.dat"; // == server LICENSE_GUARD_FILE

    const string PUBLIC_KEY_PEM =
@"-----BEGIN PUBLIC KEY-----
PASTE_YOUR_KEY_FROM_/.well-known/game-license-public-key
-----END PUBLIC KEY-----";
    // ─────────────────────────────────────────────────────────────────────────

    [Serializable]
    class Payload { public string c; public string m; public string u; public long iat; public long exp; }

    [RuntimeInitializeOnLoadMethod(RuntimeInitializeLoadType.BeforeSceneLoad)]
    static void Check()
    {
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

        using (var rsa = RSA.Create())
        {
            rsa.ImportSubjectPublicKeyInfo(PemToDer(PUBLIC_KEY_PEM), out _);
            bool sigOk = rsa.VerifyData(Encoding.UTF8.GetBytes(body), signature, HashAlgorithmName.SHA256, RSASignaturePadding.Pkcs1);
            if (!sigOk) { reason = "Invalid license signature."; return false; }
        }

        var p = JsonUtility.FromJson<Payload>(Encoding.UTF8.GetString(FromBase64Url(body)));
        long now = DateTimeOffset.UtcNow.ToUnixTimeSeconds();
        if (p == null) { reason = "Unreadable license."; return false; }
        if (p.exp < now) { reason = "License expired — reopen via the Vigno Launcher to refresh."; return false; }
        if (!string.Equals(p.m, MachineId(), StringComparison.OrdinalIgnoreCase))
        { reason = "This copy is not licensed for this device."; return false; }

        return true; // ✓ signed by Vigno, not expired, and bound to THIS machine
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

    static byte[] PemToDer(string pem)
    {
        var sb = new StringBuilder();
        foreach (var line in pem.Split('\n'))
            if (!line.StartsWith("-----")) sb.Append(line.Trim());
        return Convert.FromBase64String(sb.ToString());
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
