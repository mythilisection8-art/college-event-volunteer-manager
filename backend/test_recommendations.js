const http = require('http');
const app = require('./server');

const PORT = 5097;
let server;
let baseUrl;

async function request(method, endpoint, body = null, token = null) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  const options = {
    method,
    headers,
    keepalive: false
  };
  if (body) {
    options.body = JSON.stringify(body);
  }
  const response = await fetch(`${baseUrl}${endpoint}`, options);
  const data = await response.json().catch(() => ({}));
  return { status: response.status, ok: response.ok, data };
}

async function runRecommendationTests() {
  console.log('🧪 Starting AI Event Recommendation Automated Verification Tests...\n');

  server = http.createServer(app);
  await new Promise((resolve) => server.listen(PORT, resolve));
  baseUrl = `http://localhost:${PORT}/api`;
  console.log(`[Test Server] Listening on ${baseUrl}\n`);

  let allPassed = true;

  try {
    // 1. Authenticate Student A (Rahul Verma - Computer Science)
    console.log('👉 1. Authenticating Student A (student@college.edu - Computer Science)...');
    const authA = await request('POST', '/auth/login', {
      email: 'student@college.edu',
      password: 'password123'
    });
    if (!authA.ok) throw new Error('Student A login failed: ' + JSON.stringify(authA.data));
    const tokenA = authA.data.token;
    console.log(`   ✅ Logged in as Student A: ${authA.data.user.name} (${authA.data.user.department})`);

    // 2. Authenticate Student B (Ananya Sen - Electronics & Comm)
    console.log('\n👉 2. Authenticating Student B (ananya@college.edu - Electronics & Comm)...');
    const authB = await request('POST', '/auth/login', {
      email: 'ananya@college.edu',
      password: 'password123'
    });
    if (!authB.ok) throw new Error('Student B login failed: ' + JSON.stringify(authB.data));
    const tokenB = authB.data.token;
    console.log(`   ✅ Logged in as Student B: ${authB.data.user.name} (${authB.data.user.department})`);

    // 3. Test Student A's Personalized Recommendations
    console.log('\n👉 3. Testing Personalized Recommendations for Student A...');
    const recsResA = await request('GET', '/events/recommendations', null, tokenA);
    if (!recsResA.ok || !recsResA.data.success) {
      throw new Error('Failed to fetch recommendations for Student A: ' + JSON.stringify(recsResA.data));
    }

    const recsA = recsResA.data.data;
    console.log(`   ✅ Received ${recsA.length} personalized recommendations for Student A:`);
    recsA.forEach((rec, i) => {
      console.log(`      ${i + 1}. "${rec.title}" | Category: ${rec.category_name} | Match: ${rec.match_score}% | Reason: "${rec.primary_reason}"`);
    });

    // Verify RULE 1: Already registered events are EXCLUDED
    // In seed data, Student A (Rahul) is registered for Event 1 (HackNova) and Event 3 (Sports Olympiad)
    const hasEvent1 = recsA.some(r => r.id === 1);
    const hasEvent3 = recsA.some(r => r.id === 3);
    if (hasEvent1 || hasEvent3) {
      console.error(`   ❌ Student A was recommended an event they are already registered for! (Event 1: ${hasEvent1}, Event 3: ${hasEvent3})`);
      allPassed = false;
    } else {
      console.log('   ✅ RULE VERIFIED: Already registered events (Event 1 & 3) strictly excluded from recommendations.');
    }

    // 4. Test Student B's Recommendations (Privacy & Personalization Isolation)
    console.log('\n👉 4. Testing Personalized Recommendations for Student B...');
    const recsResB = await request('GET', '/events/recommendations', null, tokenB);
    const recsB = recsResB.data.data;
    console.log(`   ✅ Received ${recsB.length} personalized recommendations for Student B:`);
    recsB.forEach((rec, i) => {
      console.log(`      ${i + 1}. "${rec.title}" | Category: ${rec.category_name} | Match: ${rec.match_score}% | Reason: "${rec.primary_reason}"`);
    });

    // In seed data, Student B (Ananya) is registered for Event 2 (Tarang) and Event 4 (GenAI Bootcamp)
    const bHasEvent2 = recsB.some(r => r.id === 2);
    const bHasEvent4 = recsB.some(r => r.id === 4);
    if (bHasEvent2 || bHasEvent4) {
      console.error(`   ❌ Student B was recommended an event they are already registered for! (Event 2: ${bHasEvent2}, Event 4: ${bHasEvent4})`);
      allPassed = false;
    } else {
      console.log('   ✅ RULE VERIFIED: Student B’s registered events (Event 2 & 4) strictly excluded.');
    }

    // Notice Student B CAN be recommended Event 1 (HackNova) which Student A is registered for
    const bCanSeeEvent1 = recsB.some(r => r.id === 1);
    if (bCanSeeEvent1) {
      console.log('   ✅ PERSONALIZATION VERIFIED: Event 1 (HackNova) is recommended to Student B but excluded for Student A.');
    }

    // 5. Test Dynamic Reactivity: Register Student A for a recommended event -> Verify immediate removal
    console.log('\n👉 5. Testing Dynamic Recommendation Reactivity (Register & Remove)...');
    // Pick the top recommended event for Student A (e.g. Event 4 or 6)
    const targetEvent = recsA[0];
    console.log(`   ℹ️ Target Event for registration test: Event ${targetEvent.id} ("${targetEvent.title}")`);

    const regTargetRes = await request('POST', `/attendees/${targetEvent.id}`, null, tokenA);
    console.log(`   ℹ️ Registration Action: HTTP ${regTargetRes.status} (${regTargetRes.data.message})`);

    // Fetch recommendations again
    const updatedRecsResA = await request('GET', '/events/recommendations', null, tokenA);
    const updatedRecsA = updatedRecsResA.data.data;
    const stillContainsTarget = updatedRecsA.some(r => r.id === targetEvent.id);

    if (stillContainsTarget) {
      console.error(`   ❌ Newly registered Event ${targetEvent.id} was still present in recommendations!`);
      allPassed = false;
    } else {
      console.log(`   ✅ Dynamic Reactivity Verified: Event ${targetEvent.id} immediately removed from Student A's recommendations upon booking.`);
    }

    // Cancel registration to restore state
    const cancelTargetRes = await request('DELETE', `/attendees/${targetEvent.id}/cancel`, null, tokenA);
    console.log(`   ℹ️ Cancellation Action: HTTP ${cancelTargetRes.status} (${cancelTargetRes.data.message})`);

    // Clean up test attendee registration record from DB
    const { pool } = require('./config/db');
    await pool.query('DELETE FROM attendee_registrations WHERE event_id = ? AND user_id = ?', [targetEvent.id, 5]);

    // 6. Test Security: Unauthenticated access blocked
    console.log('\n👉 6. Testing Security: Unauthenticated request to /events/recommendations...');
    const unauthRes = await request('GET', '/events/recommendations', null, null);
    if (unauthRes.status === 401) {
      console.log(`   ✅ Unauthenticated access correctly blocked with HTTP 401 (${unauthRes.data.message})`);
    } else {
      console.error(`   ❌ Unauthenticated request unexpectedly returned HTTP ${unauthRes.status}`);
      allPassed = false;
    }

    console.log('\n====================================================');
    if (allPassed) {
      console.log('🎉 ALL AI EVENT RECOMMENDATION TESTS PASSED!');
    } else {
      console.log('⚠️ SOME RECOMMENDATION TESTS FAILED.');
    }
    console.log('====================================================\n');
  } catch (error) {
    console.error('❌ Test suite fatal error:', error.message);
    allPassed = false;
  } finally {
    if (server) {
      server.close();
    }
    process.exit(allPassed ? 0 : 1);
  }
}

runRecommendationTests();

