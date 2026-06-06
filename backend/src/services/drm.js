import { env } from '../config/env.js'

/**
 * Studio-grade video DRM integration point (Doc 2 §1 "Video DRM (optional)").
 * Real Widevine/FairPlay requires a provider (Mux or VdoCipher) and a licensed
 * player. This returns the playback descriptor when a provider is configured AND
 * the content has a DRM asset; otherwise null, so the app falls back to HLS.
 *
 * TO GO LIVE: replace the stand-in token below with a real provider call:
 *   - Mux:       sign a JWT with MUX_TOKEN_ID/SECRET for the playbackId.
 *   - VdoCipher: POST /videos/:id/otp with VDOCIPHER_API_SECRET → { otp, playbackInfo }.
 */
export const drmConfigured = () => env.drm.configured

export async function getDrmPlayback(content) {
  if (!env.drm.configured) return null
  if (!content?.drm?.provider || !content?.drm?.assetId) return null
  return {
    provider: content.drm.provider,
    assetId: content.drm.assetId,
    // Stand-in — replace with a provider-minted, short-lived playback token.
    playbackToken: `standin_${content._id}`,
    note: 'DRM stand-in: wire the provider SDK to mint a real Widevine/FairPlay token.',
  }
}
