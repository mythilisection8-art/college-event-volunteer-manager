const { pool } = require('../config/db');

// @desc    Get AI-powered personalized event recommendations for the logged-in student
// @route   GET /api/events/recommendations
// @access  Private (Authenticated student, organizer, admin)
const getPersonalizedRecommendations = async (req, res, next) => {
  try {
    const userId = req.user.id;

    // 1. Fetch student profile details
    const [users] = await pool.query(
      'SELECT id, name, email, department, role FROM users WHERE id = ?',
      [userId]
    );

    if (users.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User profile not found.'
      });
    }

    const student = users[0];
    const studentDept = (student.department || '').trim();

    // 2. Fetch categories student previously or currently registered to attend
    const [attendedCategories] = await pool.query(
      `SELECT DISTINCT e.category_id, c.name AS category_name
       FROM attendee_registrations ar
       JOIN events e ON ar.event_id = e.id
       JOIN categories c ON e.category_id = c.id
       WHERE ar.user_id = ? AND ar.status = 'registered'`,
      [userId]
    );

    // 3. Fetch categories where student had approved volunteer applications
    const [volunteeredCategories] = await pool.query(
      `SELECT DISTINCT e.category_id, c.name AS category_name
       FROM registrations r
       JOIN events e ON r.event_id = e.id
       JOIN categories c ON e.category_id = c.id
       WHERE r.user_id = ? AND r.status = 'approved'`,
      [userId]
    );

    // 4. Fetch list of event IDs where student is ALREADY registered as an attendee
    const [registeredEvents] = await pool.query(
      `SELECT event_id FROM attendee_registrations WHERE user_id = ? AND status = 'registered'`,
      [userId]
    );
    const registeredEventIds = new Set(registeredEvents.map((r) => r.event_id));

    const attendedCatSet = new Set(attendedCategories.map((c) => c.category_id));
    const volunteerCatSet = new Set(volunteeredCategories.map((c) => c.category_id));
    const hasHistory = attendedCatSet.size > 0 || volunteerCatSet.size > 0;

    // 5. Query candidate upcoming, open events
    const [candidateEvents] = await pool.query(
      `SELECT 
        e.id, 
        e.title, 
        e.description, 
        e.category_id, 
        e.event_date, 
        e.start_time, 
        e.end_time, 
        e.venue, 
        e.max_attendees, 
        e.max_volunteers, 
        e.registration_deadline, 
        e.banner_image, 
        e.status, 
        e.requirements,
        c.name AS category_name, 
        c.icon AS category_icon,
        u.name AS organizer_name, 
        u.department AS organizer_department,
        (SELECT COUNT(*) FROM attendee_registrations ar WHERE ar.event_id = e.id AND ar.status = 'registered') AS registered_attendees_count,
        (SELECT COUNT(*) FROM registrations r WHERE r.event_id = e.id AND r.status = 'approved') AS approved_volunteers_count,
        (SELECT status FROM registrations r WHERE r.event_id = e.id AND r.user_id = ? AND r.status != 'cancelled' LIMIT 1) AS user_volunteer_status
      FROM events e
      LEFT JOIN categories c ON e.category_id = c.id
      LEFT JOIN users u ON e.organizer_id = u.id
      WHERE e.status IN ('published', 'ongoing')
        AND e.event_date >= CURDATE()
        AND e.registration_deadline >= NOW()
      ORDER BY e.event_date ASC`,
      [userId]
    );

    // Department keyword mapper for intelligent relevance scoring
    const getDeptKeywords = (deptName) => {
      const lower = deptName.toLowerCase();
      const keywords = [lower];
      if (lower.includes('computer') || lower.includes('cse') || lower.includes('software')) {
        keywords.push('tech', 'code', 'coding', 'hackathon', 'ai', 'data', 'web', 'cyber', 'robotics', 'bootcamp');
      }
      if (lower.includes('information technology') || lower.includes('it')) {
        keywords.push('tech', 'cloud', 'data', 'software', 'coding', 'web', 'ai');
      }
      if (lower.includes('electronics') || lower.includes('ece') || lower.includes('electrical')) {
        keywords.push('robotics', 'hardware', 'circuit', 'iot', 'tech', 'automation');
      }
      if (lower.includes('mechanical') || lower.includes('mech')) {
        keywords.push('robotics', 'design', 'cad', 'workshop', 'automobile', 'manufacturing');
      }
      if (lower.includes('arts') || lower.includes('humanities') || lower.includes('literature')) {
        keywords.push('cultural', 'dance', 'music', 'drama', 'theatre', 'arts', 'fine arts');
      }
      if (lower.includes('sports') || lower.includes('physical')) {
        keywords.push('sports', 'athletics', 'fitness', 'tournament', 'cricket', 'football', 'olympiad');
      }
      return keywords;
    };

    const deptKeywords = studentDept ? getDeptKeywords(studentDept) : [];

    // 6. Intelligent Scoring Engine & Filtering
    const scoredRecommendations = candidateEvents
      .filter((evt) => {
        // RULE 1: Already registered attendee events should not be recommended
        if (registeredEventIds.has(evt.id)) return false;

        // RULE 2: Full events should not be recommended for attendee registration
        const maxAtt = parseInt(evt.max_attendees || 100, 10);
        const currentAtt = parseInt(evt.registered_attendees_count || 0, 10);
        if (currentAtt >= maxAtt) return false;

        return true;
      })
      .map((evt) => {
        let score = 45; // Baseline qualification score
        const matchReasons = [];

        const catId = evt.category_id;
        const catName = evt.category_name || 'General';
        const titleLower = (evt.title || '').toLowerCase();
        const descLower = (evt.description || '').toLowerCase();
        const maxAtt = parseInt(evt.max_attendees || 100, 10);
        const currentAtt = parseInt(evt.registered_attendees_count || 0, 10);
        const seatsRemaining = Math.max(0, maxAtt - currentAtt);

        // Signal 1: Attended Category Affinity (+25 pts)
        if (attendedCatSet.has(catId)) {
          score += 25;
          matchReasons.push(`Matches your interest in ${catName}`);
        }

        // Signal 2: Volunteer Engagement Category Affinity (+15 pts)
        if (volunteerCatSet.has(catId)) {
          score += 15;
          if (!attendedCatSet.has(catId)) {
            matchReasons.push(`Aligned with your volunteer experience in ${catName}`);
          }
        }

        // Signal 3: Department Contextual Relevance (+15 pts)
        let deptMatched = false;
        if (deptKeywords.length > 0) {
          for (const kw of deptKeywords) {
            if (
              titleLower.includes(kw) ||
              descLower.includes(kw) ||
              catName.toLowerCase().includes(kw) ||
              (evt.organizer_department && evt.organizer_department.toLowerCase().includes(kw))
            ) {
              deptMatched = true;
              break;
            }
          }
        }

        if (deptMatched) {
          score += 15;
          matchReasons.push(`Recommended for ${studentDept} students`);
        }

        // Signal 4: Social Proof / Popularity (+10 pts)
        const occupancyRate = maxAtt > 0 ? (currentAtt / maxAtt) * 100 : 0;
        if (currentAtt >= 2 || occupancyRate >= 15) {
          score += 10;
          if (matchReasons.length < 2) {
            matchReasons.push('Trending campus event with high student turnout');
          }
        }

        // Signal 5: Upcoming Proximity & Seat Availability (+10 pts)
        const eventDate = new Date(evt.event_date);
        const today = new Date();
        const diffDays = Math.ceil((eventDate - today) / (1000 * 60 * 60 * 24));

        if (diffDays <= 7 && diffDays >= 0) {
          score += 8;
          if (matchReasons.length < 2) {
            matchReasons.push('Happening this week - Open seats');
          }
        } else if (diffDays <= 14 && diffDays > 0) {
          score += 5;
        }

        if (seatsRemaining > 0 && seatsRemaining <= 15) {
          score += 4;
          if (matchReasons.length < 2) {
            matchReasons.push(`Fast filling (${seatsRemaining} seats left)`);
          }
        }

        // Cold Start Handling (if student has no historical activity)
        if (!hasHistory) {
          score = Math.min(95, score + 15);
          if (matchReasons.length === 0) {
            matchReasons.push('Popular flagship event open for student registration');
          }
        }

        // Bound match score between 55% and 98%
        const normalizedScore = Math.min(98, Math.max(55, Math.round(score)));

        return {
          id: evt.id,
          title: evt.title,
          description: evt.description,
          category_id: evt.category_id,
          category_name: evt.category_name,
          category_icon: evt.category_icon,
          event_date: evt.event_date,
          start_time: evt.start_time,
          end_time: evt.end_time,
          venue: evt.venue,
          max_attendees: evt.max_attendees,
          registered_attendees_count: currentAtt,
          seats_remaining: seatsRemaining,
          max_volunteers: evt.max_volunteers,
          approved_volunteers_count: evt.approved_volunteers_count,
          banner_image: evt.banner_image,
          organizer_name: evt.organizer_name,
          user_volunteer_status: evt.user_volunteer_status,
          match_score: normalizedScore,
          match_reasons: matchReasons.slice(0, 2),
          primary_reason: matchReasons[0] || 'Matches your campus engagement profile'
        };
      })
      .sort((a, b) => b.match_score - a.match_score || new Date(a.event_date) - new Date(b.event_date))
      .slice(0, 6);

    res.json({
      success: true,
      meta: {
        student_id: student.id,
        student_name: student.name,
        department: studentDept || 'General',
        has_history: hasHistory,
        recommendation_engine: 'intelligent-multi-factor-scoring'
      },
      data: scoredRecommendations
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getPersonalizedRecommendations
};
