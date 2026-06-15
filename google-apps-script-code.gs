/**
 * Google Apps Script (Code.gs)
 * สำหรับระบบ AMT CONNECT (ศูนย์บริหารสารสนเทศและการสอบอู่การช่างอากาศยาน)
 * เชื่อมต่อกับ Sheet ID: 1KjqOtBAEdENi7Dwgm3hyWJGZbdfZUkxg24vkhugVV4I
 * 
 * วิธีการติดตั้ง:
 * 1. เปิด Google Sheets (ID: 1KjqOtBAEdENi7Dwgm3hyWJGZbdfZUkxg24vkhugVV4I)
 * 2. ไปที่ Extension (ส่วนขยาย) > Apps Script
 * 3. ลบโค้ดเริ่มต้นทั้งหมด แล้ววางโค้ดนี้ลงไปในไฟล์ Code.gs
 * 4. บันทึกโครงการ และกด Deploy (การใช้งานจริง) > New Deployment (การปรับใช้งานใหม่)
 * 5. เลือกประเภทเป็น "Web App" (เว็บแอป)
 * 6. ตั้งค่าการเข้าถึง: "Execute as" (เรียกใช้ในฐานะ): Me (ฉันตัวคุณเอง)
 * 7. "Who has access" (ผู้มีสิทธิ์เข้าถึง): "Anyone" (ทุกคน)
 * 8. คัดลอก Web App URL ไปใส่ในระบบ AMT Connect เพื่อซิงค์ข้อมูลให้เป็นแบบเรียลไทม์!
 */

const SPREADSHEET_ID = "1KjqOtBAEdENi7Dwgm3hyWJGZbdfZUkxg24vkhugVV4I";

// รายชื่อชีตและหัวข้อหลัก
const SHEETS_CONFIG = {
  "Users": ["id", "photoUrl", "firstName", "lastName", "role", "signature", "email", "status", "createdAt", "batch", "password"],
  "RoomRequests": ["id", "date", "requesterId", "requesterName", "requesterRole", "room", "purpose", "maintenanceApproved", "isRoomUsageRecordCreated"],
  "RoomUsageRecords": ["id", "date", "room", "requesterName", "requesterRole", "report", "maintenanceOfficerId", "maintenanceOfficerStatus"],
  "Equipment": ["no", "toolName", "partNumber", "serialNumber", "code", "qty", "location", "status", "remark", "calibrationDate"],
  "BorrowRecords": ["id", "borrowDate", "toolName", "equipmentCode", "qty", "borrowerId", "borrowerName", "status", "checkerName"],
  "Schedules": ["id", "batch", "dayOfWeek", "subjectCode", "subjectName", "startDate", "endDate", "instructorName"],
  "ExamSchedules": ["id", "batch", "subjectName", "date", "timeRange", "room"],
  "ExamGrades": ["id", "batch", "subjectName", "grades"] // grades จะเซฟเป็น JSON String ในช่องเดียว
};

function getSpreadsheet() {
  try {
    return SpreadsheetApp.openById(SPREADSHEET_ID);
  } catch (err) {
    Logger.log("Failed to open spreadsheet by ID. Falling back to ActiveSpreadsheet.");
    return SpreadsheetApp.getActiveSpreadsheet();
  }
}

// ฟังก์ชันสร้างชีตเมื่อเริ่มต้น/หรือตรวจสอบหัวคอลัมน์ให้อัตโนมัติ
function ensureSheetsExist() {
  const ss = getSpreadsheet();
  for (let sheetName in SHEETS_CONFIG) {
    let sheet = ss.getSheetByName(sheetName);
    if (!sheet) {
      sheet = ss.insertSheet(sheetName);
    }
    // ใส่ Headers ลำดับแรก ถ้ายังไม่มี
    if (sheet.getLastRow() === 0) {
      const headers = SHEETS_CONFIG[sheetName];
      sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
      sheet.getRange(1, 1, 1, headers.length).setFontWeight("bold").setBackground("#0F172A").setFontColor("#FFFFFF");
    }
  }
}

/**
 * รองรับการดึงข้อมูลผ่าน HTTP GET
 * เช่น GET https://script.google.com/macros/s/.../exec?action=getData
 */
function doGet(e) {
  ensureSheetsExist();
  const action = e && e.parameter ? e.parameter.action : null;
  
  if (action === "getData") {
    const data = fetchAllSheetsData();
    return ContentService.createTextOutput(JSON.stringify(data))
      .setMimeType(ContentService.MimeType.JSON);
  }
  
  // ให้บริการไฟล์ HTML หลักเพื่อรันระบบทั้งหมดบน Google Apps Script Web App
  try {
    return HtmlService.createHtmlOutputFromFile("index")
      .setTitle("AMT CONNECT")
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
      .addMetaTag("viewport", "width=device-width, initial-scale=1");
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ 
      status: "success", 
      message: "AMT Connection Active. Please create an HTML file named 'index' in your Apps Script project and paste the HTML content there.",
      error: err.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * รองรับการเซฟและอัปเดตข้อมูลผ่าน HTTP POST
 */
function doPost(e) {
  ensureSheetsExist();
  let responseData = { success: false, message: "No content parsed" };
  
  try {
    const postData = e.postData.contents;
    const payload = JSON.parse(postData);
    
    if (payload.action === "syncData" && payload.data) {
      const state = payload.data;
      const ss = getSpreadsheet();
      
      // ลูปเขียนข้อมูลสดลงแต่ละชีตตามที่ส่งมา
      for (let sheetName in SHEETS_CONFIG) {
        // แหล่งข้อมูลที่เซฟในหน้าตา state ของ Local Storage
        // เช่น "users" สำหรับ "Users", "roomRequests" สำหรับ "RoomRequests", "schedules" สำหรับ "Schedules" เป็นต้น
        const stateKey = mapSheetToStateKey(sheetName);
        const records = state[stateKey];
        
        if (Array.isArray(records)) {
          writeRecordsToSheet(ss, sheetName, records);
        }
      }
      
      responseData = { success: true, message: "Synchronized all collections successfully into Google Sheet." };
    } else {
      responseData = { success: false, message: "Invalid action or payload" };
    }
  } catch (err) {
    responseData = { success: false, error: err.toString() };
  }
  
  // รองรับการตอบกลับ CORS (ใช้ text output เป็น JSON เพื่อให้ client-side ดึงข้อมูลได้สบาย)
  return ContentService.createTextOutput(JSON.stringify(responseData))
    .setMimeType(ContentService.MimeType.JSON);
}

// ฟังก์ชันแปลงชื่อ Sheet เป็น Key ในแบบฟอร์ม JSON ของแอป
function mapSheetToStateKey(sheetName) {
  const mapping = {
    "Users": "users",
    "RoomRequests": "roomRequests",
    "RoomUsageRecords": "roomUsageRecords",
    "Equipment": "equipment",
    "BorrowRecords": "borrowRecords",
    "Schedules": "schedules",
    "ExamSchedules": "examSchedules",
    "ExamGrades": "examGrades"
  };
  return mapping[sheetName] || sheetName;
}

// เขียนข้อมูลสดทับชีต
function writeRecordsToSheet(ss, sheetName, records) {
  const sheet = ss.getSheetByName(sheetName);
  const headers = SHEETS_CONFIG[sheetName];
  
  // ล้างแถวข้อมูลเดิมทั้งหมดแต่เก็บหัวแถวไว้
  if (sheet.getLastRow() > 1) {
    sheet.deleteRows(2, sheet.getLastRow() - 1);
  } else if (sheet.getLastRow() === 1) {
    // ล้างบรรทัดใต้หัวข้อ
    sheet.getRange(2, 1, 100, headers.length).clearContent();
  }
  
  if (records.length === 0) return;
  
  // ตระเตรียมแถวข้อมูล
  const values = [];
  for (let i = 0; i < records.length; i++) {
    const rec = records[i];
    const row = [];
    for (let j = 0; j < headers.length; j++) {
      const key = headers[j];
      let val = rec[key];
      
      if (val === undefined || val === null) {
        val = "";
      } else if (typeof val === "object") {
        // หากเป็น Nested Array/Object (เช่น ตารางคะแนน grades) ให้เซฟเป็น JSON String
        val = JSON.stringify(val);
      }
      row.push(val);
    }
    values.push(row);
  }
  
  // บันทึกแถวข้อมูลทั้งหมดพร้อมกัน
  sheet.getRange(2, 1, values.length, headers.length).setValues(values);
}

// ดึงข้อมูลทั้งหมดจากทุกชีตกลับคืนเป็น JSON Object
function fetchAllSheetsData() {
  const ss = getSpreadsheet();
  const data = {};
  
  for (let sheetName in SHEETS_CONFIG) {
    const stateKey = mapSheetToStateKey(sheetName);
    const sheet = ss.getSheetByName(sheetName);
    
    if (!sheet) {
      data[stateKey] = [];
      continue;
    }
    
    const lastRow = sheet.getLastRow();
    if (lastRow <= 1) {
      data[stateKey] = [];
      continue;
    }
    
    const headers = SHEETS_CONFIG[sheetName];
    const rangeVals = sheet.getRange(2, 1, lastRow - 1, headers.length).getValues();
    const records = [];
    
    for (let i = 0; i < rangeVals.length; i++) {
      const rowVals = rangeVals[i];
      const rec = {};
      
      for (let j = 0; j < headers.length; j++) {
        const key = headers[j];
        let val = rowVals[j];
        
        // หากเป็นคอลัมน์เกรดหรือโครงงานที่จำต้องแปลงเป็น JSON Object
        if (key === "grades" && typeof val === "string" && val.trim().startsWith("[")) {
          try {
            val = JSON.parse(val);
          } catch (e) {
            // ปล่อยเป็นสตริงแบบเดิมหากเกิดปัญหาแกะ JSON
          }
        }
        
        // แปลงไทป์ตัวเลขที่ดึงมาจาก Sheet คืนค่า
        if (key === "qty" || key === "no") {
          const num = Number(val);
          if (!isNaN(num)) val = num;
        }

        // สำหรับค่าบูลีน
        if (val === "true" || val === true) val = true;
        if (val === "false" || val === false) val = false;
        
        rec[key] = val;
      }
      records.push(rec);
    }
    
    data[stateKey] = records;
  }
  
  return data;
}
