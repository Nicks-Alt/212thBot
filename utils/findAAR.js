const { google } = require('googleapis');

/**
 * Find AAR data by logID in the spreadsheet
 * @param {string} logId - The log ID to search for
 * @returns {Promise<Object|null>} - Returns {rowData, rowIndex} or null if not found
 */
async function findAAR(logId) {
    try {
        // Initialize Google Sheets API
        const auth = new google.auth.GoogleAuth({
            keyFile: './service_account.json',
            scopes: ['https://www.googleapis.com/auth/spreadsheets'],
        });

        const sheets = google.sheets({ version: 'v4', auth });
        const spreadsheetId = "1wjm5siit8NNdZJ-zaDsXlXpijywmtWmshc9eMuTCxT0";

        if (!spreadsheetId) {
            throw new Error('SPREADSHEET_ID environment variable is not set');
        }

        // Get all data from the spreadsheet
        const response = await sheets.spreadsheets.values.get({
            spreadsheetId,
            range: 'AARs!A:DE', // Adjust range as needed
        });

        const rows = response.data.values;
        
        if (!rows || rows.length === 0) {
            console.log('No data found in spreadsheet');
            return null;
        }

        // Get headers from first row
        const headers = rows[0];
        
        // Find the column index for Log ID
        const logIdColumnIndex = headers.findIndex(header => 
            header && header.toLowerCase().includes('log') && header.toLowerCase().includes('id')
        );

        if (logIdColumnIndex === -1) {
            console.log('Log ID column not found in spreadsheet');
            return null;
        }

        // Search for the logId in the data rows (skip header row)
        for (let i = 1; i < rows.length; i++) {
            const row = rows[i];
            if (row[logIdColumnIndex] === logId) {
                // Return in the same format as handleAppendLog.js expects
                return {
                    rowData: row,
                    rowIndex: i + 1 // 1-based row number for spreadsheet reference
                };
            }
        }

        // LogID not found
        return null;

    } catch (error) {
        console.error('Error finding AAR:', error);
        throw error;
    }
}

module.exports = { findAAR };