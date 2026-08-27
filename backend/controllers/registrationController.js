const { pool } = require('../config/db');

// @desc    Register for an event as a volunteer (Student only)
// @route   POST /api/registrations/:eventId
// @access  Private (Student)
const registerForEvent = async (req, res, next) => {
  try {
    const { eventId } = req.params;
    const userId = req.user.id;
    const { skills_notes } = req.body;

    // 1. Fetch event details
    const [events] = await pool.query('SELECT * FROM events WHERE id = ?', [eventId]);
    if (events.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Event not found.'
      });
    }

    const event = events[0];

    // 2. Validate event status
    if (event.status !== 'published' && event.status !== 'ongoing') {
      return res.status(400).json({
        success: false,
        message: `Registration is not allowed for events in '${event.status}' status.`
      });
    }

    // 3. Validate registration deadline
    const deadline = new Date(event.registration_deadline);
    const now = new Date();
    if (deadline < now) {
      return res.status(400).json({
        success: false,
        message: `Registration deadline for this event was on ${deadline.toLocaleString()}. Registration is now closed.`
      });
    }

    // 4. Validate capacity
    const [approvedRows] = await pool.query(
      "SELECT COUNT(*) AS approved_count FROM registrations WHERE event_id = ? AND status = 'approved'",
      [eventId]
    );
    const approvedCount = approvedRows[0].approved_count;
    if (approvedCount >= event.max_volunteers) {
      return res.status(400).json({
        success: false,
        message: 'Volunteer capacity for this event has reached the maximum limit.'
      });
    }

    // 5. Check duplicate registration
    const [existingRegs] = await pool.query(
      'SELECT id, status FROM registrations WHERE event_id = ? AND user_id = ?',
      [eventId, userId]
    );

    if (existingRegs.length > 0) {
      const existing = existingRegs[0];
      if (existing.status === 'cancelled') {
        // If previously cancelled, re-activate as pending
        await pool.query(
          `UPDATE registrations 
           SET status = 'pending', skills_notes = ?, attendance_status = 'not_marked', remarks = NULL, registered_at = CURRENT_TIMESTAMP
           WHERE id = ?`,
          [skills_notes || null, existing.id]
        );

        return res.json({
          success: true,
          message: 'Your registration application has been resubmitted successfully!',
          registrationId: existing.id
        });
      } else {
        return res.status(400).json({
          success: false,
          message: `You have already registered for this event (Status: ${existing.status.toUpperCase()}).`
        });
      }
    }

    // 6. Insert new registration record
    const [result] = await pool.query(
      `INSERT INTO registrations (event_id, user_id, status, attendance_status, skills_notes)
       VALUES (?, ?, 'pending', 'not_marked', ?)`,
      [eventId, userId, skills_notes || null]
    );

    res.status(201).json({
      success: true,
      message: 'Registration submitted successfully! Please wait for the organizer to review your application.',
      registrationId: result.insertId
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get current student's registered events
// @route   GET /api/registrations/my
// @access  Private (Student)
const getMyRegistrations = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { status } = req.query;

    let whereClause = 'WHERE r.user_id = ?';
    let queryParams = [userId];

    if (status && status !== 'all') {
      whereClause += ' AND r.status = ?';
      queryParams.push(status);
    }

    const query = `
      SELECT 
        r.id AS registration_id,
        r.status AS registration_status,
        r.attendance_status,
        r.skills_notes,
        r.remarks AS organizer_remarks,
        r.registered_at,
        r.updated_at AS status_updated_at,
        e.id AS event_id,
        e.title AS event_title,
        e.description AS event_description,
        e.event_date,
        e.start_time,
        e.end_time,
        e.venue,
        e.status AS event_status,
        e.banner_image,
        c.name AS category_name,
        u.name AS organizer_name,
        u.email AS organizer_email,
        u.phone AS organizer_phone
      FROM registrations r
      JOIN events e ON r.event_id = e.id
      LEFT JOIN categories c ON e.category_id = c.id
      LEFT JOIN users u ON e.organizer_id = u.id
      ${whereClause}
      ORDER BY r.registered_at DESC
    `;

    const [registrations] = await pool.query(query, queryParams);

    res.json({
      success: true,
      data: registrations
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Cancel a volunteer registration (Student)
// @route   DELETE /api/registrations/:id/cancel
// @access  Private (Student)
const cancelRegistration = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const [regs] = await pool.query(
      'SELECT id, status, event_id FROM registrations WHERE id = ? AND user_id = ?',
      [id, userId]
    );

    if (regs.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Registration record not found.'
      });
    }

    const reg = regs[0];

    if (reg.status === 'cancelled') {
      return res.status(400).json({
        success: false,
        message: 'Registration is already cancelled.'
      });
    }

    // Update status to cancelled
    await pool.query(
      "UPDATE registrations SET status = 'cancelled' WHERE id = ?",
      [id]
    );

    res.json({
      success: true,
      message: 'Registration cancelled successfully.'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all registrations for a specific event (Organizer, Admin)
// @route   GET /api/registrations/event/:eventId
// @access  Private (Organizer of that event, Admin)
const getEventRegistrations = async (req, res, next) => {
  try {
    const { eventId } = req.params;

    // Check permissions
    const [events] = await pool.query('SELECT organizer_id, title, max_volunteers FROM events WHERE id = ?', [eventId]);
    if (events.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Event not found.'
      });
    }

    const event = events[0];
    if (req.user.role !== 'admin' && event.organizer_id !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You are not assigned to organize this event.'
      });
    }

    const query = `
      SELECT 
        r.id AS registration_id,
        r.status AS registration_status,
        r.attendance_status,
        r.skills_notes,
        r.remarks AS organizer_remarks,
        r.registered_at,
        r.updated_at,
        u.id AS user_id,
        u.name AS student_name,
        u.email AS student_email,
        u.phone AS student_phone,
        u.department AS student_department,
        u.roll_number AS student_roll_number,
        u.avatar AS student_avatar
      FROM registrations r
      JOIN users u ON r.user_id = u.id
      WHERE r.event_id = ?
      ORDER BY 
        CASE 
          WHEN r.status = 'pending' THEN 1
          WHEN r.status = 'approved' THEN 2
          WHEN r.status = 'rejected' THEN 3
          ELSE 4
        END,
        r.registered_at ASC
    `;

    const [volunteers] = await pool.query(query, [eventId]);

    // Stats
    const totalApplicants = volunteers.length;
    const approvedCount = volunteers.filter(v => v.registration_status === 'approved').length;
    const pendingCount = volunteers.filter(v => v.registration_status === 'pending').length;
    const rejectedCount = volunteers.filter(v => v.registration_status === 'rejected').length;

    res.json({
      success: true,
      event: {
        id: parseInt(eventId, 10),
        title: event.title,
        max_volunteers: event.max_volunteers,
        approved_count: approvedCount,
        pending_count: pendingCount,
        rejected_count: rejectedCount,
        total_applicants: totalApplicants
      },
      data: volunteers
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update volunteer registration status (Approve / Reject)
// @route   PATCH /api/registrations/:id/status
// @access  Private (Organizer, Admin)
const updateRegistrationStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, remarks } = req.body;

    if (!['approved', 'rejected', 'pending'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status. Must be pending, approved, or rejected.'
      });
    }

    // Find registration and event
    const [regs] = await pool.query(
      `SELECT r.id, r.event_id, r.user_id, r.status AS current_status, e.organizer_id, e.max_volunteers, e.title AS event_title
       FROM registrations r
       JOIN events e ON r.event_id = e.id
       WHERE r.id = ?`,
      [id]
    );

    if (regs.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Registration not found.'
      });
    }

    const reg = regs[0];

    // Authorization
    if (req.user.role !== 'admin' && reg.organizer_id !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You are not assigned to organize this event.'
      });
    }

    // If approving, verify that max capacity is not exceeded
    if (status === 'approved' && reg.current_status !== 'approved') {
      const [countRows] = await pool.query(
        "SELECT COUNT(*) AS approved_count FROM registrations WHERE event_id = ? AND status = 'approved'",
        [reg.event_id]
      );
      const approvedCount = countRows[0].approved_count;

      if (approvedCount >= reg.max_volunteers) {
        return res.status(400).json({
          success: false,
          message: `Cannot approve applicant: maximum capacity of ${reg.max_volunteers} volunteers has already been reached.`
        });
      }
    }

    await pool.query(
      'UPDATE registrations SET status = ?, remarks = COALESCE(?, remarks) WHERE id = ?',
      [status, remarks || null, id]
    );

    res.json({
      success: true,
      message: `Volunteer registration status successfully updated to "${status.toUpperCase()}".`
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update volunteer attendance & participation status
// @route   PATCH /api/registrations/:id/attendance
// @access  Private (Organizer, Admin)
const updateAttendance = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { attendance_status, remarks } = req.body;

    const validStatuses = ['not_marked', 'present', 'absent', 'completed'];
    if (!validStatuses.includes(attendance_status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid attendance status. Must be one of: ${validStatuses.join(', ')}.`
      });
    }

    const [regs] = await pool.query(
      `SELECT r.id, r.status, e.organizer_id
       FROM registrations r
       JOIN events e ON r.event_id = e.id
       WHERE r.id = ?`,
      [id]
    );

    if (regs.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Registration not found.'
      });
    }

    const reg = regs[0];

    if (req.user.role !== 'admin' && reg.organizer_id !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You are not assigned to organize this event.'
      });
    }

    await pool.query(
      'UPDATE registrations SET attendance_status = ?, remarks = COALESCE(?, remarks) WHERE id = ?',
      [attendance_status, remarks || null, id]
    );

    res.json({
      success: true,
      message: `Volunteer attendance updated to "${attendance_status.toUpperCase()}".`
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get Volunteer QR Registration Pass (Student ownership strictly enforced)
// @route   GET /api/registrations/:eventId/pass OR GET /api/registrations/pass/:registrationId
// @access  Private (Authenticated student, organizer of event, or admin)
const getVolunteerPass = async (req, res, next) => {
  try {
    const { eventId, registrationId } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;

    let query = `
      SELECT 
        r.id AS registration_id,
        r.event_id,
        r.user_id,
        r.status AS registration_status,
        r.attendance_status,
        r.checked_in_at,
        r.skills_notes,
        r.remarks AS organizer_remarks,
        r.registered_at,
        r.updated_at,
        u.id AS student_id,
        u.name AS student_name,
        u.email AS student_email,
        u.roll_number AS student_roll_number,
        u.department AS student_department,
        u.phone AS student_phone,
        e.id AS event_id,
        e.title AS event_title,
        e.description AS event_description,
        e.event_date,
        e.start_time,
        e.end_time,
        e.venue,
        e.status AS event_status,
        e.banner_image,
        e.organizer_id,
        c.name AS category_name,
        org.name AS organizer_name,
        org.email AS organizer_email
      FROM registrations r
      JOIN events e ON r.event_id = e.id
      JOIN users u ON r.user_id = u.id
      LEFT JOIN categories c ON e.category_id = c.id
      LEFT JOIN users org ON e.organizer_id = org.id
    `;

    let params = [];

    if (registrationId) {
      query += ` WHERE r.id = ?`;
      params.push(registrationId);
    } else if (eventId) {
      query += ` WHERE r.event_id = ? AND r.user_id = ?`;
      params.push(eventId, userId);
    } else {
      return res.status(400).json({
        success: false,
        message: 'Event ID or Registration ID is required.'
      });
    }

    const [rows] = await pool.query(query, params);

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Volunteer application pass not found.'
      });
    }

    const pass = rows[0];

    // SECURITY CHECK:
    // If student: must be the owner of the application (pass.user_id === req.user.id)
    // If organizer: must be the assigned organizer of the event (pass.organizer_id === req.user.id)
    // If admin: allowed
    if (userRole === 'student' && pass.user_id !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You cannot view another student’s volunteer pass.'
      });
    }

    if (userRole === 'organizer' && pass.organizer_id !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You are not the assigned organizer for this event.'
      });
    }

    const isApproved = pass.registration_status === 'approved';
    const passCode = `REG-VOL-${new Date(pass.event_date).getFullYear()}-${String(pass.registration_id).padStart(5, '0')}`;
    const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
    const verifyUrl = `${clientUrl}/verify-pass?type=volunteer&id=${pass.registration_id}&code=${passCode}`;

    // Payload for dynamic QR code encoding (only active when approved)
    const qrPayload = JSON.stringify({
      type: 'CAMPUS_EVENT_VOLUNTEER_PASS',
      pass_code: passCode,
      registration_id: pass.registration_id,
      event_id: pass.event_id,
      event_title: pass.event_title,
      student_id: pass.student_id,
      student_name: pass.student_name,
      student_roll: pass.student_roll_number || 'N/A',
      student_department: pass.student_department || 'N/A',
      event_date: pass.event_date,
      start_time: pass.start_time,
      venue: pass.venue,
      status: pass.registration_status,
      attendance_status: pass.attendance_status,
      assigned_role_remarks: pass.organizer_remarks || 'Volunteer Duty Team',
      verify_url: verifyUrl,
      issued_at: pass.registered_at
    });

    res.json({
      success: true,
      data: {
        registration_id: pass.registration_id,
        pass_code: passCode,
        pass_type: 'volunteer',
        qr_payload: isApproved ? qrPayload : null,
        verify_url: verifyUrl,
        registration_status: pass.registration_status,
        attendance_status: pass.attendance_status,
        checked_in_at: pass.checked_in_at,
        organizer_remarks: pass.organizer_remarks,
        skills_notes: pass.skills_notes,
        is_active: isApproved,
        registered_at: pass.registered_at,
        student: {
          id: pass.student_id,
          name: pass.student_name,
          email: pass.student_email,
          roll_number: pass.student_roll_number,
          department: pass.student_department,
          phone: pass.student_phone
        },
        event: {
          id: pass.event_id,
          title: pass.event_title,
          description: pass.event_description,
          event_date: pass.event_date,
          start_time: pass.start_time,
          end_time: pass.end_time,
          venue: pass.venue,
          status: pass.event_status,
          category_name: pass.category_name,
          banner_image: pass.banner_image,
          organizer_name: pass.organizer_name,
          organizer_email: pass.organizer_email
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Verify Volunteer QR Pass (Organizer of that event or Admin only)
// @route   POST /api/registrations/verify-pass
// @access  Private (Organizer of assigned event, Admin)
const verifyVolunteerPass = async (req, res, next) => {
  try {
    const { code, registration_id, qr_data } = req.body;
    let targetRegistrationId = registration_id ? parseInt(registration_id, 10) : null;
    let targetPassCode = code;

    // If raw scanned qr_data provided, parse it
    if (qr_data) {
      if (typeof qr_data === 'string') {
        try {
          const parsed = JSON.parse(qr_data);
          if (parsed.registration_id) targetRegistrationId = parseInt(parsed.registration_id, 10);
          if (parsed.pass_code) targetPassCode = parsed.pass_code;
        } catch (e) {
          const match = qr_data.match(/REG-VOL-\d{4}-(\d+)/i);
          if (match) {
            targetRegistrationId = parseInt(match[1], 10);
            targetPassCode = match[0];
          } else {
            try {
              const url = new URL(qr_data);
              const idParam = url.searchParams.get('id');
              const codeParam = url.searchParams.get('code');
              if (idParam) targetRegistrationId = parseInt(idParam, 10);
              if (codeParam) targetPassCode = codeParam;
            } catch (_) {}
          }
        }
      }
    } else if (code && !targetRegistrationId) {
      const match = String(code).match(/REG-VOL-\d{4}-(\d+)/i);
      if (match) {
        targetRegistrationId = parseInt(match[1], 10);
      } else if (!isNaN(Number(code))) {
        targetRegistrationId = parseInt(code, 10);
      }
    }

    if (!targetRegistrationId) {
      return res.status(400).json({
        success: false,
        message: 'Invalid pass code or volunteer registration identifier.'
      });
    }

    const query = `
      SELECT 
        r.id AS registration_id,
        r.event_id,
        r.user_id,
        r.status AS registration_status,
        r.attendance_status,
        r.checked_in_at,
        r.skills_notes,
        r.remarks AS organizer_remarks,
        r.registered_at,
        r.updated_at,
        u.id AS student_id,
        u.name AS student_name,
        u.email AS student_email,
        u.roll_number AS student_roll_number,
        u.department AS student_department,
        u.phone AS student_phone,
        e.id AS event_id,
        e.title AS event_title,
        e.description AS event_description,
        e.event_date,
        e.start_time,
        e.end_time,
        e.venue,
        e.status AS event_status,
        e.banner_image,
        e.organizer_id,
        c.name AS category_name,
        org.name AS organizer_name,
        org.email AS organizer_email
      FROM registrations r
      JOIN events e ON r.event_id = e.id
      JOIN users u ON r.user_id = u.id
      LEFT JOIN categories c ON e.category_id = c.id
      LEFT JOIN users org ON e.organizer_id = org.id
      WHERE r.id = ?
    `;

    const [rows] = await pool.query(query, [targetRegistrationId]);

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Volunteer application record not found in system.'
      });
    }

    const reg = rows[0];

    // Authorization: Admin or Assigned Organizer
    if (req.user.role !== 'admin' && reg.organizer_id !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You are not authorized to verify volunteer passes for this event.'
      });
    }

    const passCode = `REG-VOL-${new Date(reg.event_date).getFullYear()}-${String(reg.registration_id).padStart(5, '0')}`;

    // Status check: only approved applications can be verified for duty check-in
    if (reg.registration_status !== 'approved') {
      const statusMessage =
        reg.registration_status === 'pending'
          ? 'Volunteer application is PENDING review and has not been approved.'
          : reg.registration_status === 'rejected'
          ? 'Volunteer application was REJECTED.'
          : 'Volunteer application was CANCELLED.';

      return res.status(400).json({
        success: false,
        is_valid: false,
        message: statusMessage,
        data: {
          registration_id: reg.registration_id,
          pass_code: passCode,
          pass_type: 'volunteer',
          registration_status: reg.registration_status,
          attendance_status: reg.attendance_status,
          organizer_remarks: reg.organizer_remarks,
          student: {
            id: reg.student_id,
            name: reg.student_name,
            department: reg.student_department,
            roll_number: reg.student_roll_number
          },
          event: {
            id: reg.event_id,
            title: reg.event_title,
            event_date: reg.event_date,
            venue: reg.venue
          }
        }
      });
    }

    res.json({
      success: true,
      is_valid: true,
      pass_type: 'volunteer',
      data: {
        registration_id: reg.registration_id,
        pass_code: passCode,
        pass_type: 'volunteer',
        registration_status: reg.registration_status,
        attendance_status: reg.attendance_status || 'not_marked',
        checked_in_at: reg.checked_in_at,
        is_already_checked_in: reg.attendance_status === 'present' || reg.attendance_status === 'completed',
        organizer_remarks: reg.organizer_remarks,
        skills_notes: reg.skills_notes,
        registered_at: reg.registered_at,
        student: {
          id: reg.student_id,
          name: reg.student_name,
          email: reg.student_email,
          roll_number: reg.student_roll_number,
          department: reg.student_department,
          phone: reg.student_phone
        },
        event: {
          id: reg.event_id,
          title: reg.event_title,
          description: reg.event_description,
          event_date: reg.event_date,
          start_time: reg.start_time,
          end_time: reg.end_time,
          venue: reg.venue,
          status: reg.event_status,
          category_name: reg.category_name,
          banner_image: reg.banner_image,
          organizer_name: reg.organizer_name,
          organizer_email: reg.organizer_email
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Check-In Volunteer & Mark Present (Organizer of that event or Admin only)
// @route   POST /api/registrations/check-in
// @access  Private (Organizer of assigned event, Admin)
const checkInVolunteer = async (req, res, next) => {
  try {
    const registrationId = req.params.id || req.body.registration_id;
    const attendanceStatus = req.body.attendance_status || 'present';
    const remarks = req.body.remarks;

    if (!registrationId) {
      return res.status(400).json({
        success: false,
        message: 'Registration ID is required for check-in.'
      });
    }

    const [rows] = await pool.query(
      `SELECT r.id, r.status, r.attendance_status, r.checked_in_at, r.remarks, e.organizer_id, e.title AS event_title, u.name AS student_name
       FROM registrations r
       JOIN events e ON r.event_id = e.id
       JOIN users u ON r.user_id = u.id
       WHERE r.id = ?`,
      [registrationId]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Volunteer registration record not found.'
      });
    }

    const reg = rows[0];

    // Authorization: Admin or Assigned Organizer
    if (req.user.role !== 'admin' && reg.organizer_id !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You are not assigned to organize this event.'
      });
    }

    // Status check: only approved applications can be checked in
    if (reg.status !== 'approved') {
      return res.status(400).json({
        success: false,
        message: `Cannot check in volunteer with application status "${reg.status}". Only APPROVED volunteers can check in.`
      });
    }

    const isAlreadyPresent = reg.attendance_status === 'present' || reg.attendance_status === 'completed';

    await pool.query(
      `UPDATE registrations 
       SET attendance_status = ?, checked_in_at = COALESCE(checked_in_at, CURRENT_TIMESTAMP), remarks = COALESCE(?, remarks) 
       WHERE id = ?`,
      [attendanceStatus, remarks || null, registrationId]
    );

    res.json({
      success: true,
      message: isAlreadyPresent && attendanceStatus === 'present'
        ? `Volunteer ${reg.student_name} is already checked in.`
        : `Volunteer ${reg.student_name} successfully checked in for "${reg.event_title}"!`,
      data: {
        registration_id: reg.id,
        attendance_status: attendanceStatus,
        checked_in_at: reg.checked_in_at || new Date(),
        student_name: reg.student_name,
        was_already_checked_in: isAlreadyPresent
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Public Read-Only Verification for Volunteer Pass (No sensitive student data exposed)
// @route   GET /api/registrations/public-verify
// @access  Public (No Auth required)
const publicVerifyVolunteerPass = async (req, res, next) => {
  try {
    const { code, id } = req.query;
    let targetRegistrationId = id ? parseInt(id, 10) : null;

    if (!targetRegistrationId && code) {
      const match = String(code).match(/REG-VOL-\d{4}-(\d+)/i);
      if (match) {
        targetRegistrationId = parseInt(match[1], 10);
      } else if (!isNaN(Number(code))) {
        targetRegistrationId = parseInt(code, 10);
      }
    }

    if (!targetRegistrationId) {
      return res.status(400).json({
        success: false,
        message: 'Pass code or registration identifier is required.'
      });
    }

    const query = `
      SELECT 
        r.id AS registration_id,
        r.status AS registration_status,
        r.attendance_status,
        r.checked_in_at,
        r.remarks AS organizer_remarks,
        r.registered_at,
        u.name AS student_name,
        e.title AS event_title,
        e.event_date,
        e.start_time,
        e.end_time,
        e.venue,
        c.name AS category_name
      FROM registrations r
      JOIN events e ON r.event_id = e.id
      JOIN users u ON r.user_id = u.id
      LEFT JOIN categories c ON e.category_id = c.id
      WHERE r.id = ?
    `;

    const [rows] = await pool.query(query, [targetRegistrationId]);

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        is_valid: false,
        message: 'Pass not found or invalid.'
      });
    }

    const reg = rows[0];
    const passCode = `REG-VOL-${new Date(reg.event_date).getFullYear()}-${String(reg.registration_id).padStart(5, '0')}`;
    const isValid = reg.registration_status === 'approved';

    res.json({
      success: true,
      is_valid: isValid,
      data: {
        pass_type: 'Volunteer Duty Pass',
        pass_code: passCode,
        is_valid: isValid,
        registration_status: reg.registration_status,
        attendance_status: reg.attendance_status || 'not_marked',
        checked_in_at: reg.checked_in_at,
        event_title: reg.event_title,
        event_date: reg.event_date,
        start_time: reg.start_time,
        end_time: reg.end_time,
        venue: reg.venue,
        category_name: reg.category_name,
        student_name: reg.student_name,
        organizer_remarks: isValid ? reg.organizer_remarks : null,
        registered_at: reg.registered_at,
        verified_at: new Date()
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  registerForEvent,
  getMyRegistrations,
  cancelRegistration,
  getEventRegistrations,
  updateRegistrationStatus,
  updateAttendance,
  getVolunteerPass,
  verifyVolunteerPass,
  checkInVolunteer,
  publicVerifyVolunteerPass
};

