import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";
const dataDir = process.env.DATA_DIR || "/data";
fs.mkdirSync(dataDir,{recursive:true});
export const db = new Database(path.join(dataDir,"mansion.sqlite"));
db.pragma("journal_mode = WAL");
db.exec(`
CREATE TABLE IF NOT EXISTS jobs(id TEXT PRIMARY KEY, source TEXT NOT NULL, status TEXT NOT NULL, stage TEXT NOT NULL, progress REAL DEFAULT 0, message TEXT DEFAULT '', total INTEGER DEFAULT 0, processed INTEGER DEFAULT 0, created_at TEXT NOT NULL, updated_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS media(id TEXT PRIMARY KEY, name TEXT NOT NULL, object_key TEXT NOT NULL, mime TEXT NOT NULL, size INTEGER NOT NULL, created_at TEXT NOT NULL);
`);
export const jobInsert=db.prepare("INSERT INTO jobs(id,source,status,stage,message,created_at,updated_at) VALUES(?,?,?,?,?,?,?)");
export const jobUpdate=db.prepare("UPDATE jobs SET status=@status,stage=@stage,progress=@progress,message=@message,total=@total,processed=@processed,updated_at=@updated_at WHERE id=@id");
export const jobGet=db.prepare("SELECT * FROM jobs WHERE id=?");
export const jobsList=db.prepare("SELECT * FROM jobs ORDER BY created_at DESC LIMIT 20");
export const mediaInsert=db.prepare("INSERT OR IGNORE INTO media(id,name,object_key,mime,size,created_at) VALUES(?,?,?,?,?,?)");
export const mediaList=db.prepare("SELECT id,name,mime,size,created_at FROM media ORDER BY name COLLATE NOCASE");
export const mediaGet=db.prepare("SELECT * FROM media WHERE id=?");
