import {Readable} from "node:stream";
function extractId(input){
 const u=new URL(input);
 if(!["drive.google.com","docs.google.com"].includes(u.hostname)) throw new Error("Use a Google Drive share URL.");
 const id=u.searchParams.get("id") || u.pathname.match(/\/file\/d\/([^/]+)/)?.[1];
 if(!id) throw new Error("Could not find a Google Drive file ID in that link.");
 return id;
}
export async function openDriveDownload(url){
 const id=extractId(url);
 const endpoint=`https://drive.google.com/uc?export=download&id=${encodeURIComponent(id)}`;
 let response=await fetch(endpoint,{redirect:"follow",headers:{"user-agent":"Mozilla/5.0"}});
 if(!response.ok) throw new Error(`Google Drive returned HTTP ${response.status}. Check that the file is shared as “Anyone with the link”.`);
 const type=response.headers.get("content-type")||"";
 if(type.includes("text/html")){
   const html=await response.text();
   const token=html.match(/confirm=([0-9A-Za-z_]+)/)?.[1] || html.match(/name="confirm" value="([^"]+)"/)?.[1];
   if(/quota|download quota|too many users/i.test(html)) throw new Error("Google Drive download quota exceeded. Try again later or make an accessible copy in Drive.");
   if(!token) throw new Error("Google Drive did not provide a direct download. Set sharing to “Anyone with the link — Viewer” and retry.");
   response=await fetch(`${endpoint}&confirm=${encodeURIComponent(token)}`,{redirect:"follow",headers:{"user-agent":"Mozilla/5.0"}});
   if(!response.ok || (response.headers.get("content-type")||"").includes("text/html")) throw new Error("Google Drive confirmation did not produce a file download.");
 }
 if(!response.body) throw new Error("Google Drive returned an empty download.");
 return {stream:Readable.fromWeb(response.body),size:Number(response.headers.get("content-length")||0)};
}
