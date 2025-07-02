const { google } = require('googleapis');

const auth = new google.auth.GoogleAuth({
  keyFile: 'service_account.json',
  scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});

const sheets = google.sheets({ version: 'v4', auth });

async function insertAAR(eventType, name, steamId, data, ID) {
    const timestamp = formatTimestamp();
    const logId = ID;
    const firstEmptyRow = await findFirstEmptyRow();
    
    // Create the base row data
    const rowData = new Array(200).fill(''); // Create array with 200 empty cells
    rowData[0] = timestamp; // Column A
    rowData[1] = name; // Column B
    rowData[2] = steamId; // Column C
    rowData[3] = eventType; // Column D
    rowData[109] = logId; // Column DF
    
    // Fill specific columns based on event type
    switch (eventType) {
    case 'Server 1 Event':
    case 'Server 2 Event':
        rowData[28] = data.gamemaster; // AC
        rowData[29] = data.participants; // AD
        rowData[30] = data.summary; // AE
        rowData[31] = data.additionalInfo || ''; // AF
        break;
        
    case 'Training Simulation':
        rowData[22] = data.gamemaster; // W
        rowData[23] = data.participants; // X
        rowData[24] = data.summary; // Y
        rowData[25] = data.additionalInfo || ''; // Z
        rowData[80] = data.lead; // CC
        rowData[92] = data.leadSteamId; // CO
        break;
        
    case 'Joint Training Simulation':
        rowData[93] = data.gamemaster; // CP
        rowData[94] = data.lead; // CQ
        rowData[95] = data.leadSteamId; // CR
        rowData[96] = data.participants; // CS
        rowData[97] = data.summary; // CT
        rowData[98] = data.additionalInfo || ''; // CU
        rowData[99] = data.battalions; // CV
        break;
        
    case 'Tryout':
        rowData[75] = data.officerName; // BX
        rowData[4] = data.officerSteamId; // E 
        rowData[5] = data.startingCTs; // F
        rowData[6] = data.endingCTs; // G
        rowData[7] = data.passedCTs; // H
        rowData[18] = data.additionalInfo || ''; // S
        break;
        
    case 'Basic Training':
        // Handle multiple PVTs (up to 5 pairs)
        const pvtNames = data.pvtNames || [];
        const pvtSteamIds = data.pvtSteamIds || [];
        for (let i = 0; i < Math.min(5, pvtNames.length); i++) {
          rowData[8 + (i * 2)] = pvtNames[i]; // I, K, M, O, Q
          rowData[9 + (i * 2)] = pvtSteamIds[i]; // J, L, N, P, R
        }
        rowData[19] = data.additionalInfo || ''; // T
        break;
        
    case 'Rank Exam':
        rowData[32] = data.participantName; // AG (A=26, G=6, so 26+6=32)
        rowData[90] = data.participantSteamId; // CM (C=78, M=12, so 78+12=90)
        rowData[91] = data.group; // CN (C=78, N=13, so 78+13=91)
        rowData[33] = data.testing; // AH (A=26, H=7, so 26+7=33)
        rowData[34] = data.result; // AI (A=26, I=8, so 26+8=34)
        break;
        
    case 'GC Certifications':
        rowData[56] = data.participantName; // BE (B=52, E=4, so 52+4=56)
        rowData[57] = data.trialmaybecert; // BF (B=52, F=5, so 52+5=57)
        rowData[103] = data.gamemaster; // CZ (C=78, Z=25, so 78+25=103)
        rowData[58] = data.result; // BG (B=52, G=6, so 52+6=58)
        break;
        
    case '2AB Certifications':
        rowData[60] = data.participantName; // BI (B=52, I=8, so 52+8=60)
        rowData[89] = data.participantSteamId; // CL (C=78, L=11, so 78+11=89)
        rowData[107] = data.certification; // DD (D=104, D=3, so 104+3=107)
        rowData[62] = data.result; // BK (B=52, K=10, so 52+10=62)
        break;
        
    case 'ARF Certifications':
        rowData[36] = data.participantName; // AK (A=26, K=10, so 26+10=36)
        rowData[83] = data.participantSteamId; // CF (C=78, F=5, so 78+5=83)
        rowData[37] = data.certification; // AL (A=26, L=11, so 26+11=37)
        rowData[72] = data.gamemaster; // BU (B=52, U=20, so 52+20=72)
        rowData[38] = data.result; // AM (A=26, M=12, so 26+12=38)
        rowData[39] = data.additionalInfo || ''; // AN (A=26, N=13, so 26+13=39)
        break;
        
    case 'Wraith Certifications':
        rowData[40] = data.participantName; // AO (A=26, O=14, so 26+14=40)
        rowData[84] = data.participantSteamId; // CG (C=78, G=6, so 78+6=84)
        rowData[41] = data.certification; // AP (A=26, P=15, so 26+15=41)
        rowData[100] = data.gamemaster; // CW (C=78, W=22, so 78+22=100)
        rowData[42] = data.result; // AQ (A=26, Q=16, so 26+16=42)
        rowData[43] = data.additionalInfo || ''; // AR (A=26, R=17, so 26+17=43)
        break;
        
    case 'Medic Certifications':
        rowData[44] = data.participantName; // AS (A=26, S=18, so 26+18=44)
        rowData[85] = data.participantSteamId; // CH (C=78, H=7, so 78+7=85)
        rowData[45] = data.certification; // AT (A=26, T=19, so 26+19=45)
        rowData[46] = data.result; // AU (A=26, U=20, so 26+20=46)
        rowData[47] = data.additionalInfo || ''; // AV (A=26, V=21, so 26+21=47)
        break;
        
    case 'Heavy Certifications':
        rowData[48] = data.participantName; // AW (A=26, W=22, so 26+22=48)
        rowData[86] = data.participantSteamId; // CI (C=78, I=8, so 78+8=86)
        rowData[49] = data.certification; // AX (A=26, X=23, so 26+23=49)
        rowData[101] = data.gamemaster; // CX (C=78, X=23, so 78+23=101)
        rowData[50] = data.result; // AY (A=26, Y=24, so 26+24=50)
        rowData[51] = data.additionalInfo || ''; // AZ (A=26, Z=25, so 26+25=51)
        break;
        
    case 'JSF Gold Certifications':
        rowData[68] = data.participantName; // BQ (B=52, Q=16, so 52+16=68)
        rowData[106] = data.participantSteamId; // DC (D=104, C=2, so 104+2=106)
        rowData[69] = data.certification; // BR (B=52, R=17, so 52+17=69)
        rowData[105] = data.gamemaster; // DB (D=104, B=1, so 104+1=105)
        rowData[70] = data.result; // BS (B=52, S=18, so 52+18=70)
        rowData[71] = data.additionalInfo || ''; // BT (B=52, T=19, so 52+19=71)
        break;
        
    case '(S)NCO Basic Training':
        rowData[73] = data.participantName; // BV (B=52, V=21, so 52+21=73)
        rowData[74] = data.completed; // BW (B=52, W=22, so 52+22=74)
        break;
        
    case 'Basic Training Certification (SNCO+)':
        rowData[81] = data.cplName; // CD (C=78, D=3, so 78+3=81)
        rowData[82] = data.cplSteamId; // CE (C=78, E=4, so 78+4=82)
        break;
    }
    const lastColumn = numberToColumnLetter(rowData.length);
    await sheets.spreadsheets.values.update({
    spreadsheetId: "1wjm5siit8NNdZJ-zaDsXlXpijywmtWmshc9eMuTCxT0",
    range: `AARs!A${firstEmptyRow}:${lastColumn}${firstEmptyRow}`,
    valueInputOption: 'USER_ENTERED',
    resource: {
        values: [rowData]
        }
    });
}

function numberToColumnLetter(num) {
  let result = '';
  while (num > 0) {
    num--;
    result = String.fromCharCode(65 + (num % 26)) + result;
    num = Math.floor(num / 26);
  }
  return result;
}

// Find the first empty row in the AARs sheet
async function findFirstEmptyRow() {
  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: "1wjm5siit8NNdZJ-zaDsXlXpijywmtWmshc9eMuTCxT0",
      range: `AARs!A:A`,
    });
    
    const values = response.data.values || [];
    return values.length + 1; // Next empty row
  } catch (error) {
    console.error('Error finding empty row:', error);
    return 2; // Default to row 2 if error
  }
}

// Format timestamp as m/dd/yyyy hh:mm:ss in GMT timezone
function formatTimestamp() {
  const now = new Date();
  
  // Get GMT/UTC components
  const month = now.getUTCMonth() + 1; // No padding for month
  const day = String(now.getUTCDate()).padStart(2, '0');
  const year = now.getUTCFullYear();
  const hours = String(now.getUTCHours()).padStart(2, '0');
  const minutes = String(now.getUTCMinutes()).padStart(2, '0');
  const seconds = String(now.getUTCSeconds()).padStart(2, '0');
  
  // Return as string in the exact format you want
  return `${month}/${day}/${year} ${hours}:${minutes}:${seconds}`;
}

module.exports = {insertAAR}