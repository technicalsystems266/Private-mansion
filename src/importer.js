import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import {pipeline} from "node:stream/promises";
import unzipper from "unzipper";
import sharp from "sharp";
import mime from "mime-types";
import {S3Client,PutObjectCommand} from "@aws-sdk/client-s3";
import {getSignedUrl} from "@aws-sdk/s3-request-presigner";
import {Upload} from "@aws-sdk/lib-storage";
import {openDriveDownload} from "./drive.js";
import {jobUpdate,mediaInsert} from "./db.js";
const now=()=>new Date().toISOString();
const maxBytes=Number(process.env.MAX_ARCHIVE_BYTES||5*1024**3);
const maxExpanded=Number(process.env.MAX_EXPANDED_BYTES||30*1024**3);
const allowed=/\.(jpe?g|png|gif|webp|avif|tiff?|bmp|mp4|m4v|mov|webm|mkv|avi)$/i;
const s3=new S3Client({region:process.env.S3_REGION||"auto",endpoint:process.env.S3_ENDPOINT,credentials:process.env.S3_ACCESS_KEY_ID?{accessKeyId:process.env.S3_ACCESS_KEY_ID,secretAccessKey:process.env.S3_SECRET_ACCESS_KEY}:undefined});
function progress(id,stage,message,processed=0,total=0,status="running"){
 jobUpdate.run({id,status,stage,message,processed,total,progress:total?Math.min(99,processed/total*100):0,updated_at:now()});
}
async function putFile(key,file,mimeType){
 const body=fs.createReadStream(file);
 await new Upload({client:s3,params:{Bucket:process.env.S3_BUCKET,Key:key,Body:body,ContentType:mimeType},partSize:16*1024*1024,queueSize:3}).done();
}
export async function signedMediaUrl(key,mimeType){
 return getSignedUrl(s3,new PutObjectCommand({Bucket:process.env.S3_BUCKET,Key:key,ResponseContentType:mimeType}),{expiresIn:900});
}
export async function readMediaUrl(key,mimeType){
 const {GetObjectCommand}=await import("@aws-sdk/client-s3");
 return getSignedUrl(s3,new GetObjectCommand({Bucket:process.env.S3_BUCKET,Key:key,ResponseContentType:mimeType}),{expiresIn:900});
}
export async function runImport(job){
 const root=process.env.DATA_DIR||"/data"; const zip=path.join(root,`${job.id}.zip`); const extract=path.join(root,`extract-${job.id}`);
 try{
  if(!process.env.S3_BUCKET||!process.env.S3_ENDPOINT||!process.env.S3_ACCESS_KEY_ID||!process.env.S3_SECRET_ACCESS_KEY) throw new Error("Cloud storage is not configured. Add the R2/S3 settings in your deployment environment.");
  fs.mkdirSync(extract,{recursive:true});
  progress(job.id,"downloading","Connecting to Google Drive…");
  const {stream,size}=await openDriveDownload(job.source);
  if(size>maxBytes) throw new Error("ZIP exceeds MAX_ARCHIVE_BYTES.");
  let received=0;
  const meter=new (await import("node:stream")).Transform({transform(chunk,enc,cb){received+=chunk.length;if(received>maxBytes){cb(new Error("Archive size limit exceeded."));return;}progress(job.id,"downloading",`Downloaded ${(received/1048576).toFixed(0)} MB`,received,size);cb(null,chunk);}});
  await pipeline(stream,meter,fs.createWriteStream(zip));
  progress(job.id,"extracting","Reading ZIP archive…",0,0);
  const directory=await unzipper.Open.file(zip);
  let expanded=0,processed=0,indexed=0;
  for(const entry of directory.files){
   if(entry.type==="Directory") continue;
   const normalized=path.posix.normalize(entry.path.replace(/\\/g,"/"));
   if(normalized.startsWith("../")||normalized.startsWith("/")||normalized==="..") continue;
   if(!allowed.test(normalized)) continue;
   expanded+=entry.uncompressedSize||0;
   if(expanded>maxExpanded) throw new Error("Archive expands beyond MAX_EXPANDED_BYTES; import stopped for safety.");
   const target=path.join(extract,`${crypto.randomUUID()}-${path.basename(normalized)}`);
   await pipeline(entry.stream(),fs.createWriteStream(target));
   const mimeType=mime.lookup(normalized)||"application/octet-stream";
   const id=crypto.randomUUID(), key=`library/${id}/${path.basename(normalized).replace(/[^a-zA-Z0-9._-]/g,"_")}`;
   await putFile(key,target,mimeType);
   const stat=fs.statSync(target);
   mediaInsert.run(id,path.basename(normalized),key,mimeType,stat.size,now());
   if(mimeType.startsWith("image/")){
    try{const thumb=await sharp(target).rotate().resize({width:480,height:320,fit:"inside",withoutEnlargement:true}).webp({quality:78}).toBuffer();await s3.send(new PutObjectCommand({Bucket:process.env.S3_BUCKET,Key:`thumbs/${id}.webp`,Body:thumb,ContentType:"image/webp"}));}catch{}
   }
   fs.rmSync(target,{force:true}); indexed++; processed+=entry.uncompressedSize||stat.size;
   progress(job.id,"indexing",`Imported ${indexed} media files`,processed,expanded);
  }
  jobUpdate.run({id:job.id,status:"completed",stage:"complete",progress:100,message:`Finished. ${indexed} media files added.`,processed:indexed,total:indexed,updated_at:now()});
 }catch(error){jobUpdate.run({id:job.id,status:"failed",stage:"error",progress:0,message:error.message||"Import failed",processed:0,total:0,updated_at:now()});}
 finally{fs.rmSync(zip,{force:true});fs.rmSync(extract,{recursive:true,force:true});}
}
