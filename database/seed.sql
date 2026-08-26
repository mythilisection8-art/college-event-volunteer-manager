-- =======================================================
-- SEED DATA FOR COLLEGE EVENT VOLUNTEER MANAGEMENT SYSTEM
-- =======================================================

USE college_volunteer_db;

-- 1. SEED CATEGORIES (Default event categories)

-- 2. SEED CATEGORIES
INSERT INTO categories (id, name, description, icon) VALUES
(1, 'Technical & Coding', 'Hackathons, coding contests, robotics, web dev bootcamps and tech expos', 'code'),
(2, 'Cultural & Arts', 'Music festivals, dance competitions, drama, fine arts and fashion shows', 'music'),
(3, 'Sports & Fitness', 'Inter-college tournaments, athletics, cricket, football and indoor games', 'trophy'),
(4, 'Workshops & Seminars', 'Expert guest lectures, AI/ML workshops, resume clinics, hands-on labs', 'book-open'),
(5, 'Social & Community', 'Blood donation camps, tree plantation, charity drives and campus cleanup', 'heart')
ON DUPLICATE KEY UPDATE name=VALUES(name);

-- 3. SEED EVENTS (With separate max_attendees and max_volunteers)
INSERT INTO events (id, title, description, category_id, organizer_id, event_date, start_time, end_time, venue, max_attendees, max_volunteers, registration_deadline, banner_image, status, requirements) VALUES
(
    1,
    'HackNova 2026 - Annual 36-Hour Hackathon',
    'Flagship 36-hour inter-college hackathon focusing on AI agents, Web3, and Sustainable Tech. Volunteers are needed to assist with team registrations, food and hospitality distribution, judging room coordination, and lab networking setup.',
    1,
    2,
    DATE_ADD(CURDATE(), INTERVAL 14 DAY),
    '09:00:00',
    '21:00:00',
    'Main Computer Science Center & Seminar Hall A',
    150,
    15,
    DATE_ADD(NOW(), INTERVAL 10 DAY),
    'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?auto=format&fit=crop&w=1200&q=80',
    'published',
    'Active student status, strong communication skills, availability for shifts throughout Saturday & Sunday.'
),
(
    2,
    'Tarang 2026 - National Cultural Fest',
    'The premier cultural festival featuring battle of bands, classical dance, standup comedy, and street plays. Volunteers will manage backstage coordination, artist hospitality, crowd control, and stage lighting/audio logistics.',
    2,
    3,
    DATE_ADD(CURDATE(), INTERVAL 21 DAY),
    '10:00:00',
    '22:00:00',
    'University Open Air Auditorium',
    300,
    20,
    DATE_ADD(NOW(), INTERVAL 15 DAY),
    'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=1200&q=80',
    'published',
    'Enthusiastic individuals with hospitality or audio-visual handling experience. Team players only.'
),
(
    3,
    'Inter-Department Sports Olympiad',
    'Annual intra-college championship covering basketball, football, volleyball, badminton, and track & field. Volunteers needed for referee assistance, score keeping, first-aid assistance, and medal ceremony coordination.',
    3,
    4,
    DATE_ADD(CURDATE(), INTERVAL 7 DAY),
    '07:30:00',
    '18:00:00',
    'University Sports Ground & Indoor Stadium',
    200,
    12,
    DATE_ADD(NOW(), INTERVAL 4 DAY),
    'https://images.unsplash.com/photo-1461896836934-ffe607ba8211?auto=format&fit=crop&w=1200&q=80',
    'published',
    'Knowledge of sports rules preferred. Punctual, energetic, and able to work outdoors.'
),
(
    4,
    'Hands-on GenAI & LLM Bootcamp',
    'A 2-day intensive masterclass on building LLM applications with OpenAI, Gemini, and LangChain. Volunteers needed for attendee check-in, software installation troubleshooting, and Q&A microphone coordination.',
    4,
    2,
    DATE_ADD(CURDATE(), INTERVAL 5 DAY),
    '10:00:00',
    '17:00:00',
    'Auditorium Block B, Room 204',
    80,
    8,
    DATE_ADD(NOW(), INTERVAL 2 DAY),
    'https://images.unsplash.com/photo-1531482615713-2afd69097998?auto=format&fit=crop&w=1200&q=80',
    'published',
    'Basic knowledge of Python or web development is a plus to help participants debug basic environment errors.'
),
(
    5,
    'Annual Blood Donation & Health Checkup Camp',
    'Joint blood donation initiative in partnership with Red Cross Society. Volunteers will coordinate donor registration, distribute refreshments, and assist medical staff in token queue management.',
    5,
    3,
    DATE_ADD(CURDATE(), INTERVAL 3 DAY),
    '08:30:00',
    '15:30:00',
    'Campus Medical Center & Student Activity Wing',
    100,
    10,
    DATE_ADD(NOW(), INTERVAL 1 DAY),
    'https://images.unsplash.com/photo-1579154204601-01588f351e67?auto=format&fit=crop&w=1200&q=80',
    'published',
    'Empathetic and responsible volunteers. First aid training is a plus but not required.'
),
(
    6,
    'RoboWars 2026 - Combat Robotics League',
    'Heavyweight and lightweight combat robotics championship. Volunteers will manage arena safety barriers, pit stops, power supply battery stations, and livestream cameras.',
    1,
    2,
    DATE_ADD(CURDATE(), INTERVAL 30 DAY),
    '11:00:00',
    '19:00:00',
    'Mechanical Workshop Yard & Arena',
    120,
    15,
    DATE_ADD(NOW(), INTERVAL 25 DAY),
    'https://images.unsplash.com/photo-1485827404703-89b55fcc595e?auto=format&fit=crop&w=1200&q=80',
    'published',
    'Strict adherence to workshop safety protocols. Hard hats will be provided.'
)
ON DUPLICATE KEY UPDATE title=VALUES(title);

