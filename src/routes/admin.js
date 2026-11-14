const router = require("express").Router();
const bcrypt = require("bcryptjs");
const db = require("../config/db");
const { authenticate, allow } = require("../middleware/auth");
const audit = require("../utils/audit");

router.post("/users", authenticate, allow("ADMIN"), async (req,res) => {
  const { employee_student_id, full_name, email, password, role, department_id, designation } = req.body || {};
  const roles = ["STUDENT","FACULTY","HOD","ADMIN"];
  if (!employee_student_id || !full_name || !email || !password || !roles.includes(role))
    return res.status(400).json({message:"Provide ID, name, email, password and a valid role."});
  if (password.length < 10) return res.status(400).json({message:"Password must be at least 10 characters."});
  try {
    const hash = await bcrypt.hash(password,12);
    const [r] = await db.execute(
      `INSERT INTO users(employee_student_id,full_name,email,password_hash,role,department_id,designation)
       VALUES(?,?,?,?,?,?,?)`,
      [employee_student_id,full_name,email,hash,role,department_id||null,designation||null]
    );
    await audit(req.user.id,"USER_CREATED","user",r.insertId,{role});
    res.status(201).json({message:"User account created.",id:r.insertId});
  } catch(e) {
    if (e.code==="ER_DUP_ENTRY") return res.status(409).json({message:"Email or ID already exists."});
    console.error(e); res.status(500).json({message:"Could not create user."});
  }
});

router.post("/departments", authenticate, allow("ADMIN"), async (req,res) => {
  const {name,code}=req.body||{};
  if(!name||!code) return res.status(400).json({message:"Department name and code required."});
  try {
    const [r]=await db.execute("INSERT INTO departments(name,code) VALUES(?,?)",[name,code.toUpperCase()]);
    await audit(req.user.id,"DEPARTMENT_CREATED","department",r.insertId,{name,code});
    res.status(201).json({message:"Department created."});
  } catch(e) { res.status(409).json({message:"Department name or code already exists."}); }
});

router.post("/balances", authenticate, allow("ADMIN"), async (req,res) => {
  const {faculty_id,leave_type_id,opening_balance}=req.body||{};
  if(!faculty_id||!leave_type_id||opening_balance===undefined||Number(opening_balance)<0)
    return res.status(400).json({message:"Enter faculty, leave type and a non-negative balance."});
  await db.execute(
    `INSERT INTO leave_balances(faculty_id,leave_type_id,opening_balance,used_days)
     VALUES(?,?,?,0) ON DUPLICATE KEY UPDATE opening_balance=VALUES(opening_balance)`,
    [faculty_id,leave_type_id,Number(opening_balance)]
  );
  await audit(req.user.id,"BALANCE_SET","leave_balance",null,{faculty_id,leave_type_id,opening_balance});
  res.json({message:"Leave balance saved."});
});

router.get("/reports/summary", authenticate, allow("ADMIN"), async (req,res) => {
  const [rows]=await db.execute(
    `SELECT status,COUNT(*) AS total FROM leave_applications GROUP BY status`
  );
  const [users]=await db.execute("SELECT role,COUNT(*) AS total FROM users WHERE is_active=1 GROUP BY role");
  res.json({leaveStatuses:rows,userRoles:users});
});

module.exports=router;
