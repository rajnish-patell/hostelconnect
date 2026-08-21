process.env.NODE_ENV = 'test';
const http = require('http');
const prisma = require('../src/utils/prisma');
const app = require('../src/server');
const { hashOtp } = require('../src/utils/otpService');

function makeRequest(options, postData) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
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

async function runAllScenarios() {
  console.log('=====================================================');
  console.log('     OTP ZERO-EXPOSURE & SECURITY VERIFICATION SUITE  ');
  console.log('=====================================================\n');

  const PORT = 5006;
  const server = app.listen(PORT, async () => {
    try {
      const email = 'patelrajnish47@gmail.com';

      // 1. Ensure test Parent exists
      let parent = await prisma.parent.findFirst({ where: { email } });
      if (!parent) {
        parent = await prisma.parent.create({
          data: { email, mobile: '9876543210', name: 'Rajnish Patel' },
        });
      }

      // Cleanup prior OTP records for test email
      await prisma.parentOtp.deleteMany({ where: { destination: email } });

      // SCENARIO 1: POST /api/send-otp Zero-Exposure Check
      console.log('--- Scenario 1: POST /api/send-otp Response Payload Audit ---');
      const sendRes = await makeRequest(
        { hostname: 'localhost', port: PORT, path: '/api/send-otp', method: 'POST', headers: { 'Content-Type': 'application/json' } },
        { email }
      );

      console.log('API Response Payload:', JSON.stringify(sendRes.data));
      const hasSecrets = !!(sendRes.data.data || sendRes.data.otp || sendRes.data.previewUrl || sendRes.data.testingOtp || sendRes.data.verificationCode);
      if (sendRes.status === 200 && sendRes.data.success && !hasSecrets) {
        console.log('✅ PASS: /api/send-otp returned status 200 with generic message and ZERO exposed secrets!\n');
      } else {
        console.error('❌ FAIL: Exposed fields detected in /api/send-otp response:', sendRes);
        process.exit(1);
      }

      // SCENARIO 2: 60-second Resend Cooldown Rate Limiting
      console.log('--- Scenario 2: Resend Cooldown (Within 60s) ---');
      const cooldownRes = await makeRequest(
        { hostname: 'localhost', port: PORT, path: '/api/send-otp', method: 'POST', headers: { 'Content-Type': 'application/json' } },
        { email }
      );
      if (cooldownRes.status === 429 && !cooldownRes.data.success && cooldownRes.data.message?.includes('wait')) {
        console.log(`✅ PASS: Rate limiter enforced 60s cooldown (HTTP 429): "${cooldownRes.data.message}"\n`);
      } else {
        console.error('❌ FAIL: Cooldown rate limit not enforced:', cooldownRes);
        process.exit(1);
      }

      // SCENARIO 3: Wrong OTP Code Rejection & Generic Error Message
      console.log('--- Scenario 3: Wrong OTP Code Rejection & Generic Message ---');
      // Seed a known hashed OTP code '654321' for test email
      await prisma.parentOtp.deleteMany({ where: { destination: email } });
      await prisma.parentOtp.create({
        data: {
          parentId: parent.id,
          channel: 'email',
          destination: email,
          otpHash: hashOtp('654321'),
          otpExpiresAt: new Date(Date.now() + 5 * 60 * 1000),
          otpAttempts: 0,
        },
      });

      const wrongVer = await makeRequest(
        { hostname: 'localhost', port: PORT, path: '/api/verify-otp', method: 'POST', headers: { 'Content-Type': 'application/json' } },
        { email, otp: '111111' }
      );
      if (wrongVer.status === 400 && wrongVer.data.message === 'Invalid or expired verification code.') {
        console.log('✅ PASS: Wrong OTP rejected with 400 and generic error: "Invalid or expired verification code."\n');
      } else {
        console.error('❌ FAIL: Wrong OTP handling unexpected response:', wrongVer);
        process.exit(1);
      }

      // SCENARIO 4: 5 Failed Attempts Cap & Invalidation
      console.log('--- Scenario 4: Maximum 5 Incorrect Attempts Cap ---');
      // Make 4 more wrong attempts (reaching 5 total attempts)
      for (let i = 0; i < 4; i++) {
        await makeRequest(
          { hostname: 'localhost', port: PORT, path: '/api/verify-otp', method: 'POST', headers: { 'Content-Type': 'application/json' } },
          { email, otp: '222222' }
        );
      }
      // Record should now be deleted after 5 failed attempts
      const remainingRec = await prisma.parentOtp.findFirst({ where: { destination: email } });
      if (!remainingRec) {
        console.log('✅ PASS: OTP record auto-deleted from DB after 5 failed attempts.\n');
      } else {
        console.error('❌ FAIL: Record was not deleted after 5 failed attempts:', remainingRec);
        process.exit(1);
      }

      // SCENARIO 5: Correct OTP Verification & JWT Issuance
      console.log('--- Scenario 5: Correct OTP Verification ---');
      const validCode = '987654';
      await prisma.parentOtp.create({
        data: {
          parentId: parent.id,
          channel: 'email',
          destination: email,
          otpHash: hashOtp(validCode),
          otpExpiresAt: new Date(Date.now() + 5 * 60 * 1000),
          otpAttempts: 0,
        },
      });

      const validVer = await makeRequest(
        { hostname: 'localhost', port: PORT, path: '/api/verify-otp', method: 'POST', headers: { 'Content-Type': 'application/json' } },
        { email, otp: validCode }
      );
      if (validVer.status === 200 && validVer.data.data?.token) {
        console.log('✅ PASS: Correct OTP verified successfully with status 200 OK & JWT token issued.\n');
      } else {
        console.error('❌ FAIL: Correct OTP verification failed:', validVer);
        process.exit(1);
      }

      // SCENARIO 6: Prevent OTP Reuse
      console.log('--- Scenario 6: Prevent OTP Re-use (Replay Attack Protection) ---');
      const reuseVer = await makeRequest(
        { hostname: 'localhost', port: PORT, path: '/api/verify-otp', method: 'POST', headers: { 'Content-Type': 'application/json' } },
        { email, otp: validCode }
      );
      if (reuseVer.status === 400 && reuseVer.data.message === 'Invalid or expired verification code.') {
        console.log('✅ PASS: OTP reuse rejected cleanly with status 400.\n');
      } else {
        console.error('❌ FAIL: OTP reuse permitted:', reuseVer);
        process.exit(1);
      }

      // SCENARIO 7: Expired OTP Code Rejection (>5 min)
      console.log('--- Scenario 7: Expired OTP Code Rejection ---');
      await prisma.parentOtp.create({
        data: {
          parentId: parent.id,
          channel: 'email',
          destination: email,
          otpHash: hashOtp('123987'),
          otpExpiresAt: new Date(Date.now() - 1000), // expired 1s ago
          otpAttempts: 0,
        },
      });

      const expiredVer = await makeRequest(
        { hostname: 'localhost', port: PORT, path: '/api/verify-otp', method: 'POST', headers: { 'Content-Type': 'application/json' } },
        { email, otp: '123987' }
      );
      if (expiredVer.status === 400 && expiredVer.data.message === 'Invalid or expired verification code.') {
        console.log('✅ PASS: Expired OTP rejected with generic error.\n');
      } else {
        console.error('❌ FAIL: Expired OTP allowed:', expiredVer);
        process.exit(1);
      }

      console.log('=====================================================');
      console.log('🏆 ALL 7 OTP SECURITY SCENARIOS PASSED 100% PERFECTLY!');
      console.log('=====================================================');
    } catch (err) {
      console.error('💥 Error running test suite:', err);
    } finally {
      server.close();
      await prisma.$disconnect();
    }
  });
}

runAllScenarios();
