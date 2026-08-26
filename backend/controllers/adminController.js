const bcrypt = require('bcryptjs');
const { pool } = require('../config/db');

// @desc    Get complete system analytics and dashboard statistics (Realistic Event Management KPIs)
// @route   GET /api/admin/stats
// @access  Private (Admin)
const getAdminStats = async (req, res, next) => {
  try {
    const { category_id, status, start_date, end_date, event_id } = req.query;

    let eventWhereClauses = [];
    let eventQueryParams = [];

    // Filter by category
    if (category_id && category_id !== 'all') {
      eventWhereClauses.push('e.category_id = ?');
      eventQueryParams.push(parseInt(category_id, 10));
    }

    // Filter by status
    if (status && status !== 'all') {
      eventWhereClauses.push('e.status = ?');
      eventQueryParams.push(status);
    }

    // Filter by start date (event date from)
    if (start_date && start_date.trim() !== '') {
      eventWhereClauses.push('e.event_date >= ?');
      eventQueryParams.push(start_date.trim());
    }

    // Filter by end date (event date to)
    if (end_date && end_date.trim() !== '') {
      eventWhereClauses.push('e.event_date <= ?');
      eventQueryParams.push(end_date.trim());
    }

    // Filter by specific event
    if (event_id && event_id !== 'all') {
      eventWhereClauses.push('e.id = ?');
      eventQueryParams.push(parseInt(event_id, 10));
    }

    const eventWhereSql = eventWhereClauses.length > 0 ? `WHERE ${eventWhereClauses.join(' AND ')}` : '';

    // 1. User counts (platform wide)
    const [userCounts] = await pool.query(`
      SELECT 
        COUNT(*) AS total_users,
        SUM(CASE WHEN role = 'student' THEN 1 ELSE 0 END) AS total_students,
        SUM(CASE WHEN role = 'organizer' THEN 1 ELSE 0 END) AS total_organizers,
        SUM(CASE WHEN role = 'admin' THEN 1 ELSE 0 END) AS total_admins,
        SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) AS active_users,
        SUM(CASE WHEN status = 'blocked' THEN 1 ELSE 0 END) AS blocked_users
      FROM users
    `);

    // 2. Event counts and total capacities (filtered)
    const [eventCounts] = await pool.query(`
      SELECT 
        COUNT(*) AS total_events,
        SUM(CASE WHEN e.status = 'published' THEN 1 ELSE 0 END) AS published_events,
        SUM(CASE WHEN e.status = 'ongoing' THEN 1 ELSE 0 END) AS ongoing_events,
        SUM(CASE WHEN e.status = 'completed' THEN 1 ELSE 0 END) AS completed_events,
        SUM(CASE WHEN e.status = 'cancelled' THEN 1 ELSE 0 END) AS cancelled_events,
        SUM(CASE WHEN e.status = 'draft' THEN 1 ELSE 0 END) AS draft_events,
        SUM(CASE WHEN e.event_date >= CURDATE() AND e.status IN ('published', 'ongoing') THEN 1 ELSE 0 END) AS upcoming_events,
        COALESCE(SUM(e.max_attendees), 0) AS total_seat_capacity,
        COALESCE(SUM(e.max_volunteers), 0) AS total_volunteer_quota
      FROM events e
      ${eventWhereSql}
    `, eventQueryParams);

    // 3. Attendee Registration counts (filtered by events)
    const [attendeeCounts] = await pool.query(`
      SELECT 
        COUNT(ar.id) AS total_attendee_registrations,
        SUM(CASE WHEN ar.status = 'registered' THEN 1 ELSE 0 END) AS active_attendees,
        SUM(CASE WHEN ar.status = 'cancelled' THEN 1 ELSE 0 END) AS cancelled_attendees
      FROM attendee_registrations ar
      JOIN events e ON ar.event_id = e.id
      ${eventWhereSql}
    `, eventQueryParams);

    // 4. Volunteer Application counts (filtered by events)
    const [volunteerCounts] = await pool.query(`
      SELECT 
        COUNT(r.id) AS total_volunteer_applications,
        SUM(CASE WHEN r.status = 'approved' THEN 1 ELSE 0 END) AS approved_volunteers,
        SUM(CASE WHEN r.status = 'pending' THEN 1 ELSE 0 END) AS pending_volunteers,
        SUM(CASE WHEN r.status = 'rejected' THEN 1 ELSE 0 END) AS rejected_volunteers,
        SUM(CASE WHEN r.status = 'cancelled' THEN 1 ELSE 0 END) AS cancelled_volunteers,
        SUM(CASE WHEN r.attendance_status IN ('present', 'completed') THEN 1 ELSE 0 END) AS attended_volunteers
      FROM registrations r
      JOIN events e ON r.event_id = e.id
      ${eventWhereSql}
    `, eventQueryParams);

    // 5. Popular Events ranking (by registered attendees & volunteers)
    const [popularEventsRows] = await pool.query(`
      SELECT 
        e.id, 
        e.title, 
        e.event_date,
        e.venue,
        e.status,
        e.max_attendees,
        e.max_volunteers,
        c.name AS category_name,
        u.name AS organizer_name,
        (SELECT COUNT(*) FROM attendee_registrations ar WHERE ar.event_id = e.id AND ar.status = 'registered') AS attendee_count,
        (SELECT COUNT(*) FROM attendee_registrations ar WHERE ar.event_id = e.id) AS total_attendee_registrations,
        (SELECT COUNT(*) FROM registrations r WHERE r.event_id = e.id AND r.status = 'approved') AS approved_volunteers_count,
        (SELECT COUNT(*) FROM registrations r WHERE r.event_id = e.id AND r.status != 'cancelled') AS total_volunteer_applications
      FROM events e
      LEFT JOIN categories c ON e.category_id = c.id
      LEFT JOIN users u ON e.organizer_id = u.id
      ${eventWhereSql}
      ORDER BY attendee_count DESC, approved_volunteers_count DESC, e.event_date ASC
      LIMIT 10
    `, eventQueryParams);

    const popularEvents = popularEventsRows.map((evt) => {
      const maxAttendees = parseInt(evt.max_attendees || 0, 10);
      const activeAtt = parseInt(evt.attendee_count || 0, 10);
      const occupancyRate = maxAttendees > 0 ? Math.min(100, Math.round((activeAtt / maxAttendees) * 100)) : 0;
      return {
        ...evt,
        occupancy_percentage: occupancyRate
      };
    });

    // 6. Category Performance & Participation
    const [categoryStats] = await pool.query(`
      SELECT 
        c.id,
        c.name AS category_name,
        c.icon,
        COUNT(DISTINCT e.id) AS event_count,
        COALESCE(SUM(e.max_attendees), 0) AS total_capacity,
        COALESCE(SUM(att.active_attendees), 0) AS total_attendees,
        COALESCE(SUM(vol.approved_volunteers), 0) AS approved_volunteers,
        COALESCE(SUM(vol.total_volunteer_apps), 0) AS total_volunteer_applications
      FROM categories c
      JOIN events e ON e.category_id = c.id
      LEFT JOIN (
        SELECT event_id, COUNT(*) AS active_attendees 
        FROM attendee_registrations 
        WHERE status = 'registered' 
        GROUP BY event_id
      ) att ON att.event_id = e.id
      LEFT JOIN (
        SELECT 
          event_id, 
          SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END) AS approved_volunteers,
          COUNT(*) AS total_volunteer_apps
        FROM registrations 
        GROUP BY event_id
      ) vol ON vol.event_id = e.id
      ${eventWhereSql}
      GROUP BY c.id, c.name, c.icon
      ORDER BY total_attendees DESC, event_count DESC
    `, eventQueryParams);

    // 7. Department Participation Breakdown (Cartesian-safe)
    const [departmentStats] = await pool.query(`
      SELECT 
        dept.department,
        COALESCE(att.attendee_count, 0) AS attendee_registrations_count,
        COALESCE(vol.volunteer_count, 0) AS volunteer_applications_count,
        COALESCE(vol.approved_count, 0) AS approved_volunteers_count,
        (COALESCE(att.attendee_count, 0) + COALESCE(vol.volunteer_count, 0)) AS total_participation
      FROM (
        SELECT DISTINCT department FROM users WHERE role = 'student' AND department IS NOT NULL AND department != ''
      ) dept
      LEFT JOIN (
        SELECT u.department, COUNT(DISTINCT ar.id) AS attendee_count
        FROM attendee_registrations ar
        JOIN users u ON ar.user_id = u.id
        JOIN events e ON ar.event_id = e.id
        WHERE ar.status = 'registered' ${eventWhereClauses.length > 0 ? `AND ${eventWhereClauses.join(' AND ')}` : ''}
        GROUP BY u.department
      ) att ON dept.department = att.department
      LEFT JOIN (
        SELECT u.department, 
               COUNT(DISTINCT r.id) AS volunteer_count,
               SUM(CASE WHEN r.status = 'approved' THEN 1 ELSE 0 END) AS approved_count
        FROM registrations r
        JOIN users u ON r.user_id = u.id
        JOIN events e ON r.event_id = e.id
        ${eventWhereSql}
        GROUP BY u.department
      ) vol ON dept.department = vol.department
      WHERE (COALESCE(att.attendee_count, 0) + COALESCE(vol.volunteer_count, 0)) > 0
      ORDER BY total_participation DESC, attendee_registrations_count DESC
    `, [...eventQueryParams, ...eventQueryParams]);

    // 8. Participation Trends by Registration Date
    const [registrationTrends] = await pool.query(`
      SELECT 
        t.reg_date,
        DATE_FORMAT(t.reg_date, '%b %d') AS short_date,
        DATE_FORMAT(t.reg_date, '%b %d, %Y') AS formatted_date,
        COALESCE(att.attendee_count, 0) AS attendee_registrations,
        COALESCE(vol.volunteer_count, 0) AS volunteer_applications,
        (COALESCE(att.attendee_count, 0) + COALESCE(vol.volunteer_count, 0)) AS total_registrations
      FROM (
        SELECT DATE(ar.registered_at) AS reg_date
        FROM attendee_registrations ar
        JOIN events e ON ar.event_id = e.id
        ${eventWhereSql}
        UNION
        SELECT DATE(r.registered_at) AS reg_date
        FROM registrations r
        JOIN events e ON r.event_id = e.id
        ${eventWhereSql}
      ) t
      LEFT JOIN (
        SELECT DATE(ar.registered_at) AS reg_date, COUNT(*) AS attendee_count
        FROM attendee_registrations ar
        JOIN events e ON ar.event_id = e.id
        ${eventWhereSql}
        GROUP BY DATE(ar.registered_at)
      ) att ON t.reg_date = att.reg_date
      LEFT JOIN (
        SELECT DATE(r.registered_at) AS reg_date, COUNT(*) AS volunteer_count
        FROM registrations r
        JOIN events e ON r.event_id = e.id
        ${eventWhereSql}
        GROUP BY DATE(r.registered_at)
      ) vol ON t.reg_date = vol.reg_date
      WHERE t.reg_date IS NOT NULL
      ORDER BY t.reg_date ASC
    `, [...eventQueryParams, ...eventQueryParams, ...eventQueryParams, ...eventQueryParams]);

    // 9. Recent Attendee and Volunteer Activities
    const [recentAttendees] = await pool.query(`
      SELECT 
        ar.id, ar.status, ar.registered_at,
        u.name AS student_name, u.email AS student_email, u.department AS student_department,
        e.title AS event_title
      FROM attendee_registrations ar
      JOIN users u ON ar.user_id = u.id
      JOIN events e ON ar.event_id = e.id
      ORDER BY ar.registered_at DESC
      LIMIT 5
    `);

    const [recentVolunteers] = await pool.query(`
      SELECT 
        r.id, r.status, r.registered_at,
        u.name AS student_name, u.email AS student_email, u.department AS student_department,
        e.title AS event_title
      FROM registrations r
      JOIN users u ON r.user_id = u.id
      JOIN events e ON r.event_id = e.id
      ORDER BY r.registered_at DESC
      LIMIT 5
    `);

    // 10. Recent Users
    const [recentUsers] = await pool.query(`
      SELECT id, name, email, role, department, status, created_at
      FROM users
      ORDER BY created_at DESC
      LIMIT 5
    `);

    // KPI calculations with safe division by zero handling
    const totalSeats = parseInt(eventCounts[0]?.total_seat_capacity || 0, 10);
    const activeAttendees = parseInt(attendeeCounts[0]?.active_attendees || 0, 10);
    const totalAttendeeRegs = parseInt(attendeeCounts[0]?.total_attendee_registrations || 0, 10);
    const cancelledAttendees = parseInt(attendeeCounts[0]?.cancelled_attendees || 0, 10);
    const seatOccupancyRate = totalSeats > 0 ? Math.min(100, Math.round((activeAttendees / totalSeats) * 100)) : 0;

    const totalVolApps = parseInt(volunteerCounts[0]?.total_volunteer_applications || 0, 10);
    const approvedVolunteers = parseInt(volunteerCounts[0]?.approved_volunteers || 0, 10);
    const pendingVolunteers = parseInt(volunteerCounts[0]?.pending_volunteers || 0, 10);
    const rejectedVolunteers = parseInt(volunteerCounts[0]?.rejected_volunteers || 0, 10);
    const cancelledVolunteers = parseInt(volunteerCounts[0]?.cancelled_volunteers || 0, 10);
    const attendedVolunteers = parseInt(volunteerCounts[0]?.attended_volunteers || 0, 10);

    const volunteerApprovalRate = totalVolApps > 0 ? Math.min(100, Math.round((approvedVolunteers / totalVolApps) * 100)) : 0;
    const volunteerCompletionRate = approvedVolunteers > 0 ? Math.min(100, Math.round((attendedVolunteers / approvedVolunteers) * 100)) : 0;

    res.json({
      success: true,
      data: {
        users: {
          total_users: parseInt(userCounts[0]?.total_users || 0, 10),
          total_students: parseInt(userCounts[0]?.total_students || 0, 10),
          total_organizers: parseInt(userCounts[0]?.total_organizers || 0, 10),
          total_admins: parseInt(userCounts[0]?.total_admins || 0, 10),
          active_users: parseInt(userCounts[0]?.active_users || 0, 10),
          blocked_users: parseInt(userCounts[0]?.blocked_users || 0, 10),
        },
        events: {
          total_events: parseInt(eventCounts[0]?.total_events || 0, 10),
          published_events: parseInt(eventCounts[0]?.published_events || 0, 10),
          ongoing_events: parseInt(eventCounts[0]?.ongoing_events || 0, 10),
          completed_events: parseInt(eventCounts[0]?.completed_events || 0, 10),
          cancelled_events: parseInt(eventCounts[0]?.cancelled_events || 0, 10),
          draft_events: parseInt(eventCounts[0]?.draft_events || 0, 10),
          upcoming_events: parseInt(eventCounts[0]?.upcoming_events || 0, 10),
          total_seat_capacity: totalSeats,
          total_volunteer_quota: parseInt(eventCounts[0]?.total_volunteer_quota || 0, 10),
        },
        attendees: {
          total_attendee_registrations: totalAttendeeRegs,
          active_attendees: activeAttendees,
          cancelled_attendees: cancelledAttendees,
          total_seats: totalSeats,
          seats_remaining: Math.max(0, totalSeats - activeAttendees),
          seat_occupancy_rate: seatOccupancyRate,
        },
        volunteers: {
          total_volunteer_applications: totalVolApps,
          approved_volunteers: approvedVolunteers,
          pending_volunteers: pendingVolunteers,
          rejected_volunteers: rejectedVolunteers,
          cancelled_volunteers: cancelledVolunteers,
          attended_volunteers: attendedVolunteers,
          approval_rate: volunteerApprovalRate,
          completion_rate: volunteerCompletionRate,
        },
        kpis: {
          seatOccupancyRate,
          volunteerApprovalRate,
          volunteerAcceptanceRate: volunteerApprovalRate,
          volunteerCompletionRate,
          totalSeats,
          activeAttendees,
          approvedVolunteers,
          pendingVolunteers,
          rejectedVolunteers,
          attendedVolunteers,
          totalVolApps,
          totalEvents: parseInt(eventCounts[0]?.total_events || 0, 10),
          upcomingEvents: parseInt(eventCounts[0]?.upcoming_events || 0, 10),
          ongoingEvents: parseInt(eventCounts[0]?.ongoing_events || 0, 10),
          completedEvents: parseInt(eventCounts[0]?.completed_events || 0, 10),
          cancelledEvents: parseInt(eventCounts[0]?.cancelled_events || 0, 10),
          totalAttendeeRegistrations: totalAttendeeRegs,
        },
        popularEvents,
        categoryStats,
        departmentStats,
        registrationTrends,
        recentAttendees,
        recentVolunteers,
        recentUsers,
        filters: {
          category_id: category_id || 'all',
          status: status || 'all',
          start_date: start_date || null,
          end_date: end_date || null,
          event_id: event_id || 'all'
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all users with search, role, status filters, and pagination
// @route   GET /api/admin/users
// @access  Private (Admin)
const getAllUsers = async (req, res, next) => {
  try {
    const { search, role, status, department, page = 1, limit = 10 } = req.query;

    const pageNum = parseInt(page, 10) || 1;
    const limitNum = parseInt(limit, 10) || 10;
    const offset = (pageNum - 1) * limitNum;

    let whereClauses = [];
    let queryParams = [];

    if (search && search.trim() !== '') {
      whereClauses.push('(name LIKE ? OR email LIKE ? OR roll_number LIKE ? OR department LIKE ?)');
      const term = `%${search.trim()}%`;
      queryParams.push(term, term, term, term);
    }

    if (role && role !== 'all') {
      whereClauses.push('role = ?');
      queryParams.push(role);
    }

    if (status && status !== 'all') {
      whereClauses.push('status = ?');
      queryParams.push(status);
    }

    if (department && department !== 'all') {
      whereClauses.push('department = ?');
      queryParams.push(department);
    }

    const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    const [countRes] = await pool.query(`SELECT COUNT(*) AS total FROM users ${whereSql}`, queryParams);
    const total = countRes[0].total;

    const query = `
      SELECT 
        u.id, u.name, u.email, u.role, u.department, u.roll_number, u.phone, u.status, u.avatar, u.created_at,
        (SELECT COUNT(*) FROM attendee_registrations ar WHERE ar.user_id = u.id AND ar.status = 'registered') AS total_attended_events,
        (SELECT COUNT(*) FROM registrations r WHERE r.user_id = u.id) AS total_volunteer_applications,
        (SELECT COUNT(*) FROM events e WHERE e.organizer_id = u.id) AS total_hosted_events
      FROM users u
      ${whereSql}
      ORDER BY u.created_at DESC
      LIMIT ? OFFSET ?
    `;

    const [users] = await pool.query(query, [...queryParams, limitNum, offset]);

    res.json({
      success: true,
      data: users,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum)
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Admin create new user (Organizer, Admin, Student)
// @route   POST /api/admin/users
// @access  Private (Admin)
const createUser = async (req, res, next) => {
  try {
    const { name, email, password, role, department, roll_number, phone } = req.body;

    if (!name || !email || !password || !role) {
      return res.status(400).json({
        success: false,
        message: 'Name, email, password, and role are required.'
      });
    }

    const [existing] = await pool.query('SELECT id FROM users WHERE email = ?', [email]);
    if (existing.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'An account with this email already exists.'
      });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const [result] = await pool.query(
      `INSERT INTO users (name, email, password, role, department, roll_number, phone, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'active')`,
      [name, email, hashedPassword, role, department || null, roll_number || null, phone || null]
    );

    res.status(201).json({
      success: true,
      message: `User account (${role}) created successfully!`,
      userId: result.insertId
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update user status (active / blocked)
// @route   PATCH /api/admin/users/:id/status
// @access  Private (Admin)
const updateUserStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!['active', 'blocked'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Status must be active or blocked.'
      });
    }

    // Protect against self-blocking
    if (parseInt(id, 10) === req.user.id) {
      return res.status(400).json({
        success: false,
        message: 'You cannot block your own admin account.'
      });
    }

    await pool.query('UPDATE users SET status = ? WHERE id = ?', [status, id]);

    res.json({
      success: true,
      message: `User status changed to "${status}".`
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update user role
// @route   PATCH /api/admin/users/:id/role
// @access  Private (Admin)
const updateUserRole = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { role } = req.body;

    if (!['student', 'organizer', 'admin'].includes(role)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid role. Must be student, organizer, or admin.'
      });
    }

    // Prevent changing own role
    if (parseInt(id, 10) === req.user.id) {
      return res.status(400).json({
        success: false,
        message: 'You cannot change your own admin role.'
      });
    }

    await pool.query('UPDATE users SET role = ? WHERE id = ?', [role, id]);

    res.json({
      success: true,
      message: `User role successfully updated to "${role}".`
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete user
// @route   DELETE /api/admin/users/:id
// @access  Private (Admin)
const deleteUser = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (parseInt(id, 10) === req.user.id) {
      return res.status(400).json({
        success: false,
        message: 'You cannot delete your own admin account.'
      });
    }

    const [user] = await pool.query('SELECT name FROM users WHERE id = ?', [id]);
    if (user.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found.'
      });
    }

    await pool.query('DELETE FROM users WHERE id = ?', [id]);

    res.json({
      success: true,
      message: `User "${user[0].name}" deleted successfully.`
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all registrations across the system (Admin)
// @route   GET /api/admin/registrations
// @access  Private (Admin)
const getAllRegistrationsAdmin = async (req, res, next) => {
  try {
    const { status, event_id, search, type = 'volunteer', page = 1, limit = 15 } = req.query;

    const pageNum = parseInt(page, 10) || 1;
    const limitNum = parseInt(limit, 10) || 15;
    const offset = (pageNum - 1) * limitNum;

    if (type === 'attendee') {
      // Query attendee registrations
      let whereClauses = [];
      let queryParams = [];

      if (status && status !== 'all') {
        whereClauses.push('ar.status = ?');
        queryParams.push(status);
      }

      if (event_id && event_id !== 'all') {
        whereClauses.push('ar.event_id = ?');
        queryParams.push(parseInt(event_id, 10));
      }

      if (search && search.trim() !== '') {
        whereClauses.push('(u.name LIKE ? OR u.email LIKE ? OR e.title LIKE ? OR u.roll_number LIKE ?)');
        const term = `%${search.trim()}%`;
        queryParams.push(term, term, term, term);
      }

      const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

      const [countRes] = await pool.query(
        `SELECT COUNT(*) AS total FROM attendee_registrations ar
         JOIN users u ON ar.user_id = u.id
         JOIN events e ON ar.event_id = e.id
         ${whereSql}`,
        queryParams
      );
      const total = countRes[0].total;

      const query = `
        SELECT 
          ar.id AS registration_id,
          ar.status AS registration_status,
          ar.registered_at,
          'attendee' AS record_type,
          u.id AS user_id,
          u.name AS student_name,
          u.email AS student_email,
          u.department AS student_department,
          u.roll_number AS student_roll_number,
          u.phone AS student_phone,
          e.id AS event_id,
          e.title AS event_title,
          e.event_date,
          e.venue,
          org.name AS organizer_name
        FROM attendee_registrations ar
        JOIN users u ON ar.user_id = u.id
        JOIN events e ON ar.event_id = e.id
        JOIN users org ON e.organizer_id = org.id
        ${whereSql}
        ORDER BY ar.registered_at DESC
        LIMIT ? OFFSET ?
      `;

      const [registrations] = await pool.query(query, [...queryParams, limitNum, offset]);

      return res.json({
        success: true,
        data: registrations,
        pagination: {
          total,
          page: pageNum,
          limit: limitNum,
          totalPages: Math.ceil(total / limitNum)
        }
      });
    }

    // Default: Query volunteer applications
    let whereClauses = [];
    let queryParams = [];

    if (status && status !== 'all') {
      whereClauses.push('r.status = ?');
      queryParams.push(status);
    }

    if (event_id && event_id !== 'all') {
      whereClauses.push('r.event_id = ?');
      queryParams.push(parseInt(event_id, 10));
    }

    if (search && search.trim() !== '') {
      whereClauses.push('(u.name LIKE ? OR u.email LIKE ? OR e.title LIKE ? OR u.roll_number LIKE ?)');
      const term = `%${search.trim()}%`;
      queryParams.push(term, term, term, term);
    }

    const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    const [countRes] = await pool.query(
      `SELECT COUNT(*) AS total FROM registrations r
       JOIN users u ON r.user_id = u.id
       JOIN events e ON r.event_id = e.id
       ${whereSql}`,
      queryParams
    );
    const total = countRes[0].total;

    const query = `
      SELECT 
        r.id AS registration_id,
        r.status AS registration_status,
        r.attendance_status,
        r.skills_notes,
        r.remarks,
        r.registered_at,
        'volunteer' AS record_type,
        u.id AS user_id,
        u.name AS student_name,
        u.email AS student_email,
        u.department AS student_department,
        u.roll_number AS student_roll_number,
        u.phone AS student_phone,
        e.id AS event_id,
        e.title AS event_title,
        e.event_date,
        e.venue,
        org.name AS organizer_name
      FROM registrations r
      JOIN users u ON r.user_id = u.id
      JOIN events e ON r.event_id = e.id
      JOIN users org ON e.organizer_id = org.id
      ${whereSql}
      ORDER BY r.registered_at DESC
      LIMIT ? OFFSET ?
    `;

    const [registrations] = await pool.query(query, [...queryParams, limitNum, offset]);

    res.json({
      success: true,
      data: registrations,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum)
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAdminStats,
  getAllUsers,
  createUser,
  updateUserStatus,
  updateUserRole,
  deleteUser,
  getAllRegistrationsAdmin
};
