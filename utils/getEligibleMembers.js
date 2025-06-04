const { google } = require('googleapis');
require('dotenv').config();

// Configure Google Sheets API
const auth = new google.auth.GoogleAuth({
  keyFile: './service_account.json',
  scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
});
const sheets = google.sheets({ version: 'v4', auth });

async function getEligibleMembers() {
    try {
        const spreadsheetId = process.env.SPREADSHEET_ID;

        if (!spreadsheetId) {
            throw new Error('SPREADSHEET_ID environment variable is not set');
        }

        // First spreadsheet - "Eligible Votes"
        const eligibleVotesResponse = await sheets.spreadsheets.values.get({
            spreadsheetId,
            range: 'Promos!A:B',
        });
        
        const eligibleVotesRows = eligibleVotesResponse.data.values;

        if (!eligibleVotesRows || eligibleVotesRows.length === 0) {
            console.log('No eligible votes data found');
            return [];
        }
        
        // Filter rows where column B contains PFC or LCPL
        const eligibleNames = eligibleVotesRows
            .filter(row => row.length > 1 && (row[1].includes('PFC') || row[1].includes('LCPL')))
            .map(row => row[0]);
        
        // Second spreadsheet - Check if user is on server -- Yes i know this is absolute dogshit
        const battalionResponse = await sheets.spreadsheets.values.get({
            spreadsheetId,
            range: 'Main!C3:K',
        });
        
        const battalionRows = battalionResponse.data.values;

        if (!battalionRows || battalionRows.length === 0) {
            console.log('No battalion data found');
            return [];
        }
        // Filter rows where name is in eligibleNames and column M (index 8) is 0 [if user is on server]
        const finalEligibleMembers = [];
        for (const name of eligibleNames) {
            const matchingRows = battalionRows.filter(row =>
                row && row.length > 8 &&
                row[0] === name &&     // Column E is index 0 in E:M range
                row[8] === '0'         // Column M is index 8 in E:M range  
            );
            if (matchingRows.length > 0) {
                finalEligibleMembers.push(name);
            }
        }
        console.log(finalEligibleMembers);
        return finalEligibleMembers;
    } catch (error) {
        console.error('Error fetching spreadsheet data:', error);
        throw error;
    }
}

module.exports = {getEligibleMembers}