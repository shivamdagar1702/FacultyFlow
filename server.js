require("dotenv").config();
const express = require("express");
const cors = require("cors");
const path = require("path");
const db = require("./src/config/db");
const auth = require("./src/routes/auth");
const data = require("./src/routes/data");
const leaves = require("./src/routes/leaves");
const admin = require("./src/routes/admin");

const app=express();
app.use(cors({origin:process.env.CLIENT_ORIGIN||"http://localhost:3000"}));
app.use(express.json({limit:"1mb"}));
app.use(express.static(path.join(__dirname,"public")));

app.get("/api/health",async(req,res)=>{
  try { await db.query("SELECT 1"); res.json({status:"ok",database:"connected"}); }
  catch { res.status(503).json({status:"error",database:"disconnected"}); }
});
app.use("/api/auth",auth);
app.use("/api",data);
app.use("/api/leaves",leaves);
app.use("/api/admin",admin);

app.get("*",(req,res)=>res.sendFile(path.join(__dirname,"public","index.html")));
const port=Number(process.env.PORT||3000);
app.listen(port,()=>console.log(`FacultyFlow V2 running at http://localhost:${port}`));
