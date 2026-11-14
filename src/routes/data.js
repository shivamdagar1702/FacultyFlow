const router = require("express").Router();
const db = require("../config/db");
const { authenticate, allow } = require("../middleware/auth");

router.get("/me", authenticate, (req,res) => res.json({ user:req.user }));

router.get("/departments", async (req,res) => {
  const [rows] = await db.execute("SELECT id,name,code FROM departments ORDER BY name");
  res.json(rows);
});

router.get("/faculty-directory", authenticate, allow("STUDENT","FACULTY","HOD","ADMIN"), async (req,res) => {
  const [rows] = await db.execute(
    `SELECT u.id,u.full_name,u.designation,d.name AS department,
      CASE WHEN EXISTS (
        SELECT 1 FROM leave_applications l
        WHERE l.faculty_id=u.id AND l.status='APPROVED'
          AND CURDATE() BETWEEN l.start_date AND l.end_date
      ) THEN 'ON LEAVE' ELSE 'AVAILABLE' END AS availability
     FROM users u LEFT JOIN departments d ON d.id=u.department_id
     WHERE u.role IN ('FACULTY','HOD') AND u.is_active=1 ORDER BY u.full_name`
  );
  res.json(rows);
});

router.get("/student/approved-leaves", authenticate, allow("STUDENT","FACULTY","HOD","ADMIN"), async (req,res) => {
  const [rows] = await db.execute(
    `SELECT l.id,u.full_name,u.designation,d.name AS department,lt.name AS leave_type,
      l.start_date,l.end_date,l.total_days,l.status
     FROM leave_applications l JOIN users u ON u.id=l.faculty_id
     LEFT JOIN departments d ON d.id=u.department_id
     JOIN leave_types lt ON lt.id=l.leave_type_id
     WHERE l.status='APPROVED' AND l.end_date >= CURDATE()
     ORDER BY l.start_date`
  );
  res.json(rows);
});

router.get("/leave-types", authenticate, async (req,res) => {
  const [rows] = await db.execute("SELECT id,name,description FROM leave_types WHERE is_active=1 ORDER BY name");
  res.json(rows);
});

router.get("/my-leaves", authenticate, allow("FACULTY"), async (req,res) => {
  const [rows] = await db.execute(
    `SELECT l.*,lt.name AS leave_type FROM leave_applications l
     JOIN leave_types lt ON lt.id=l.leave_type_id WHERE l.faculty_id=? ORDER BY l.created_at DESC`,
    [req.user.id]
  );
  res.json(rows);
});

router.get("/balances", authenticate, allow("FACULTY","ADMIN"), async (req,res) => {
  const target = req.user.role === "ADMIN" && req.query.faculty_id ? Number(req.query.faculty_id) : req.user.id;
  const [rows] = await db.execute(
    `SELECT lt.name AS leave_type,b.opening_balance,b.used_days,
      (b.opening_balance-b.used_days) AS available
     FROM leave_balances b JOIN leave_types lt ON lt.id=b.leave_type_id
     WHERE b.faculty_id=? ORDER BY lt.name`, [target]
  );
  res.json(rows);
});

router.get("/approvals", authenticate, allow("HOD","ADMIN"), async (req,res) => {
  const status = req.user.role === "HOD" ? "PENDING_HOD" : "PENDING_ADMIN";
  let sql = `SELECT l.*,u.full_name AS faculty_name,u.employee_student_id,d.name AS department,
    lt.name AS leave_type FROM leave_applications l JOIN users u ON u.id=l.faculty_id
    LEFT JOIN departments d ON d.id=u.department_id JOIN leave_types lt ON lt.id=l.leave_type_id
    WHERE l.status=?`;
  const args = [status];
  if (req.user.role === "HOD") { sql += " AND u.department_id=?"; args.push(req.user.department_id); }
  sql += " ORDER BY l.created_at ASC";
  const [rows] = await db.execute(sql,args);
  res.json(rows);
});

router.get("/admin/users", authenticate, allow("ADMIN"), async (req,res) => {
  const [rows] = await db.execute(
    `SELECT u.id,u.employee_student_id,u.full_name,u.email,u.role,u.designation,u.is_active,
      d.name AS department FROM users u LEFT JOIN departments d ON d.id=u.department_id
     ORDER BY u.created_at DESC`
  );
  res.json(rows);
});

module.exports = router;
