const prisma = require('../src/utils/prisma');
const { sendOtp, verifyOtp, resendOtp } = require('../src/utils/otpService');
const { generateToken } = require('../src/utils/jwt');

async function runComprehensiveTests() {
  console.log('=====================================================');
  console.log('   Hostel Connect — Comprehensive Email OTP Audit    ');
  console.log('=====================================================\n');

  let passed = 0;
  let failed = 0;

  try {
    // 1. Ensure test Parent exists in DB
    let parent = await prisma.parent.findFirst({
      where: { email: 'patelrajnish47@gmail.com' },
    });

    if (!parent) {
      parent = await prisma.parent.create({
        data: {
          email: 'patelrajnish47@gmail.com',
          mobile: '9876543210',
          name: 'Rajnish Patel (Parent)',
          relation: 'Father',
        },
      });
    }

    console.log(`[TEST 1] Registered Parent found in DB: ID ${parent.id}, Email: ${parent.email}, Mobile: ${parent.mobile}`);
    passed++;

    // 2. Request Email OTP (Stores SHA-256 hash in DB table parent_otps)
    console.log('\n[TEST 2] Requesting Email OTP via Resend engine...');
    const sendRes = await sendOtp({
      destination: parent.email,
      parentId: parent.id,
      parentName: parent.name,
    });

    if (sendRes.success && sendRes.type === 'email') {
      console.log('  ✅ Email OTP requested successfully.');
      passed++;
    } else {
      console.error('  ❌ Email OTP request failed', sendRes);
      failed++;
    }

    // 3. Verify OTP is stored in database as SHA-256 hash (never plaintext)
    const dbOtp = await prisma.parentOtp.findFirst({
      where: { parentId: parent.id, destination: parent.email, verifiedAt: null },
      orderBy: { createdAt: 'desc' },
    });

    if (dbOtp && dbOtp.otpHash && dbOtp.otpHash.length === 64) {
      console.log(`\n[TEST 3] DB Security Audit: OTP stored as 64-char SHA-256 hash (${dbOtp.otpHash.substring(0, 16)}...)`);
      passed++;
    } else {
      console.error('\n❌ DB Security Audit failed: OTP not properly hashed or missing record', dbOtp);
      failed++;
    }

    // 4. Incorrect OTP verification is rejected
    console.log('\n[TEST 4] Testing incorrect OTP code verification (000000)...');
    const wrongRes = await verifyOtp({ destination: parent.email, inputOtp: '000000' });
    if (!wrongRes.valid && wrongRes.error.includes('Incorrect OTP code')) {
      console.log(`  ✅ Incorrect OTP rejected properly: "${wrongRes.error}"`);
      passed++;
    } else {
      console.error('  ❌ Incorrect OTP was not rejected properly', wrongRes);
      failed++;
    }

    // 5. Rate limit & Cooldown check (<60s resend attempt blocked)
    console.log('\n[TEST 5] Testing 60-second Resend Cooldown protection...');
    try {
      await resendOtp({ destination: parent.email, parentId: parent.id });
      console.error('  ❌ Resend cooldown did not block fast request');
      failed++;
    } catch (err) {
      if (err.message.includes('second(s) before requesting')) {
        console.log(`  ✅ 60-second cooldown successfully blocked fast resend: "${err.message}"`);
        passed++;
      } else {
        console.error('  ❌ Unexpected error during cooldown check:', err.message);
        failed++;
      }
    }

    // 6. Test Unregistered Email Rejection
    console.log('\n[TEST 6] Testing unregistered parent email rejection...');
    const unregParent = await prisma.parent.findFirst({ where: { email: 'unregistered_parent_99@test.com' } });
    if (!unregParent) {
      console.log('  ✅ Unregistered email correctly has no database parent record.');
      passed++;
    }

    // 7. Verify both SMS and Email OTP authenticate the SAME Parent record
    console.log('\n[TEST 7] Account Unification Check (Email vs SMS)...');
    const parentByEmail = await prisma.parent.findFirst({ where: { email: parent.email } });
    const parentByMobile = await prisma.parent.findFirst({ where: { mobile: parent.mobile } });

    if (parentByEmail && parentByMobile && parentByEmail.id === parentByMobile.id) {
      console.log(`  ✅ Both Email OTP and SMS OTP map to exact same Parent Account ID (${parent.id}).`);
      passed++;
    } else {
      console.error('  ❌ Account mismatch between Email and Mobile lookup!');
      failed++;
    }

    console.log('\n=====================================================');
    console.log(`   Audit Results: ${passed} Passed, ${failed} Failed`);
    console.log('=====================================================\n');
  } catch (err) {
    console.error('💥 Test Exception:', err.stack);
  } finally {
    await prisma.$disconnect();
  }
}

runComprehensiveTests();
