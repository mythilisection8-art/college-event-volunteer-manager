const http = require('http');
const app = require('./server');

const PORT = 5099;
let server;
let baseUrl;

async function request(method, endpoint, body = null, token = null) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  const options = {
    method,
    headers
  };
  if (body) {
    options.body = JSON.stringify(body);
  }
  const response = await fetch(`${baseUrl}${endpoint}`, options);
  const data = await response.json().catch(() => ({}));
  return { status: response.status, ok: response.ok, data };
}

async function runTests() {
  console.log('🧪 Starting Combined Attendee & Volunteer QR Pass Automated Verification Tests...\n');

  // Start temporary server for testing
  server = http.createServer(app);
  await new Promise((resolve) => server.listen(PORT, resolve));
  baseUrl = `http://localhost:${PORT}/api`;
  console.log(`[Test Server] Listening on ${baseUrl}\n`);

  let allPassed = true;

  try {
    // 1. Authenticate Student A (Rahul Verma - student@college.edu)
    console.log('👉 1. Authenticating Student A (student@college.edu)...');
    const authResA = await request('POST', '/auth/login', {
      email: 'student@college.edu',
      password: 'password123'
    });
    if (!authResA.ok) throw new Error('Student A login failed: ' + JSON.stringify(authResA.data));
    const tokenA = authResA.data.token;
    const userA = authResA.data.user;
    console.log(`   ✅ Logged in as Student A: ${userA.name} (${userA.email}, ID: ${userA.id})`);

    // 2. Authenticate Student B (Ananya Sen - ananya@college.edu)
    console.log('\n👉 2. Authenticating Student B (ananya@college.edu)...');
    const authResB = await request('POST', '/auth/login', {
      email: 'ananya@college.edu',
      password: 'password123'
    });
    if (!authResB.ok) throw new Error('Student B login failed: ' + JSON.stringify(authResB.data));
    const tokenB = authResB.data.token;
    const userB = authResB.data.user;
    console.log(`   ✅ Logged in as Student B: ${userB.name} (${userB.email}, ID: ${userB.id})`);

    // 3. Authenticate Organizer (Prof. Sharma - organizer@college.edu)
    console.log('\n👉 3. Authenticating Organizer (organizer@college.edu)...');
    const authResOrg = await request('POST', '/auth/login', {
      email: 'organizer@college.edu',
      password: 'password123'
    });
    if (!authResOrg.ok) throw new Error('Organizer login failed: ' + JSON.stringify(authResOrg.data));
    const tokenOrg = authResOrg.data.token;
    console.log(`   ✅ Logged in as Organizer: ${authResOrg.data.user.name}`);

    // 4. TEST ATTENDEE QR PASS (Student A on Event 1)
    console.log('\n👉 4. Testing Attendee QR Pass Retrieval...');
    const attendeePassResA = await request('GET', '/attendees/1/pass', null, tokenA);
    if (attendeePassResA.ok && attendeePassResA.data.success) {
      const attPass = attendeePassResA.data.data;
      console.log(`   ✅ Attendee Pass Retrieved: ${attPass.pass_code} | Status: ${attPass.registration_status} | Active: ${attPass.is_active}`);
      if (!attPass.pass_code.startsWith('REG-ATT-')) {
        console.error('   ❌ Attendee pass code prefix invalid:', attPass.pass_code);
        allPassed = false;
      }
    } else {
      console.error('   ❌ Attendee pass retrieval failed:', attendeePassResA.data);
      allPassed = false;
    }

    // 5. TEST APPROVED VOLUNTEER QR PASS (Student A on Event 1 - approved in seed)
    console.log('\n👉 5. Testing Approved Volunteer QR Pass (Student A on Event 1)...');
    const volPassResA = await request('GET', '/registrations/1/pass', null, tokenA);
    if (volPassResA.ok && volPassResA.data.success) {
      const volPass = volPassResA.data.data;
      console.log(`   ✅ Volunteer Pass Retrieved: ${volPass.pass_code}`);
      console.log(`      - Status: ${volPass.registration_status} (is_active: ${volPass.is_active})`);
      console.log(`      - Assigned Duty / Remarks: "${volPass.organizer_remarks}"`);
      console.log(`      - Attendance Status: ${volPass.attendance_status}`);
      console.log(`      - QR Payload (length: ${volPass.qr_payload?.length || 0} chars)`);

      if (!volPass.pass_code.startsWith('REG-VOL-')) {
        console.error('   ❌ Volunteer pass code prefix invalid:', volPass.pass_code);
        allPassed = false;
      }
      if (!volPass.is_active || !volPass.qr_payload) {
        console.error('   ❌ Approved volunteer pass must be active with valid qr_payload!');
        allPassed = false;
      }
    } else {
      console.error('   ❌ Approved volunteer pass retrieval failed:', volPassResA.data);
      allPassed = false;
    }

    // 6. TEST PENDING VOLUNTEER APPLICATION (Student B on Event 1 - pending in seed)
    console.log('\n👉 6. Testing Pending Volunteer Application (Student B on Event 1)...');
    const volPassResB = await request('GET', '/registrations/1/pass', null, tokenB);
    if (volPassResB.ok && volPassResB.data.success) {
      const pendingPass = volPassResB.data.data;
      console.log(`   ✅ Pending Volunteer Application Fetched: ${pendingPass.pass_code}`);
      console.log(`      - Status: ${pendingPass.registration_status} (is_active: ${pendingPass.is_active})`);
      console.log(`      - QR Payload: ${pendingPass.qr_payload}`);

      if (pendingPass.is_active !== false || pendingPass.qr_payload !== null) {
        console.error('   ❌ Pending volunteer application must NOT have an active QR payload!');
        allPassed = false;
      } else {
        console.log('   ✅ Pending application correctly denied active QR pass before approval.');
      }
    } else {
      console.error('   ❌ Pending volunteer pass fetch failed:', volPassResB.data);
      allPassed = false;
    }

    // 7. TEST APPROVAL WORKFLOW: Organizer approves Student B's application -> Pass activates!
    console.log('\n👉 7. Testing Approval Workflow: Organizer Approves Application...');
    const regIdB = volPassResB.data.data.registration_id;
    const approveRes = await request('PATCH', `/registrations/${regIdB}/status`, {
      status: 'approved',
      remarks: 'Selected for Registration & Help Desk Coordination'
    }, tokenOrg);
    console.log(`   ℹ️ Organizer Action: HTTP ${approveRes.status} (${approveRes.data.message})`);

    // Student B fetches pass again after approval
    const activatedPassRes = await request('GET', `/registrations/pass/${regIdB}`, null, tokenB);
    const activatedPass = activatedPassRes.data.data;
    console.log(`   ✅ Activated Volunteer Pass: ${activatedPass.pass_code}`);
    console.log(`      - New Status: ${activatedPass.registration_status} (is_active: ${activatedPass.is_active})`);
    console.log(`      - Coordinator Remarks: "${activatedPass.organizer_remarks}"`);
    console.log(`      - QR Payload generated (length: ${activatedPass.qr_payload?.length} chars)`);

    if (activatedPass.registration_status !== 'approved' || !activatedPass.is_active || !activatedPass.qr_payload) {
      console.error('   ❌ Volunteer pass failed to activate after approval!');
      allPassed = false;
    } else {
      console.log('   ✅ Volunteer pass successfully activated upon organizer approval.');
    }

    // 8. SECURITY ISOLATION: Student B attempts to access Student A's Volunteer Pass
    console.log('\n👉 8. Security Isolation Test: Student B accessing Student A\'s Volunteer Pass...');
    const regIdA = volPassResA.data.data.registration_id;
    const stolenVolPassRes = await request('GET', `/registrations/pass/${regIdA}`, null, tokenB);
    if (stolenVolPassRes.status === 403 || stolenVolPassRes.status === 404) {
      console.log(`   ✅ Access blocked with HTTP ${stolenVolPassRes.status} (${stolenVolPassRes.data.message})`);
    } else {
      console.error(`   ❌ Security failure! Student B accessed Student A's volunteer pass with HTTP ${stolenVolPassRes.status}`);
      allPassed = false;
    }

    // 9. SECURITY TEST: Unauthenticated access to Volunteer Pass
    console.log('\n👉 9. Security Test: Unauthenticated access to Volunteer Pass...');
    const unauthVolRes = await request('GET', '/registrations/1/pass', null, null);
    if (unauthVolRes.status === 401) {
      console.log(`   ✅ Access correctly blocked with HTTP 401 (${unauthVolRes.data.message})`);
    } else {
      console.error(`   ❌ Security failure! Unauthenticated request returned HTTP ${unauthVolRes.status}`);
      allPassed = false;
    }

    // 10. WITHDRAWAL / CANCELLATION TEST: Student B cancels volunteer application
    console.log('\n👉 10. Testing Volunteer Application Withdrawal / Invalidation...');
    const cancelVolRes = await request('DELETE', `/registrations/${regIdB}/cancel`, null, tokenB);
    console.log(`   ℹ️ Withdrawal response: HTTP ${cancelVolRes.status} (${cancelVolRes.data.message})`);

    const cancelledVolPassRes = await request('GET', `/registrations/pass/${regIdB}`, null, tokenB);
    const cancelledVolPass = cancelledVolPassRes.data.data;
    console.log(`   ✅ Cancelled Volunteer Pass Status: ${cancelledVolPass.registration_status} (is_active: ${cancelledVolPass.is_active})`);

    if (cancelledVolPass.registration_status !== 'cancelled' || cancelledVolPass.is_active !== false) {
      console.error('   ❌ Cancelled volunteer pass was not marked inactive!');
      allPassed = false;
    } else {
      console.log('   ✅ Cancelled volunteer application correctly invalidated.');
    }

    // 11. VERIFY ATTENDEE & VOLUNTEER PASS INDEPENDENCE
    console.log('\n👉 11. Verifying Complete Attendee vs Volunteer Pass Independence...');
    const finalAttPass = await request('GET', '/attendees/1/pass', null, tokenA);
    const finalVolPass = await request('GET', '/registrations/1/pass', null, tokenA);
    console.log(`   - Student A Attendee Pass: ${finalAttPass.data.data.pass_code}`);
    console.log(`   - Student A Volunteer Pass: ${finalVolPass.data.data.pass_code}`);

    if (finalAttPass.data.data.pass_code === finalVolPass.data.data.pass_code) {
      console.error('   ❌ Attendee and Volunteer passes should have distinct IDs!');
      allPassed = false;
    } else {
      console.log('   ✅ Attendee and Volunteer passes are completely independent with separate identifiers.');
    }

    console.log('\n====================================================');
    if (allPassed) {
      console.log('🎉 ALL ATTENDEE & VOLUNTEER QR PASS TESTS PASSED!');
    } else {
      console.log('⚠️ SOME TESTS FAILED. Please inspect the output above.');
    }
    console.log('====================================================\n');
  } catch (error) {
    console.error('❌ Test suite fatal error:', error.message);
    allPassed = false;
  } finally {
    if (server) {
      server.close(() => {
        process.exit(allPassed ? 0 : 1);
      });
    } else {
      process.exit(allPassed ? 0 : 1);
    }
  }
}

runTests();
