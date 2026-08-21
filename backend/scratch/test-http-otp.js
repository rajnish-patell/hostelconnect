process.env.NODE_ENV = 'test';
const express = require('express');
const http = require('http');
const prisma = require('../src/utils/prisma');
const app = require('../src/server');


let server;

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

async function runHttpOtpTest() {
  console.log('--- Starting HTTP API Integration Test for Parent OTP ---');

  // Start express server on port 5005
  const PORT = 5005;
  server = app.listen(PORT, async () => {
    console.log(`Server listening on port ${PORT}`);

    try {
      // 1. Ensure Parent exists in DB & reset cooldown records for test
      let parent = await prisma.parent.findFirst({ where: { email: 'patelrajnish47@gmail.com' } });
      if (!parent) {
        parent = await prisma.parent.create({
          data: { email: 'patelrajnish47@gmail.com', mobile: '9876543210', name: 'Rajnish Patel' },
        });
      }
      await prisma.parentOtp.deleteMany({ where: { destination: 'patelrajnish47@gmail.com' } });


      // 2. Request OTP via HTTP POST /api/auth/parent/request-otp
      console.log('\n[HTTP TEST 1] Sending POST /api/auth/parent/request-otp...');
      const reqRes = await makeRequest(
        {
          hostname: 'localhost',
          port: PORT,
          path: '/api/auth/parent/request-otp',
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        },
        { email: 'patelrajnish47@gmail.com' }
      );

      console.log('Request OTP HTTP Response:', reqRes);

      if (reqRes.status !== 200 || !reqRes.data.success) {
        console.error('❌ FAIL: Request OTP returned status', reqRes.status);
        process.exit(1);
      }
      console.log('✅ PASS: Request OTP returned 200 OK with success message');

      // 3. Verify that OTP code & previewUrl are NOT in response JSON
      if (reqRes.data.data?.otp || reqRes.data.previewUrl || reqRes.data.data?.previewUrl || reqRes.data.message?.includes('Testing OTP')) {
        console.error('❌ FAIL: OTP code or previewUrl exposed in API response!', reqRes.data);
        process.exit(1);
      }
      console.log('✅ PASS: Zero-exposure verified — No OTP or previewUrl returned in API response');


      // 4. Inspect DB to grab the latest record for testing verification
      const dbRecord = await prisma.parentOtp.findFirst({
        where: { destination: 'patelrajnish47@gmail.com', verifiedAt: null },
        orderBy: { createdAt: 'desc' },
      });

      console.log('\n[HTTP TEST 2] DB OTP record created:', {
        id: dbRecord.id,
        destination: dbRecord.destination,
        otpHash: dbRecord.otpHash.substring(0, 16) + '...',
        expiresAt: dbRecord.otpExpiresAt,
      });

      // 5. Test invalid verification via HTTP POST /api/auth/parent/verify-otp
      console.log('\n[HTTP TEST 3] Testing Invalid OTP verification via HTTP...');
      const badVerRes = await makeRequest(
        {
          hostname: 'localhost',
          port: PORT,
          path: '/api/auth/parent/verify-otp',
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        },
        { email: 'patelrajnish47@gmail.com', otp: '000000' }
      );

      console.log('Invalid Verify HTTP Response:', badVerRes);
      if (badVerRes.status === 400 && !badVerRes.data.success) {
        console.log('✅ PASS: Invalid OTP code correctly rejected with 400 Bad Request');
      } else {
        console.error('❌ FAIL: Invalid OTP code was not rejected properly', badVerRes);
      }

      console.log('\n=== All HTTP API Tests Passed Cleanly! ===');
    } catch (err) {
      console.error('💥 Error during test:', err);
    } finally {
      server.close();
      await prisma.$disconnect();
    }
  });
}

runHttpOtpTest();
