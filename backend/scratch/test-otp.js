const { sendOtp, verifyOtp, resendOtp, otpStore } = require('../src/utils/otpService');

async function testOtpEngine() {
  console.log('--- Testing OTP Engine ---');

  // 1. Send Email OTP
  console.log('\n1. Requesting Email OTP...');
  const emailRes = await sendOtp('patelrajnish47@gmail.com');
  console.log('Email OTP Response:', emailRes);

  const storedEmailRecord = otpStore.get('patelrajnish47@gmail.com');
  console.log('Stored OTP Code in Memory:', storedEmailRecord.code);

  // 2. Test Invalid Verification Code
  console.log('\n2. Testing Invalid OTP Code (000000)...');
  const invalidResult = verifyOtp('patelrajnish47@gmail.com', '000000');
  console.log('Invalid Code Verification Result:', invalidResult);

  // 3. Test Valid Verification Code
  console.log('\n3. Testing Valid OTP Code...');
  const validResult = verifyOtp('patelrajnish47@gmail.com', storedEmailRecord.code);
  console.log('Valid Code Verification Result:', validResult);

  // 4. Send Mobile SMS OTP
  console.log('\n4. Requesting Mobile SMS OTP...');
  const smsRes = await sendOtp('9876543210');
  console.log('Mobile SMS OTP Response:', smsRes);

  const storedSmsRecord = otpStore.get('9876543210');
  console.log('Stored SMS OTP Code in Memory:', storedSmsRecord.code);

  // 5. Test Resend Cooldown Protection (< 60s)
  console.log('\n5. Testing Resend Cooldown Protection (requesting again immediately)...');
  try {
    await resendOtp('9876543210');
    console.error('❌ FAIL: Cooldown did not block immediate request');
  } catch (err) {
    console.log('✅ PASS: Cooldown blocked immediate resend request:', err.message);
  }

  console.log('\n=== OTP Engine Tests Complete ===');
}

testOtpEngine().catch(console.error);
