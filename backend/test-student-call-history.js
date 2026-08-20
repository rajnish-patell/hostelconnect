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

async function testCallHistory() {
  console.log('--- Testing Student Call Flow & History ---');

  try {
    // 1. Student Login
    const loginRes = await request({
      hostname: 'localhost',
      port: 5000,
      path: '/api/auth/student/login',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    }, {
      schoolCode: 'SCH001',
      studentId: 'STU001',
      password: 'Student@123',
    });

    console.log('1. Student Logged In:', loginRes.data?.success, 'UserId:', loginRes.data?.data?.user?.id);
    const token = loginRes.data.data.token;
    const authHeaders = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    };

    // 2. Fetch linked parents
    const profileRes = await request({
      hostname: 'localhost',
      port: 5000,
      path: `/api/students/${loginRes.data.data.user.id}`,
      method: 'GET',
      headers: authHeaders,
    });
    const parents = profileRes.data.data.parents;
    console.log('2. Linked parents count:', parents?.length);
    const parentId = parents[0].parentId || parents[0].parent.id;

    // 3. Initiate Call
    const initRes = await request({
      hostname: 'localhost',
      port: 5000,
      path: '/api/calls/initiate',
      method: 'POST',
      headers: authHeaders,
    }, { parentId });
    console.log('3. Call Initiated:', initRes.data);
    const callId = initRes.data.data.callId;

    // 4. End Call
    const endRes = await request({
      hostname: 'localhost',
      port: 5000,
      path: `/api/calls/${callId}/end`,
      method: 'POST',
      headers: authHeaders,
    }, { durationSeconds: 75 });
    console.log('4. Call Ended:', endRes.data);

    // 5. Fetch Call History
    const historyRes = await request({
      hostname: 'localhost',
      port: 5000,
      path: '/api/calls/history',
      method: 'GET',
      headers: authHeaders,
    });
    console.log('5. Call History Fetched. Status:', historyRes.status, 'Count:', historyRes.data?.data?.length);
    console.log('History data items:', JSON.stringify(historyRes.data?.data, null, 2));

  } catch (err) {
    console.error('Error during test:', err);
  }
}

testCallHistory();
