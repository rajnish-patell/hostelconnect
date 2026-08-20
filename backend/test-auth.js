const http = require('http');

function request(options, data) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => (body += chunk));
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(body) });
        } catch {
          resolve({ status: res.statusCode, body });
        }
      });
    });
    req.on('error', reject);
    if (data) {
      req.write(JSON.stringify(data));
    }
    req.end();
  });
}

async function runTests() {
  console.log('--- Starting Authentication & Functional Tests ---');
  let passed = 0;
  let failed = 0;

  // 1. Health Check
  try {
    const res = await request({
      hostname: 'localhost',
      port: 5000,
      path: '/api/health',
      method: 'GET',
    });
    if (res.status === 200 && res.data.success) {
      console.log('✅ PASS: Server health check');
      passed++;
    } else {
      console.error('❌ FAIL: Server health check', res);
      failed++;
    }
  } catch (err) {
    console.error('❌ FAIL: Health check error', err.message);
    failed++;
  }

  // 2. Valid SuperAdmin Login
  let superAdminToken = '';
  try {
    const res = await request(
      {
        hostname: 'localhost',
        port: 5000,
        path: '/api/auth/superadmin/login',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      },
      { email: 'admin@hostelvideocall.com', password: 'SuperAdmin@123' }
    );

    if (res.status === 200 && res.data.data?.token) {
      superAdminToken = res.data.data.token;
      console.log('✅ PASS: Valid Super Admin login');
      passed++;
    } else {
      console.error('❌ FAIL: Super Admin login', res);
      failed++;
    }
  } catch (err) {
    console.error('❌ FAIL: Super Admin login exception', err.message);
    failed++;
  }

  // 3. Invalid Password Rejection
  try {
    const res = await request(
      {
        hostname: 'localhost',
        port: 5000,
        path: '/api/auth/superadmin/login',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      },
      { email: 'admin@hostelvideocall.com', password: 'WrongPassword!999' }
    );

    if (res.status === 401 && !res.data.success) {
      console.log('✅ PASS: Rejection of invalid credentials');
      passed++;
    } else {
      console.error('❌ FAIL: Invalid credentials allowed', res);
      failed++;
    }
  } catch (err) {
    console.error('❌ FAIL: Invalid login check error', err.message);
    failed++;
  }

  // 4. Valid School Login
  let schoolToken = '';
  try {
    const res = await request(
      {
        hostname: 'localhost',
        port: 5000,
        path: '/api/auth/school/login',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      },
      { schoolCode: 'SCH001', password: 'School@123' }
    );

    if (res.status === 200 && res.data.data?.token) {
      schoolToken = res.data.data.token;
      console.log('✅ PASS: Valid School login');
      passed++;
    } else {
      console.error('❌ FAIL: School login', res);
      failed++;
    }
  } catch (err) {
    console.error('❌ FAIL: School login exception', err.message);
    failed++;
  }

  // 5. Valid Student Login
  let studentToken = '';
  try {
    const res = await request(
      {
        hostname: 'localhost',
        port: 5000,
        path: '/api/auth/student/login',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      },
      { schoolCode: 'SCH001', studentId: 'STU001', password: 'Student@123' }
    );

    if (res.status === 200 && res.data.data?.token) {
      studentToken = res.data.data.token;
      console.log('✅ PASS: Valid Student login');
      passed++;
    } else {
      console.error('❌ FAIL: Student login', res);
      failed++;
    }
  } catch (err) {
    console.error('❌ FAIL: Student login exception', err.message);
    failed++;
  }

  // 6. Parent OTP Request & Verification
  let parentToken = '';
  try {
    const otpReq = await request(
      {
        hostname: 'localhost',
        port: 5000,
        path: '/api/auth/parent/request-otp',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      },
      { mobile: '9876501234' }
    );

    const otpVer = await request(
      {
        hostname: 'localhost',
        port: 5000,
        path: '/api/auth/parent/verify-otp',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      },
      { mobile: '9876501234', otp: '123456' }
    );

    if (otpVer.status === 200 && otpVer.data.data?.token) {
      parentToken = otpVer.data.data.token;
      console.log('✅ PASS: Parent OTP flow & login');
      passed++;
    } else {
      console.error('❌ FAIL: Parent OTP flow', otpVer);
      failed++;
    }
  } catch (err) {
    console.error('❌ FAIL: Parent OTP exception', err.message);
    failed++;
  }

  // 7. Protected Route Enforcement Without Token
  try {
    const res = await request({
      hostname: 'localhost',
      port: 5000,
      path: '/api/schools',
      method: 'GET',
    });

    if (res.status === 401) {
      console.log('✅ PASS: Protected API rejects unauthenticated requests');
      passed++;
    } else {
      console.error('❌ FAIL: Unauthenticated access permitted', res);
      failed++;
    }
  } catch (err) {
    console.error('❌ FAIL: Protected route check', err.message);
    failed++;
  }

  // 8. Role-Based Authorization: Student cannot access SuperAdmin /api/schools
  try {
    const res = await request({
      hostname: 'localhost',
      port: 5000,
      path: '/api/schools',
      method: 'GET',
      headers: { Authorization: `Bearer ${studentToken}` },
    });

    if (res.status === 403) {
      console.log('✅ PASS: Role authorization blocks student from SuperAdmin endpoints');
      passed++;
    } else {
      console.error('❌ FAIL: Student accessed SuperAdmin endpoint', res);
      failed++;
    }
  } catch (err) {
    console.error('❌ FAIL: Role check exception', err.message);
    failed++;
  }

  // 9. Super Admin can access /api/schools
  try {
    const res = await request({
      hostname: 'localhost',
      port: 5000,
      path: '/api/schools',
      method: 'GET',
      headers: { Authorization: `Bearer ${superAdminToken}` },
    });

    if (res.status === 200 && res.data.success) {
      console.log('✅ PASS: SuperAdmin authorized access to /api/schools');
      passed++;
    } else {
      console.error('❌ FAIL: SuperAdmin access denied', res);
      failed++;
    }
  } catch (err) {
    console.error('❌ FAIL: SuperAdmin access error', err.message);
    failed++;
  }

  console.log(`\n=== Test Results: ${passed} Passed, ${failed} Failed ===`);
  process.exit(failed > 0 ? 1 : 0);
}

runTests();
