const router = require("express").Router();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const db = require("../config/db");

router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) return res.status(400).json({ message: "Email and password are required." });
    const [rows] = await db.execute(
      `SELECT u.id,u.employee_student_id,u.full_name,u.email,u.password_hash,u.role,u.designation,
              u.department_id,d.name AS department
       FROM users u LEFT JOIN departments d ON d.id=u.department_id
       WHERE u.email=? AND u.is_active=1 LIMIT 1`, [email]
    );
    if (!rows.length || !(await bcrypt.compare(password, rows[0].password_hash))) {
      return res.status(401).json({ message: "Invalid email or password." });
    }
    const u = rows[0];
    const token = jwt.sign({
      id: u.id, role: u.role, name: u.full_name, email: u.email,
      department_id: u.department_id, department: u.department
    }, process.env.JWT_SECRET, { expiresIn: "8h" });
    res.json({
      token,
      user: { id:u.id, name:u.full_name, email:u.email, role:u.role,
        department:u.department, designation:u.designation, code:u.employee_student_id }
    });
  } catch (e) { console.error(e); res.status(500).json({ message: "Unable to sign in." }); }
});

module.exports = router;
