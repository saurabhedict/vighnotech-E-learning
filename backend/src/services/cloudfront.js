import fs from 'node:fs'
import { getSignedUrl } from '@aws-sdk/cloudfront-signer'
import { env } from '../config/env.js'

/**
 * CloudFront signed URLs. With a distribution in front of the (private) S3 bucket,
 * media is edge-cached near viewers — fast worldwide — while access stays gated:
 * a URL is only playable with a valid, short-lived signature we mint here.
 *
 * Two shapes:
 *   • signCloudFrontUrl(key)            → one signed object URL (progressive video)
 *   • signCloudFrontWildcardQuery(pfx)  → a signature covering every object under a
 *                                         prefix (all HLS segments in one folder)
 */

export const cloudFrontEnabled = () => env.cloudfront.configured

let cachedKey = null
function privateKey() {
  if (cachedKey) return cachedKey
  cachedKey = env.cloudfront.privateKeyPath
    ? fs.readFileSync(env.cloudfront.privateKeyPath, 'utf8')
    : env.cloudfront.privateKey
  return cachedKey
}

// CloudFront origin is the bucket root, so the URL path = the S3 object key,
// including any AWS_S3_PREFIX.
const cfBase = () => `https://${env.cloudfront.domain}/${env.s3.prefix || ''}`

// Signed URL for a single object (canned policy). Used for progressive video.
export function signCloudFrontUrl(key, { expiresIn = 14400 } = {}) {
  return getSignedUrl({
    url: `${cfBase()}${key}`,
    keyPairId: env.cloudfront.keyPairId,
    privateKey: privateKey(),
    dateLessThan: new Date(Date.now() + expiresIn * 1000).toISOString(),
  })
}

// Base CloudFront URL for a logical folder prefix (e.g. an HLS bundle dir).
export function cloudFrontBundleBase(prefixPath) {
  return `${cfBase()}${prefixPath}`
}

// A wildcard signature (custom policy) authorizing every object under a prefix —
// e.g. all segments in an HLS folder. Returns just the query string to append to
// each child URL (so one signature covers the whole bundle).
export function signCloudFrontWildcardQuery(prefixPath, { expiresIn = 14400 } = {}) {
  const resource = `${cfBase()}${prefixPath}*`
  const policy = JSON.stringify({
    Statement: [
      { Resource: resource, Condition: { DateLessThan: { 'AWS:EpochTime': Math.floor(Date.now() / 1000) + expiresIn } } },
    ],
  })
  const signed = getSignedUrl({
    url: `${cfBase()}${prefixPath}`,
    keyPairId: env.cloudfront.keyPairId,
    privateKey: privateKey(),
    policy,
  })
  return signed.split('?')[1] || ''
}
