const http = require('http');
const app = require('./server');

const PORT = 5098;
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

async function runAnalyticsTests() {
  console.log('🧪 Starting Comprehensive Advanced Analytics Verification Tests...\n');

  server = http.createServer(app);
  await new Promise((resolve) => server.listen(PORT, resolve));
  baseUrl = `http://localhost:${PORT}/api`;
  console.log(`[Test Server] Listening on ${baseUrl}\n`);

  let allPassed = true;

  try {
    // 1. Authenticate Admin
    console.log('👉 1. Authenticating Admin (admin@college.edu)...');
    const adminAuth = await request('POST', '/auth/login', {
      email: 'admin@college.edu',
      password: 'password123'
    });
    if (!adminAuth.ok) throw new Error('Admin login failed: ' + JSON.stringify(adminAuth.data));
    const adminToken = adminAuth.data.token;
    console.log(`   ✅ Logged in as Admin: ${adminAuth.data.user.name}`);

    // 2. Authenticate Student (student@college.edu)
    console.log('\n👉 2. Authenticating Student (student@college.edu)...');
    const studentAuth = await request('POST', '/auth/login', {
      email: 'student@college.edu',
      password: 'password123'
    });
    if (!studentAuth.ok) throw new Error('Student login failed: ' + JSON.stringify(studentAuth.data));
    const studentToken = studentAuth.data.token;
    console.log(`   ✅ Logged in as Student: ${studentAuth.data.user.name}`);

    // 3. Test Full System Analytics (No Filters)
    console.log('\n👉 3. Testing Full System Analytics API (/admin/stats)...');
    const statsRes = await request('GET', '/admin/stats', null, adminToken);
    if (!statsRes.ok || !statsRes.data.success) {
      throw new Error('Failed to fetch admin stats: ' + JSON.stringify(statsRes.data));
    }
    const data = statsRes.data.data;
    console.log('   ✅ Analytics Response Received Successfully:');
    console.log(`      - Total Events: ${data.events.total_events} (Upcoming: ${data.events.upcoming_events}, Completed: ${data.events.completed_events})`);
    console.log(`      - Attendee Seats: ${data.attendees.active_attendees} / ${data.attendees.total_seats} (Occupancy: ${data.attendees.seat_occupancy_rate}%)`);
    console.log(`      - Volunteer Apps: ${data.volunteers.total_volunteer_applications} (Approved: ${data.volunteers.approved_volunteers}, Approval Rate: ${data.volunteers.approval_rate}%)`);
    console.log(`      - Popular Events Count: ${data.popularEvents.length}`);
    console.log(`      - Category Breakdown Count: ${data.categoryStats?.length || 0}`);
    console.log(`      - Department Participation Count: ${data.departmentStats.length}`);
    console.log(`      - Registration Trends Data Points: ${data.registrationTrends?.length || 0}`);

    if (!data.events || !data.attendees || !data.volunteers || !data.kpis || !Array.isArray(data.popularEvents) || !Array.isArray(data.categoryStats) || !Array.isArray(data.departmentStats) || !Array.isArray(data.registrationTrends)) {
      console.error('   ❌ Invalid analytics schema structure returned!');
      allPassed = false;
    } else {
      console.log('   ✅ All 7 analytics schema groups validated.');
    }

    // 4. Test Category Filter
    console.log('\n👉 4. Testing Filter by Category (category_id=1 - Technical & Coding)...');
    const catFilterRes = await request('GET', '/admin/stats?category_id=1', null, adminToken);
    if (catFilterRes.ok && catFilterRes.data.success) {
      const catData = catFilterRes.data.data;
      console.log(`   ✅ Category 1 Filtered Events: ${catData.events.total_events} (Seats: ${catData.attendees.total_seats})`);
      if (catData.popularEvents.some(e => e.category_name !== 'Technical & Coding' && e.category_id !== 1)) {
        console.error('   ❌ Non-category 1 events returned under category 1 filter!');
        allPassed = false;
      } else {
        console.log('   ✅ Category filter strictly scoped to Technical & Coding events.');
      }
    } else {
      console.error('   ❌ Category filter query failed:', catFilterRes.data);
      allPassed = false;
    }

    // 5. Test Event Status Filter
    console.log('\n👉 5. Testing Filter by Status (status=published)...');
    const statusFilterRes = await request('GET', '/admin/stats?status=published', null, adminToken);
    if (statusFilterRes.ok && statusFilterRes.data.success) {
      const statusData = statusFilterRes.data.data;
      console.log(`   ✅ Published Events Count: ${statusData.events.total_events} (Published metric: ${statusData.events.published_events})`);
      if (statusData.events.draft_events !== 0 || statusData.events.cancelled_events !== 0) {
        console.error('   ❌ Status filter did not isolate published events!');
        allPassed = false;
      } else {
        console.log('   ✅ Status filter successfully isolated published events.');
      }
    } else {
      console.error('   ❌ Status filter query failed:', statusFilterRes.data);
      allPassed = false;
    }

    // 6. Test Specific Event Filter
    console.log('\n👉 6. Testing Filter by Specific Event (event_id=1 - HackNova 2026)...');
    const eventFilterRes = await request('GET', '/admin/stats?event_id=1', null, adminToken);
    if (eventFilterRes.ok && eventFilterRes.data.success) {
      const evData = eventFilterRes.data.data;
      console.log(`   ✅ Event 1 Filtered Total Events: ${evData.events.total_events} (Seat Capacity: ${evData.attendees.total_seats})`);
      if (evData.events.total_events !== 1 || evData.popularEvents.length > 1) {
        console.error('   ❌ Specific event filter did not return exactly 1 event scope!');
        allPassed = false;
      } else {
        console.log('   ✅ Specific event filter correctly isolated single event metrics.');
      }
    } else {
      console.error('   ❌ Specific event filter query failed:', eventFilterRes.data);
      allPassed = false;
    }

    // 7. Test Date Range Filter
    console.log('\n👉 7. Testing Filter by Date Range (start_date=2026-01-01, end_date=2026-12-31)...');
    const dateFilterRes = await request('GET', '/admin/stats?start_date=2026-01-01&end_date=2026-12-31', null, adminToken);
    if (dateFilterRes.ok && dateFilterRes.data.success) {
      const dateData = dateFilterRes.data.data;
      console.log(`   ✅ Date Filtered Total Events: ${dateData.events.total_events}`);
    } else {
      console.error('   ❌ Date filter query failed:', dateFilterRes.data);
      allPassed = false;
    }

    // 8. Test Dynamic Metric Update: Student Attendee Registration and Cancellation
    console.log('\n👉 8. Testing Real Dynamic Reactivity: Attendee Registration & Cancellation...');
    const initialEv2 = await request('GET', '/admin/stats?event_id=2', null, adminToken);
    const initialActive = initialEv2.data.data.attendees.active_attendees;
    const initialCancelled = initialEv2.data.data.attendees.cancelled_attendees;
    console.log(`   ℹ️ Initial Event 2 Attendees: Active=${initialActive}, Cancelled=${initialCancelled}`);

    const regRes = await request('POST', '/attendees/2', null, studentToken);
    console.log(`   ℹ️ Student Registration Action: HTTP ${regRes.status} (${regRes.data.message})`);

    const afterReg = await request('GET', '/admin/stats?event_id=2', null, adminToken);
    const activeAfterReg = afterReg.data.data.attendees.active_attendees;
    console.log(`   ℹ️ Event 2 Attendees After Register: Active=${activeAfterReg} (Expected: ${initialActive + 1})`);

    if (activeAfterReg !== initialActive + 1) {
      console.error('   ❌ Active attendees did not increment after registration!');
      allPassed = false;
    } else {
      console.log('   ✅ Analytics dynamically incremented active attendees upon registration.');
    }

    const cancelRes = await request('DELETE', '/attendees/2/cancel', null, studentToken);
    console.log(`   ℹ️ Student Cancellation Action: HTTP ${cancelRes.status} (${cancelRes.data.message})`);

    const afterCancel = await request('GET', '/admin/stats?event_id=2', null, adminToken);
    const activeAfterCancel = afterCancel.data.data.attendees.active_attendees;
    const cancelledAfterCancel = afterCancel.data.data.attendees.cancelled_attendees;
    console.log(`   ℹ️ Event 2 Attendees After Cancellation: Active=${activeAfterCancel}, Cancelled=${cancelledAfterCancel}`);

    if (activeAfterCancel !== initialActive || cancelledAfterCancel < 1) {
      console.error('   ❌ Active/cancelled attendee metrics did not update correctly after cancellation!');
      allPassed = false;
    } else {
      console.log('   ✅ Analytics dynamically updated active and cancelled attendee counts.');
    }

    // 9. Security Test: Non-Admin Access to /admin/stats
    console.log('\n👉 9. Security Test: Non-Admin Access to /admin/stats...');
    const nonAdminRes = await request('GET', '/admin/stats', null, studentToken);
    if (nonAdminRes.status === 403) {
      console.log(`   ✅ Access correctly forbidden for student with HTTP 403 (${nonAdminRes.data.message})`);
    } else {
      console.error(`   ❌ Student unexpectedly accessed /admin/stats with HTTP ${nonAdminRes.status}`);
      allPassed = false;
    }

    console.log('\n====================================================');
    if (allPassed) {
      console.log('🎉 ALL ADVANCED ANALYTICS VERIFICATION TESTS PASSED!');
    } else {
      console.log('⚠️ SOME ANALYTICS TESTS FAILED.');
    }
    console.log('====================================================\n');
  } catch (error) {
    console.error('❌ Test suite fatal error:', error.message);
    allPassed = false;
  } finally {
    if (server) {
      if (server.closeAllConnections) server.closeAllConnections();
      server.close();
    }
    process.exit(allPassed ? 0 : 1);
  }
}

runAnalyticsTests();
