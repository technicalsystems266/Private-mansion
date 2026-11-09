import test from "node:test";
import assert from "node:assert/strict";
import {openDriveDownload} from "../src/drive.js";
test("rejects non Google Drive URLs",async()=>{await assert.rejects(()=>openDriveDownload("https://example.com/file.zip"),/Google Drive/);});
test("rejects malformed Google Drive links",async()=>{await assert.rejects(()=>openDriveDownload("https://drive.google.com/drive/my-drive"),/file ID/);});
