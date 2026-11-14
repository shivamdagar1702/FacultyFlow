const router = require("express").Router();
const db = require("../config/db");
const { authenticate, allow } = require("../middleware/auth");
const audit = require("../utils/audit");

router.post("/", authenticate, allow("FACULTY"), async (req,res) => {
  const { leave_type_id, start_date, end_date, reason } = req.body || {};
  if (!leave_type_id || !start_date || !end_date || !reason || !reason.trim())
    return res.status(400).json({ message:"Complete all fields." });
  if (end_date < start_date) return res.status(400).json({ message:"End date cannot be before start date." });
  const start = new Date(`${start_date}T00:00:00`);
  const end = new Date(`${end_date}T00:00:00`);
  const days = Math.floor((end-start)/86400000)+1;
  if (!Number.isFinite(days) || days < 1 || days > 90) return res.status(400).json({message:"Invalid leave duration."});
  try {
    const [hods] = await db.execute(
      "SELECT id FROM users WHERE role='HOD' AND department_id=? AND is_active=1 ORDER BY id LIMIT 1",
      [req.user.department_id]
    );
    if (!hods.length) return res.status(409).json({message:"No active HOD is configured for your department. Contact Admin."});
    const [result] = await db.execute(
      `INSERT INTO leave_applications(faculty_id,leave_type_id,start_date,end_date,total_days,reason,status,current_approver_id)
       VALUES(?,?,?,?,?,?,'PENDING_HOD',?)`,
      [req.user.id,leave_type_id,start_date,end_date,days,reason.trim(),hods[0].id]
    );
    await db.execute(
      "INSERT INTO approval_history(leave_id,actor_id,actor_role,decision,comment) VALUES(?,?,?,'SUBMITTED',?)",
      [result.insertId,req.user.id,req.user.role,"Application submitted"]
    );
    await audit(req.user.id,"LEAVE_SUBMITTED","leave_application",result.insertId,{days});
    res.status(201).json({message:"Leave application submitted to your HOD.",id:result.insertId});
  } catch(e) { console.error(e); res.status(500).json({message:"Could not submit application."}); }
});

router.post("/:id/decision", authenticate, allow("HOD","ADMIN"), async (req,res) => {
  const id = Number(req.params.id);
  const { decision, comment="" } = req.body || {};
  if (!Number.isInteger(id) || !["APPROVE","REJECT"].includes(decision))
    return res.status(400).json({message:"Invalid decision."});
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    const [rows] = await conn.execute(
      `SELECT l.*,u.department_id FROM leave_applications l JOIN users u ON u.id=l.faculty_id
       WHERE l.id=? FOR UPDATE`, [id]
    );
    if (!rows.length) { await conn.rollback(); return res.status(404).json({message:"Application not found."}); }
    const l = rows[0];
    if (req.user.role==="HOD" && (l.status!=="PENDING_HOD" || Number(l.department_id)!==Number(req.user.department_id))) {
      await conn.rollback(); return res.status(403).json({message:"This application is not assigned to your department."});
    }
    if (req.user.role==="ADMIN" && l.status!=="PENDING_ADMIN") {
      await conn.rollback(); return res.status(409).json({message:"This application is not awaiting Admin approval."});
    }
    let nextStatus;
    if (decision==="REJECT") nextStatus="REJECTED";
    else nextStatus=req.user.role==="HOD" ? "PENDING_ADMIN" : "APPROVED";
    await conn.execute(
      `UPDATE leave_applications SET status=?,current_approver_id=NULL,
       hod_comment=IF(?='HOD',?,hod_comment),admin_comment=IF(?='ADMIN',?,admin_comment)
       WHERE id=?`,
      [nextStatus,req.user.role,comment,req.user.role,comment,id]
    );
    await conn.execute(
      "INSERT INTO approval_history(leave_id,actor_id,actor_role,decision,comment) VALUES(?,?,?,?,?)",
      [id,req.user.id,req.user.role,decision==="APPROVE"?"APPROVED":"REJECTED",comment]
    );
    if (nextStatus==="APPROVED") {
      await conn.execute(
        `INSERT INTO leave_balances(faculty_id,leave_type_id,opening_balance,used_days)
         VALUES(?,?,0,?) ON DUPLICATE KEY UPDATE used_days=used_days+VALUES(used_days)`,
        [l.faculty_id,l.leave_type_id,l.total_days]
      );
    }
    await conn.commit();
    await audit(req.user.id,`LEAVE_${decision}D`,"leave_application",id,{nextStatus,comment});
    res.json({message: nextStatus==="PENDING_ADMIN"?"HOD approval recorded. Sent to Admin for final approval.":`Application ${nextStatus.toLowerCase()}.`,status:nextStatus});
  } catch(e) { await conn.rollback(); console.error(e); res.status(500).json({message:"Could not process decision."}); }
  finally { conn.release(); }
});

module.exports = router;
