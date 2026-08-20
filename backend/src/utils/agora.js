/**
 * Simple Agora token generator (for production use official agora-access-token package)
 * Install: npm install agora-access-token
 *
 * This is a placeholder that returns mock tokens if Agora credentials are missing.
 */

const { RtcTokenBuilder, RtcRole } = (() => {
  try {
    return require('agora-access-token');
  } catch (e) {
    return { RtcTokenBuilder: null, RtcRole: null };
  }
})();

const config = require('../config');

function generateAgoraToken(channelName, uid, role = 'publisher') {
  if (!RtcTokenBuilder || !config.agora.appId || !config.agora.appCertificate) {
    // Mock token for development
    return `mock_token_${channelName}_${uid}_${Date.now()}`;
  }

  const expirationTimeInSeconds = 3600; // 1 hour
  const currentTimestamp = Math.floor(Date.now() / 1000);
  const privilegeExpiredTs = currentTimestamp + expirationTimeInSeconds;

  const roleType = role === 'publisher' ? RtcRole.PUBLISHER : RtcRole.SUBSCRIBER;

  return RtcTokenBuilder.buildTokenWithUid(
    config.agora.appId,
    config.agora.appCertificate,
    channelName,
    uid,
    roleType,
    privilegeExpiredTs
  );
}

module.exports = { generateAgoraToken };
