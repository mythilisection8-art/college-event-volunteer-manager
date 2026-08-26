const http = require('http');
const jwt = require('jsonwebtoken');
const app = require('./server');
const { pool } = require('./config/db');

const PORT = 5099;
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

async function runAssignmentTests() {
  console.log('================================================================');
  console.log('🧪 Starting Verification Tests for Event Organizer Assignment');
  console.log('================================================================\n');

  server = http.createServer(app);
  await new Promise((resolve) => server.listen(PORT, resolve));
  baseUrl = `http://localhost:${PORT}/api`;
  console.log(`[Test Server] Listening on ${baseUrl}\n`);

  let allPassed = true;

  try {
    // Fetch users from database
    const [admins] = await pool.query("SELECT * FROM users WHERE role = 'admin' AND status = 'active' LIMIT 1");
    const [organizers] = await pool.query("SELECT * FROM users WHERE role = 'organizer' AND status = 'active' ORDER BY id ASC");
    const [students] = await pool.query("SELECT * FROM users WHERE role = 'student' AND status = 'active' LIMIT 1");

    if (admins.length === 0) throw new Error('No active admin user found in database.');
    if (organizers.length < 2) throw new Error('At least 2 active organizers needed in database for testing.');
    if (students.length === 0) throw new Error('No active student user found in database.');

    const admin = admins[0];
    const organizerA = organizers[0];
    const organizerB = organizers[1];
    const student = students[0];

    const adminToken = makeToken(admin);
    const orgAToken = makeToken(organizerA);
    const orgBToken = makeToken(organizerB);
    const studentToken = makeToken(student);

    console.log(`👤 Admin: ${admin.name} (ID: ${admin.id})`);
    console.log(`👤 Organizer A: ${organizerA.name} (ID: ${organizerA.id})`);
    console.log(`👤 Organizer B: ${organizerB.name} (ID: ${organizerB.id})`);
    console.log(`👤 Student: ${student.name} (ID: ${student.id})\n`);

    // Target Event: Event 1
    const testEventId = 1;

    // --- TEST FLOW A: Admin assigns Event 1 -> Organizer A ---
    console.log(`========================================================`);
    console.log(`TEST A: Admin assigns Event ${testEventId} -> Organizer A (${organizerA.name}, ID: ${organizerA.id})`);
    console.log(`========================================================`);
    const assignARes = await request('PATCH', `/events/${testEventId}/assign-organizer`, {
      organizer_id: organizerA.id
    }, adminToken);

    if (assignARes.status === 200 && assignARes.data.success) {
      console.log(`   ✅ Assign API response HTTP 200: ${assignARes.data.message}`);
      console.log(`      Updated Event: organizer_id=${assignARes.data.data.organizer_id}, organizer_name="${assignARes.data.data.organizer_name}"`);
    } else {
      console.error(`   ❌ Failed to assign Event to Organizer A:`, assignARes.data);
      allPassed = false;
    }

    // Verify Organizer A can see Event 1
    const orgAMyEventsA = await request('GET', '/events/organizer/my-events', null, orgAToken);
    const orgAHasEventA = orgAMyEventsA.data.data?.some((e) => e.id === testEventId);
    if (orgAHasEventA) {
      console.log(`   ✅ Organizer A successfully sees Event ${testEventId} in /events/organizer/my-events`);
    } else {
      console.error(`   ❌ Organizer A does NOT see Event ${testEventId}`);
      allPassed = false;
    }

    // --- TEST FLOW B: Admin changes Event 1 -> Organizer B ---
    console.log(`\n========================================================`);
    console.log(`TEST B: Admin changes Event ${testEventId} -> Organizer B (${organizerB.name}, ID: ${organizerB.id})`);
    console.log(`========================================================`);
    const assignBRes = await request('PATCH', `/events/${testEventId}/assign-organizer`, {
      organizer_id: organizerB.id
    }, adminToken);

    if (assignBRes.status === 200 && assignBRes.data.success) {
      console.log(`   ✅ Assign API response HTTP 200: ${assignBRes.data.message}`);
      console.log(`      Updated Event: organizer_id=${assignBRes.data.data.organizer_id}, organizer_name="${assignBRes.data.data.organizer_name}"`);
    } else {
      console.error(`   ❌ Failed to reassign Event to Organizer B:`, assignBRes.data);
      allPassed = false;
    }

    // Verify Organizer A no longer sees Event 1
    const orgAMyEventsB = await request('GET', '/events/organizer/my-events', null, orgAToken);
    const orgAHasEventB = orgAMyEventsB.data.data?.some((e) => e.id === testEventId);
    if (!orgAHasEventB) {
      console.log(`   ✅ Organizer A no longer sees Event ${testEventId}`);
    } else {
      console.error(`   ❌ Organizer A still unexpectedly sees Event ${testEventId}`);
      allPassed = false;
    }

    // Verify Organizer B sees Event 1
    const orgBMyEventsB = await request('GET', '/events/organizer/my-events', null, orgBToken);
    const orgBHasEventB = orgBMyEventsB.data.data?.some((e) => e.id === testEventId);
    if (orgBHasEventB) {
      console.log(`   ✅ Organizer B successfully sees Event ${testEventId} in /events/organizer/my-events`);
    } else {
      console.error(`   ❌ Organizer B does NOT see Event ${testEventId}`);
      allPassed = false;
    }

    // --- TEST FLOW C: Admin unassigns Event 1 (organizer_id: null) ---
    console.log(`\n========================================================`);
    console.log(`TEST C: Admin unassigns Event ${testEventId} (organizer_id: null)`);
    console.log(`========================================================`);
    const unassignRes = await request('PATCH', `/events/${testEventId}/assign-organizer`, {
      organizer_id: null
    }, adminToken);

    if (unassignRes.status === 200 && unassignRes.data.success) {
      console.log(`   ✅ Unassign API response HTTP 200: ${unassignRes.data.message}`);
      console.log(`      Updated Event: organizer_id=${unassignRes.data.data.organizer_id}, organizer_name=${unassignRes.data.data.organizer_name}`);
    } else {
      console.error(`   ❌ Failed to unassign Event:`, unassignRes.data);
      allPassed = false;
    }

    // Verify Database has NULL organizer_id
    const [dbRows] = await pool.query('SELECT id, title, organizer_id FROM events WHERE id = ?', [testEventId]);
    if (dbRows[0].organizer_id === null) {
      console.log(`   ✅ Database verified: events.organizer_id IS NULL for Event ${testEventId}`);
    } else {
      console.error(`   ❌ Database check failed: events.organizer_id is ${dbRows[0].organizer_id}`);
      allPassed = false;
    }

    // Verify Organizer B no longer sees Event 1
    const orgBMyEventsC = await request('GET', '/events/organizer/my-events', null, orgBToken);
    const orgBHasEventC = orgBMyEventsC.data.data?.some((e) => e.id === testEventId);
    if (!orgBHasEventC) {
      console.log(`   ✅ Organizer B no longer sees Event ${testEventId} after unassignment`);
    } else {
      console.error(`   ❌ Organizer B still unexpectedly sees Event ${testEventId}`);
      allPassed = false;
    }

    // Verify Admin event list shows Unassigned
    const adminEventsRes = await request('GET', `/events/${testEventId}`, null, adminToken);
    if (adminEventsRes.data.data?.organizer_id === null && adminEventsRes.data.data?.organizer_name === null) {
      console.log(`   ✅ Admin Event details correctly show organizer as null / Unassigned`);
    } else {
      console.error(`   ❌ Admin Event details did not reflect unassigned status:`, adminEventsRes.data);
      allPassed = false;
    }

    // --- TEST FLOW D: Try assigning a student as organizer (reject HTTP 400) ---
    console.log(`\n========================================================`);
    console.log(`TEST D: Try assigning a student (${student.name}, ID: ${student.id}) as organizer`);
    console.log(`========================================================`);
    const assignStudentRes = await request('PATCH', `/events/${testEventId}/assign-organizer`, {
      organizer_id: student.id
    }, adminToken);

    if (assignStudentRes.status === 400) {
      console.log(`   ✅ Rejected with HTTP 400 Bad Request as expected: "${assignStudentRes.data.message}"`);
    } else {
      console.error(`   ❌ Expected HTTP 400 but got HTTP ${assignStudentRes.status}:`, assignStudentRes.data);
      allPassed = false;
    }

    // --- TEST FLOW E: Try assigning an inactive / blocked user (reject HTTP 400) ---
    console.log(`\n========================================================`);
    console.log(`TEST E: Try assigning an inactive / blocked user as organizer`);
    console.log(`========================================================`);
    // Create a temporary blocked organizer
    await pool.query("INSERT INTO users (name, email, password, role, status) VALUES ('Blocked Org', 'blocked_test@college.edu', 'hash123', 'organizer', 'blocked') ON DUPLICATE KEY UPDATE status = 'blocked'");
    const [blockedUsers] = await pool.query("SELECT id FROM users WHERE email = 'blocked_test@college.edu'");
    const blockedOrgId = blockedUsers[0].id;

    const assignBlockedRes = await request('PATCH', `/events/${testEventId}/assign-organizer`, {
      organizer_id: blockedOrgId
    }, adminToken);

    if (assignBlockedRes.status === 400) {
      console.log(`   ✅ Rejected blocked user with HTTP 400 Bad Request as expected: "${assignBlockedRes.data.message}"`);
    } else {
      console.error(`   ❌ Expected HTTP 400 for blocked user but got HTTP ${assignBlockedRes.status}:`, assignBlockedRes.data);
      allPassed = false;
    }

    // Cleanup test user
    await pool.query('DELETE FROM users WHERE email = "blocked_test@college.edu"');

    // Also test non-existent user ID
    const assignNonExistentRes = await request('PATCH', `/events/${testEventId}/assign-organizer`, {
      organizer_id: 999999
    }, adminToken);
    if (assignNonExistentRes.status === 400) {
      console.log(`   ✅ Rejected non-existent user with HTTP 400: "${assignNonExistentRes.data.message}"`);
    } else {
      console.error(`   ❌ Expected HTTP 400 for non-existent user but got HTTP ${assignNonExistentRes.status}`);
      allPassed = false;
    }

    // --- TEST FLOW F: Security - Try calling assignment endpoint as non-admin (HTTP 403) ---
    console.log(`\n========================================================`);
    console.log(`TEST F: Security check - Non-Admin access to assign-organizer endpoint`);
    console.log(`========================================================`);
    // Student calling endpoint
    const studentForbiddenRes = await request('PATCH', `/events/${testEventId}/assign-organizer`, {
      organizer_id: organizerA.id
    }, studentToken);
    if (studentForbiddenRes.status === 403) {
      console.log(`   ✅ Student rejected with HTTP 403 Forbidden: "${studentForbiddenRes.data.message}"`);
    } else {
      console.error(`   ❌ Expected HTTP 403 for student but got HTTP ${studentForbiddenRes.status}`);
      allPassed = false;
    }

    // Organizer calling endpoint
    const orgForbiddenRes = await request('PATCH', `/events/${testEventId}/assign-organizer`, {
      organizer_id: organizerA.id
    }, orgAToken);
    if (orgForbiddenRes.status === 403) {
      console.log(`   ✅ Organizer rejected with HTTP 403 Forbidden: "${orgForbiddenRes.data.message}"`);
    } else {
      console.error(`   ❌ Expected HTTP 403 for organizer but got HTTP ${orgForbiddenRes.status}`);
      allPassed = false;
    }

    // Unauthenticated calling endpoint
    const unauthRes = await request('PATCH', `/events/${testEventId}/assign-organizer`, {
      organizer_id: organizerA.id
    }, null);
    if (unauthRes.status === 401) {
      console.log(`   ✅ Unauthenticated request rejected with HTTP 401: "${unauthRes.data.message}"`);
    } else {
      console.error(`   ❌ Expected HTTP 401 for unauthenticated request but got HTTP ${unauthRes.status}`);
      allPassed = false;
    }

    // Restore Event 1 back to Organizer A for consistency
    await request('PATCH', `/events/${testEventId}/assign-organizer`, {
      organizer_id: organizerA.id
    }, adminToken);
    console.log(`\n   ℹ️ Restored Event ${testEventId} back to Organizer A (${organizerA.name}).`);

    console.log('\n================================================================');
    if (allPassed) {
      console.log('🎉 ALL ASSIGNMENT & UNASSIGNMENT VERIFICATION TESTS PASSED SUCCESSFULLY!');
    } else {
      console.log('⚠️ SOME VERIFICATION TESTS FAILED.');
    }
    console.log('================================================================\n');

  } catch (err) {
    console.error('❌ Test execution error:', err);
    allPassed = false;
  } finally {
    if (server) {
      server.close();
    }
    process.exit(allPassed ? 0 : 1);
  }
}

runAssignmentTests();
