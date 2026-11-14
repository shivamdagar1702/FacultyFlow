const db = require("../config/db");

async function audit(actorId, action, entityType, entityId, details = {}) {
  await db.execute(
    "INSERT INTO audit_logs(actor_id, action, entity_type, entity_id, details) VALUES(?,?,?,?,?)",
    [actorId || null, action, entityType, entityId || null, JSON.stringify(details)]
  );
}
module.exports = audit;
