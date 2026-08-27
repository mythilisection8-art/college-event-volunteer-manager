const http = require('http');
const jwt = require('jsonwebtoken');
const app = require('./server');
const { pool } = require('./config/db');

const PORT = 5098;
let server;
let baseUrl;

const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_jwt_key_college_events_2026_change_in_production';

function makeToken(user) {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      role: user.role,
      name: user.name
    },
    JWT_SECRET,
    { expiresIn: '1h' }
  );
}

async function request(method, endpoint, body = null, token = null) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  const options = {
    method,
    headers
  };
  if (body !== null) {
    options.body = JSON.stringify(body);
  }
  const response = await fetch(`${baseUrl}${endpoint}`, options);
  const data = await response.json().catch(() => ({}));
  return { status: response.status, ok: response.ok, data };
}

async function runQRCheckInTests() {
  console.log('================================================================');
  console.log('🧪 Starting Comprehensive QR Scanner & Attendance Check-In Verification');
  console.log('================================================================\n');

  server = http.createServer(app);
  await new Promise((resolve) => server.listen(PORT, resolve));
  baseUrl = `http://localhost:${PORT}/api`;
  console.log(`[Test Server] Listening on ${baseUrl}\n`);

  let allPassed = true;

  try {
    // 1. Fetch test users
    const [admins] = await pool.query("SELECT * FROM users WHERE role = 'admin' AND status = 'active' LIMIT 1");
    const [organizers] = await pool.query("SELECT * FROM users WHERE role = 'organizer' AND status = 'active' ORDER BY id ASC");
    const [students] = await pool.query("SELECT * FROM users WHERE role = 'student' AND status = 'active' LIMIT 1");

    if (admins.length === 0) throw new Error('No active admin user found in database.');
    if (organizers.length < 2) throw new Error('At least 2 active organizers needed in database.');
    if (students.length === 0) throw new Error('No active student user found in database.');

    const admin = admins[0];
    const organizerA = organizers[0]; // Authorized for Event 1
    const organizerB = organizers[1]; // NOT authorized for Event 1
    const student = students[0];

    const adminToken = makeToken(admin);
    const orgAToken = makeToken(organizerA);
    const orgBToken = makeToken(organizerB);
    const studentToken = makeToken(student);

    console.log(`👤 Admin: ${admin.name} (ID: ${admin.id})`);
    console.log(`👤 Authorized Organizer (Event 1): ${organizerA.name} (ID: ${organizerA.id})`);
    console.log(`👤 Unauthorized Organizer (Event 1): ${organizerB.name} (ID: ${organizerB.id})`);
    console.log(`👤 Student: ${student.name} (ID: ${student.id})\n`);

    const testEventId = 1;

    // Ensure Event 1 is assigned to organizerA
    await pool.query('UPDATE events SET organizer_id = ? WHERE id = ?', [organizerA.id, testEventId]);

    // Setup Test Attendee Registration for Student on Event 1
    await pool.query(
      `INSERT INTO attendee_registrations (event_id, user_id, status, attendance_status) 
       VALUES (?, ?, 'registered', 'not_marked')
       ON DUPLICATE KEY UPDATE status = 'registered', attendance_status = 'not_marked', checked_in_at = NULL`,
      [testEventId, student.id]
    );

    const [attRows] = await pool.query(
      'SELECT id, status, attendance_status FROM attendee_registrations WHERE event_id = ? AND user_id = ?',
      [testEventId, student.id]
    );
    const attendeeRegId = attRows[0].id;
    const attendeePassCode = `REG-ATT-2026-${String(attendeeRegId).padStart(5, '0')}`;
    console.log(`🎫 Setup Test Attendee Pass: ID ${attendeeRegId}, Code: ${attendeePassCode}`);

    // Setup Test Approved Volunteer Registration for Student on Event 1
    await pool.query(
      `INSERT INTO registrations (event_id, user_id, status, attendance_status, remarks) 
       VALUES (?, ?, 'approved', 'not_marked', 'Registration Desk Duty')
       ON DUPLICATE KEY UPDATE status = 'approved', attendance_status = 'not_marked', checked_in_at = NULL, remarks = 'Registration Desk Duty'`,
      [testEventId, student.id]
    );

    const [volRows] = await pool.query(
      'SELECT id, status, attendance_status FROM registrations WHERE event_id = ? AND user_id = ?',
      [testEventId, student.id]
    );
    const volunteerRegId = volRows[0].id;
    const volunteerPassCode = `REG-VOL-2026-${String(volunteerRegId).padStart(5, '0')}`;
    console.log(`🎫 Setup Test Volunteer Pass: ID ${volunteerRegId}, Code: ${volunteerPassCode}\n`);

    // =========================================================================
    // TEST 1: Authorized Organizer Verifies Attendee Pass
    // =========================================================================
    console.log(`--- TEST 1: Authorized Organizer Verifies Attendee Pass ---`);
    const verifyAttRes = await request('POST', '/attendees/verify-pass', {
      registration_id: attendeeRegId,
      code: attendeePassCode
    }, orgAToken);

    if (verifyAttRes.status === 200 && verifyAttRes.data.success && verifyAttRes.data.is_valid) {
      console.log(`   ✅ Verification succeeded HTTP 200: ${verifyAttRes.data.data.pass_type} valid.`);
      console.log(`      Student: ${verifyAttRes.data.data.student.name} | Status: ${verifyAttRes.data.data.attendance_status}`);
    } else {
      console.error(`   ❌ Failed to verify attendee pass:`, verifyAttRes.data);
      allPassed = false;
    }

    // =========================================================================
    // TEST 2: Admin Verifies Attendee Pass
    // =========================================================================
    console.log(`\n--- TEST 2: Admin Verifies Attendee Pass ---`);
    const verifyAttAdminRes = await request('POST', '/events/verify-pass', {
      qr_data: attendeePassCode
    }, adminToken);

    if (verifyAttAdminRes.status === 200 && verifyAttAdminRes.data.success) {
      console.log(`   ✅ Admin successfully verified pass via unified endpoint HTTP 200.`);
    } else {
      console.error(`   ❌ Admin verification failed:`, verifyAttAdminRes.data);
      allPassed = false;
    }

    // =========================================================================
    // TEST 3: Attendee Check-In (Mark Present)
    // =========================================================================
    console.log(`\n--- TEST 3: Attendee Check-In (Mark Present) ---`);
    const checkInAttRes = await request('POST', '/attendees/check-in', {
      registration_id: attendeeRegId,
      attendance_status: 'present'
    }, orgAToken);

    if (checkInAttRes.status === 200 && checkInAttRes.data.success) {
      console.log(`   ✅ Check-In succeeded HTTP 200: "${checkInAttRes.data.message}"`);
      console.log(`      Attendance status updated to: ${checkInAttRes.data.data.attendance_status}`);

      // Verify in DB
      const [dbAtt] = await pool.query('SELECT attendance_status, checked_in_at FROM attendee_registrations WHERE id = ?', [attendeeRegId]);
      if (dbAtt[0].attendance_status === 'present' && dbAtt[0].checked_in_at !== null) {
        console.log(`   ✅ DB verified: attendance_status = present, checked_in_at = ${dbAtt[0].checked_in_at}`);
      } else {
        console.error(`   ❌ DB state invalid:`, dbAtt[0]);
        allPassed = false;
      }
    } else {
      console.error(`   ❌ Attendee check-in failed:`, checkInAttRes.data);
      allPassed = false;
    }

    // =========================================================================
    // TEST 4: Repeated Check-In Protection (Duplicate check-in handled safely)
    // =========================================================================
    console.log(`\n--- TEST 4: Repeated Attendee Check-In Protection ---`);
    const repeatCheckInRes = await request('POST', '/attendees/check-in', {
      registration_id: attendeeRegId,
      attendance_status: 'present'
    }, orgAToken);

    if (repeatCheckInRes.status === 200 && repeatCheckInRes.data.data.was_already_checked_in === true) {
      console.log(`   ✅ Repeat check-in safely detected was_already_checked_in: true.`);
      console.log(`      Message: "${repeatCheckInRes.data.message}"`);
    } else {
      console.error(`   ❌ Repeat check-in did not handle duplicate status properly:`, repeatCheckInRes.data);
      allPassed = false;
    }

    // =========================================================================
    // TEST 5: Authorized Organizer Verifies Volunteer Pass
    // =========================================================================
    console.log(`\n--- TEST 5: Authorized Organizer Verifies Volunteer Pass ---`);
    const verifyVolRes = await request('POST', '/registrations/verify-pass', {
      registration_id: volunteerRegId,
      code: volunteerPassCode
    }, orgAToken);

    if (verifyVolRes.status === 200 && verifyVolRes.data.success && verifyVolRes.data.is_valid) {
      console.log(`   ✅ Volunteer pass verified HTTP 200.`);
      console.log(`      Assigned Role: "${verifyVolRes.data.data.organizer_remarks}"`);
    } else {
      console.error(`   ❌ Volunteer verification failed:`, verifyVolRes.data);
      allPassed = false;
    }

    // =========================================================================
    // TEST 6: Volunteer Check-In (Mark Present)
    // =========================================================================
    console.log(`\n--- TEST 6: Volunteer Check-In (Mark Present) ---`);
    const checkInVolRes = await request('POST', '/registrations/check-in', {
      registration_id: volunteerRegId,
      attendance_status: 'present',
      remarks: 'Reporting on time at Registration desk'
    }, orgAToken);

    if (checkInVolRes.status === 200 && checkInVolRes.data.success) {
      console.log(`   ✅ Volunteer Check-In succeeded HTTP 200: "${checkInVolRes.data.message}"`);

      // Verify in DB
      const [dbVol] = await pool.query('SELECT attendance_status, checked_in_at, remarks FROM registrations WHERE id = ?', [volunteerRegId]);
      if (dbVol[0].attendance_status === 'present' && dbVol[0].checked_in_at !== null) {
        console.log(`   ✅ DB verified: volunteer attendance = present, checked_in_at = ${dbVol[0].checked_in_at}`);
      } else {
        console.error(`   ❌ DB volunteer state invalid:`, dbVol[0]);
        allPassed = false;
      }
    } else {
      console.error(`   ❌ Volunteer check-in failed:`, checkInVolRes.data);
      allPassed = false;
    }

    // =========================================================================
    // TEST 7: Invalid Pass Code Rejected
    // =========================================================================
    console.log(`\n--- TEST 7: Invalid Pass Code / QR Rejected ---`);
    const invalidVerifyRes = await request('POST', '/events/verify-pass', {
      qr_data: 'REG-ATT-2026-99999'
    }, orgAToken);

    if (invalidVerifyRes.status === 404 || invalidVerifyRes.status === 400) {
      console.log(`   ✅ Non-existent pass rejected with HTTP ${invalidVerifyRes.status}: "${invalidVerifyRes.data.message}"`);
    } else {
      console.error(`   ❌ Expected HTTP 400/404 for invalid pass but got ${invalidVerifyRes.status}`);
      allPassed = false;
    }

    // =========================================================================
    // TEST 8: Cancelled Attendee Registration Rejected for Check-In
    // =========================================================================
    console.log(`\n--- TEST 8: Cancelled Attendee Registration Cannot Check In ---`);
    // Create cancelled registration
    await pool.query('UPDATE attendee_registrations SET status = "cancelled" WHERE id = ?', [attendeeRegId]);

    const checkInCancelledRes = await request('POST', '/attendees/check-in', {
      registration_id: attendeeRegId,
      attendance_status: 'present'
    }, orgAToken);

    if (checkInCancelledRes.status === 400) {
      console.log(`   ✅ Cancelled registration check-in rejected with HTTP 400: "${checkInCancelledRes.data.message}"`);
    } else {
      console.error(`   ❌ Cancelled registration was not rejected with HTTP 400! Got ${checkInCancelledRes.status}`);
      allPassed = false;
    }

    // =========================================================================
    // TEST 9: Pending/Rejected Volunteer Application Rejected for Check-In
    // =========================================================================
    console.log(`\n--- TEST 9: Pending/Rejected Volunteer Cannot Check In ---`);
    await pool.query('UPDATE registrations SET status = "pending" WHERE id = ?', [volunteerRegId]);

    const checkInPendingVolRes = await request('POST', '/registrations/check-in', {
      registration_id: volunteerRegId,
      attendance_status: 'present'
    }, orgAToken);

    if (checkInPendingVolRes.status === 400) {
      console.log(`   ✅ Pending volunteer check-in rejected with HTTP 400: "${checkInPendingVolRes.data.message}"`);
    } else {
      console.error(`   ❌ Pending volunteer check-in was not rejected with HTTP 400! Got ${checkInPendingVolRes.status}`);
      allPassed = false;
    }

    // Restore statuses for following tests
    await pool.query('UPDATE attendee_registrations SET status = "registered" WHERE id = ?', [attendeeRegId]);
    await pool.query('UPDATE registrations SET status = "approved" WHERE id = ?', [volunteerRegId]);

    // =========================================================================
    // TEST 10: Unauthorized Organizer B Blocked from Verifying/Checking in Event 1
    // =========================================================================
    console.log(`\n--- TEST 10: Unauthorized Organizer B Blocked (HTTP 403) ---`);
    const unauthOrgVerifyRes = await request('POST', '/attendees/verify-pass', {
      registration_id: attendeeRegId,
      code: attendeePassCode
    }, orgBToken);

    if (unauthOrgVerifyRes.status === 403) {
      console.log(`   ✅ Unauthorized Organizer B verify blocked with HTTP 403: "${unauthOrgVerifyRes.data.message}"`);
    } else {
      console.error(`   ❌ Expected HTTP 403 for unauthorized organizer but got ${unauthOrgVerifyRes.status}`);
      allPassed = false;
    }

    const unauthOrgCheckInRes = await request('POST', '/attendees/check-in', {
      registration_id: attendeeRegId,
      attendance_status: 'present'
    }, orgBToken);

    if (unauthOrgCheckInRes.status === 403) {
      console.log(`   ✅ Unauthorized Organizer B check-in blocked with HTTP 403: "${unauthOrgCheckInRes.data.message}"`);
    } else {
      console.error(`   ❌ Expected HTTP 403 for unauthorized organizer check-in but got ${unauthOrgCheckInRes.status}`);
      allPassed = false;
    }

    // =========================================================================
    // TEST 11: Student Blocked from Calling Check-In (HTTP 403)
    // =========================================================================
    console.log(`\n--- TEST 11: Student Blocked from Check-In (HTTP 403) ---`);
    const studentCheckInRes = await request('POST', '/attendees/check-in', {
      registration_id: attendeeRegId,
      attendance_status: 'present'
    }, studentToken);

    if (studentCheckInRes.status === 403) {
      console.log(`   ✅ Student check-in blocked with HTTP 403 Forbidden: "${studentCheckInRes.data.message}"`);
    } else {
      console.error(`   ❌ Student check-in was not blocked with HTTP 403! Got ${studentCheckInRes.status}`);
      allPassed = false;
    }

    // =========================================================================
    // TEST 12: Unauthenticated Request Blocked from Check-In (HTTP 401)
    // =========================================================================
    console.log(`\n--- TEST 12: Unauthenticated Request Blocked (HTTP 401) ---`);
    const unauthCheckInRes = await request('POST', '/attendees/check-in', {
      registration_id: attendeeRegId,
      attendance_status: 'present'
    }, null);

    if (unauthCheckInRes.status === 401) {
      console.log(`   ✅ Unauthenticated check-in blocked with HTTP 401: "${unauthCheckInRes.data.message}"`);
    } else {
      console.error(`   ❌ Unauthenticated check-in was not blocked with HTTP 401! Got ${unauthCheckInRes.status}`);
      allPassed = false;
    }

    // =========================================================================
    // TEST 13: Public Read-Only Pass Verification (Privacy & Security Verified)
    // =========================================================================
    console.log(`\n--- TEST 13: Public Read-Only Verification (No Sensitive Data Exposed) ---`);
    const publicVerifyRes = await request('GET', `/events/public-verify-pass?code=${attendeePassCode}&type=attendee`, null, null);

    if (publicVerifyRes.status === 200 && publicVerifyRes.data.success) {
      const pData = publicVerifyRes.data.data;
      console.log(`   ✅ Public verification HTTP 200: "${pData.pass_type}" | Event: "${pData.event_title}"`);
      console.log(`      Holder: ${pData.student_name} | Pass Code: ${pData.pass_code}`);

      // Verify privacy: no student email, phone, roll number, or internal secrets
      const hasEmail = pData.student_email !== undefined || pData.email !== undefined;
      const hasPhone = pData.student_phone !== undefined || pData.phone !== undefined;
      const hasRoll = pData.roll_number !== undefined || pData.student_roll_number !== undefined;

      if (!hasEmail && !hasPhone && !hasRoll) {
        console.log(`   ✅ Security check passed: Student email, phone, and roll number are strictly shielded from public endpoint.`);
      } else {
        console.error(`   ❌ Security leak! Public endpoint exposed student private details:`, pData);
        allPassed = false;
      }
    } else {
      console.error(`   ❌ Public pass verification failed:`, publicVerifyRes.data);
      allPassed = false;
    }

    // Cleanup test records
    await pool.query('DELETE FROM attendee_registrations WHERE event_id = ? AND user_id = ?', [testEventId, student.id]);
    await pool.query('DELETE FROM registrations WHERE event_id = ? AND user_id = ?', [testEventId, student.id]);
    console.log('\n🧹 Test registration records cleaned up.');

    console.log('\n================================================================');
    if (allPassed) {
      console.log('🎉 ALL QR SCANNER & ATTENDANCE CHECK-IN TESTS PASSED SUCCESSFULLY!');
    } else {
      console.log('⚠️ SOME VERIFICATION TESTS FAILED.');
    }
    console.log('================================================================\n');

  } catch (err) {
    console.error('❌ Test suite fatal error:', err);
    allPassed = false;
  } finally {
    if (server) {
      server.close();
    }
    process.exit(allPassed ? 0 : 1);
  }
}

runQRCheckInTests();
