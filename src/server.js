import "dotenv/config";
import express from "express";
import helmet from "helmet";
import crypto from "node:crypto";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {jobInsert,jobGet,jobsList,mediaList,mediaGet} from "./db.js";
import {runImport,readMediaUrl} from "./importer.js";
const app=express(), port=Number(process.env.PORT||3000), secret=process.env.APP_SECRET;
if(!secret||secret.length<24) throw new Error("Set APP_SECRET to a random value at least 24 characters long.");
app.use(helmet({crossOriginResourcePolicy:{policy:"cross-origin"},contentSecurityPolicy:{directives:{"img-src":["'self'","data:","blob:"],"media-src":["'self'","blob:"]}}}));
app.use(express.json({limit:"32kb"}));
function validToken(token){const a=Buffer.from(String(token||"")),b=Buffer.from(secret);return a.length===b.length&&crypto.timingSafeEqual(a,b);}
function auth(req,res,next){if(/^\\/media\\/[^/]+\\/(file|thumb)$/.test(req.path))return next();const token=(req.headers.authorization||"").replace(/^Bearer /i,"")||req.query.key;if(!validToken(token))return res.status(401).json({error:"Unauthorised"});next();}
app.get("/api/health",(_req,res)=>res.json({ok:true,service:"Private Mansion"}));
app.post("/api/auth",(req,res)=>{if(!validToken(req.body?.secret))return res.status(401).json({error:"Incorrect access key"});res.json({ok:true});});
app.use("/api",auth);
app.post("/api/import",(req,res)=>{const source=String(req.body?.url||"").trim();if(!/^https:\/\/(drive\.google\.com|docs\.google\.com)\//i.test(source))return res.status(400).json({error:"Enter a Google Drive share link."});const id=crypto.randomUUID(),stamp=new Date().toISOString();const job={id,source};jobInsert.run(id,source,"queued","queued","Waiting to start",stamp,stamp);res.status(202).json({id});setImmediate(()=>runImport(job));});
app.get("/api/jobs",(_req,res)=>res.json(jobsList.all()));
app.get("/api/jobs/:id",(req,res)=>{const job=jobGet.get(req.params.id);if(!job)return res.status(404).json({error:"Job not found"});res.json(job);});
app.get("/api/media",(req,res)=>{const q=String(req.query.q||"").slice(0,100).toLowerCase();res.json(mediaList.all().filter(x=>!q||x.name.toLowerCase().includes(q)));});
app.get("/api/media/:id/url",async(req,res)=>{try{const item=mediaGet.get(req.params.id);if(!item)return res.status(404).json({error:"Media not found"});if(process.env.STORAGE_MODE!=="s3"){const key=encodeURIComponent(req.query.key||"");return res.json({url:"/api/media/"+item.id+"/file?key="+key,mime:item.mime,name:item.name,thumb:item.mime.startsWith("image/")?"/api/media/"+item.id+"/thumb?key="+key:null});}res.json({url:await readMediaUrl(item.object_key,item.mime),mime:item.mime,name:item.name});}catch(e){res.status(500).json({error:e.message});}});
app.get("/api/media/:id/file",(req,res)=>{const item=mediaGet.get(req.params.id);if(!item||process.env.STORAGE_MODE==="s3")return res.sendStatus(404);res.type(item.mime).sendFile(path.join(process.env.DATA_DIR||"/data","media",item.object_key));});
app.get("/api/media/:id/thumb",(req,res)=>{const item=mediaGet.get(req.params.id);if(!item||process.env.STORAGE_MODE==="s3"||!item.mime.startsWith("image/"))return res.sendStatus(404);res.type("image/webp").sendFile(path.join(process.env.DATA_DIR||"/data","media","thumbs",item.id+".webp"));});
const here=path.dirname(fileURLToPath(import.meta.url));app.use(express.static(path.join(here,"../public")));app.get("/{*path}",(req,res)=>res.sendFile(path.join(here,"../public/index.html")));
app.listen(port,"0.0.0.0",()=>console.log("Private Mansion listening on "+port));
