// ============================================================
// VoteCapsule™ — API Gateway JWT Lambda Authorizer
// Validates Cognito JWT, extracts custom claims, injects as
// context so API GW can forward them as x-* headers to services.
//
// Context keys injected (accessible as $context.authorizer.KEY):
//   userId           → custom:userId  (or sub fallback)
//   tenantId         → custom:tenantId
//   userRole         → custom:roles   (primary role)
//   wardCode         → custom:wardCode
//   constituencyCode → custom:constituencyCode
//   candidateId      → custom:candidateId
//   platformAdmin    → custom:platformAdmin
// ============================================================
'use strict';

const https   = require('https');
const crypto  = require('crypto');

// ── JWKS cache ────────────────────────────────────────────────
const JWKS_CACHE = { keys: null, fetchedAt: 0 };
const JWKS_TTL   = 3600 * 1000; // 1 hour

const REGION    = process.env.COGNITO_REGION    || 'us-east-1';
const POOL_ID   = process.env.COGNITO_POOL_ID   || 'us-east-1_i3N2tg34A';
const AUDIENCE  = process.env.COGNITO_AUDIENCE  || '3hi86ci06546ki038k6msmik0s';
const ISSUER    = `https://cognito-idp.${REGION}.amazonaws.com/${POOL_ID}`;
const JWKS_URL  = `${ISSUER}/.well-known/jwks.json`;

// ── Helpers ───────────────────────────────────────────────────

function base64urlDecode(str) {
  const base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  return Buffer.from(base64, 'base64').toString('utf8');
}

function decodeJwt(token) {
  const parts = token.split('.');
  if (parts.length !== 3) throw new Error('Invalid JWT structure');
  const header  = JSON.parse(base64urlDecode(parts[0]));
  const payload = JSON.parse(base64urlDecode(parts[1]));
  return { header, payload, signature: parts[2], raw: parts };
}

function fetchJwks() {
  return new Promise((resolve, reject) => {
    https.get(JWKS_URL, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch (e) { reject(e); }
      });
    }).on('error', reject);
  });
}

async function getPublicKey(kid) {
  const now = Date.now();
  if (!JWKS_CACHE.keys || (now - JWKS_CACHE.fetchedAt) > JWKS_TTL) {
    const jwks          = await fetchJwks();
    JWKS_CACHE.keys     = jwks.keys;
    JWKS_CACHE.fetchedAt = now;
  }
  const key = JWKS_CACHE.keys.find(k => k.kid === kid);
  if (!key) throw new Error(`Key ID ${kid} not found in JWKS`);
  return key;
}

// Convert JWK to PEM using Node built-ins (no external deps)
function jwkToPem(jwk) {
  const keyObject = crypto.createPublicKey({ key: jwk, format: 'jwk' });
  return keyObject.export({ type: 'spki', format: 'pem' });
}

function verifyJwt(token, pem, audience, issuer) {
  return new Promise((resolve, reject) => {
    const { header, payload, raw } = decodeJwt(token);
    const signingInput = `${raw[0]}.${raw[1]}`;
    const sig = Buffer.from(raw[2].replace(/-/g, '+').replace(/_/g, '/'), 'base64');

    const verify = crypto.createVerify('SHA256');
    verify.update(signingInput);
    const valid = verify.verify(pem, sig);

    if (!valid) return reject(new Error('Signature verification failed'));

    const now = Math.floor(Date.now() / 1000);
    if (payload.exp && payload.exp < now) return reject(new Error('Token expired'));
    if (payload.iss !== issuer) return reject(new Error(`Invalid issuer: ${payload.iss}`));
    if (payload.token_use !== 'id' && payload.token_use !== 'access') {
      return reject(new Error(`Invalid token_use: ${payload.token_use}`));
    }

    resolve(payload);
  });
}

// ── Handler ───────────────────────────────────────────────────

exports.handler = async (event) => {
  // Support both HTTP API (v2) simple response and REST API policy response
  const token = (event.headers?.authorization || event.headers?.Authorization || '')
    .replace(/^Bearer\s+/i, '');

  if (!token) {
    return { isAuthorized: false };
  }

  try {
    const { header } = decodeJwt(token);
    const jwk  = await getPublicKey(header.kid);
    const pem  = jwkToPem(jwk);
    const claims = await verifyJwt(token, pem, AUDIENCE, ISSUER);

    // Extract custom claims — Cognito uses "custom:attrName" as the key
    const userId           = claims['custom:userId']           || claims.sub         || '';
    const tenantId         = claims['custom:tenantId']         || '';
    const userRole         = claims['custom:roles']            || '';
    const wardCode         = claims['custom:wardCode']         || '';
    const constituencyCode = claims['custom:constituencyCode'] || '';
    const candidateId      = claims['custom:candidateId']      || '';
    const platformAdmin    = claims['custom:platformAdmin']    || 'false';

    // HTTP API v2 simple response — context is forwarded as $context.authorizer.KEY
    return {
      isAuthorized: true,
      context: {
        userId,
        tenantId,
        userRole,
        wardCode,
        constituencyCode,
        candidateId,
        platformAdmin,
        sub: claims.sub || '',
      },
    };
  } catch (err) {
    console.error('Authorization failed:', err.message);
    return { isAuthorized: false };
  }
};
