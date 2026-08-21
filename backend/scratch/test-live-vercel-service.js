const https = require('https');

function makeHttpsRequest(options, postData) {
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(body) });
        } catch {
          resolve({ status: res.statusCode, body });
        }
      });
    });
    req.on('error', reject);
    if (postData) {
      req.write(JSON.stringify(postData));
    }
    req.end();
  });
}

async function testLiveService() {
  console.log('=====================================================');
  console.log('    TESTING LIVE VERCEL SERVICE (PRODUCTION API)    ');
  console.log('=====================================================\n');

  try {
    // 1. Health Check
    console.log('[LIVE TEST 1] GET /api/health...');
    const health = await makeHttpsRequest({
      hostname: 'hostel-video-call-app.vercel.app',
      path: '/api/health',
      method: 'GET',
    });

    console.log('Health Check Status:', health.status, 'Response:', health.data);
    if (health.status === 200 && health.data?.success) {
      console.log('✅ PASS: Vercel production API health check is live and healthy!\n');
    } else {
      console.error('⚠️ Health check notice:', health);
    }

    // 2. Test Live /api/auth/parent/request-otp Zero-Exposure Audit
    console.log('[LIVE TEST 2] POST /api/auth/parent/request-otp on Vercel Production...');
    const sendOtpRes = await makeHttpsRequest(
      {
        hostname: 'hostel-video-call-app.vercel.app',
        path: '/api/auth/parent/request-otp',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      },
      { email: 'patelrajnish47@gmail.com' }
    );


    console.log('Live /api/send-otp Response Status:', sendOtpRes.status);
    console.log('Live /api/send-otp Response Payload:', JSON.stringify(sendOtpRes.data));

    const containsExposedSecrets = !!(
      sendOtpRes.data?.otp ||
      sendOtpRes.data?.generatedOtp ||
      sendOtpRes.data?.verificationCode ||
      sendOtpRes.data?.testingOtp ||
      sendOtpRes.data?.debugOtp ||
      sendOtpRes.data?.previewUrl ||
      sendOtpRes.data?.data?.previewUrl
    );

    if (!containsExposedSecrets) {
      console.log('✅ PASS: Live Vercel production response contains ZERO exposed secrets or preview URLs!\n');
    } else {
      console.error('❌ FAIL: Exposed fields detected in live Vercel response:', sendOtpRes);
    }

    console.log('=====================================================');
    console.log('🏆 LIVE VERCEL PRODUCTION SERVICE TEST COMPLETE!');
    console.log('=====================================================');
  } catch (err) {
    console.error('💥 Live test error:', err.message);
  }
}

testLiveService();
