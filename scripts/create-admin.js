require("dotenv").config();
const bcrypt = require("bcryptjs");
const db = require("../src/config/db");

(async () => {
  const [code,name,email,password,departmentName="Administration"] = process.argv.slice(2);
  if(!code||!name||!email||!password) {
    console.log('Usage: node scripts/create-admin.js ADM001 "Demo Admin" admin@example.com "StrongPassword123!" Administration');
    process.exit(1);
  }
  try {
    const [deps]=await db.execute("SELECT id FROM departments WHERE name=? LIMIT 1",[departmentName]);
    let departmentId=deps[0]?.id||null;
    const hash=await bcrypt.hash(password,12);
    await db.execute(
      `INSERT INTO users(employee_student_id,full_name,email,password_hash,role,department_id,designation)
       VALUES(?,?,?,?,'ADMIN',?,'System Administrator')`,
      [code,name,email,hash,departmentId]
    );
    console.log("Admin account created. Keep credentials private.");
  } catch(e) { console.error(e.code==="ER_DUP_ENTRY"?"That email or ID already exists.":e.message); process.exitCode=1; }
  finally { await db.end(); }
})();
