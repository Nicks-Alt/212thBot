/**
 * Cache manager for Google Sheets data
 * Helps reduce API calls and improve performance
 */

const { google } = require('googleapis');
const auth = new google.auth.GoogleAuth({
  keyFile: 'service_account.json',
  scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
});
const sheets = google.sheets({ version: 'v4', auth });

// Cache storage
const cache = {
  // Structure:
  // {
  //   'spreadsheetId:range': {
  //     data: [...],
  //     lastFetch: timestamp
  //   }
  // }
};

// Cache expiration time in milliseconds (5 minutes)
const CACHE_EXPIRATION = 5 * 60 * 1000;

// Mapping of aliases to actual cache keys
const aliasMap = {};

/**
 * Register aliases for a spreadsheet range
 * @param {string} spreadsheetId - The ID of the spreadsheet
 * @param {string} range - The range to fetch
 * @param {Array<string>} aliases - Array of alias names
 */
function registerAliases(spreadsheetId, range, aliases) {
  const actualKey = `${spreadsheetId}:${range}`;
  
  // Initialize the cache entry if it doesn't exist
  if (!cache[actualKey]) {
    cache[actualKey] = {
      data: null,
      lastFetch: 0
    };
  }
  
  // Update the alias map
  for (const alias of aliases) {
    aliasMap[alias] = actualKey;
    console.log(`Registered alias '${alias}' for sheet range '${range}'`);
  }
}

/**
 * Initialize the cache with commonly used data
 * @returns {Promise<void>}
 */
async function initializeCache() {
  console.log('Initializing cache with commonly used data...');
  
  try {
    // Define sheet ranges and their aliases
    const sheetRanges = [
      {
        spreadsheetId: process.env.OFFICER_SPREADSHEET_ID,
        range: `'Bot'!A2:C1000`,
        aliases: ['registrationdata']
      },
      {
        spreadsheetId: process.env.MAIN_SPREADSHEET_ID,
        range: `'212th Attack Battalion'!C2:N1000`,
        aliases: ['mainsheetdata']
      },
      {
        spreadsheetId: process.env.OFFICER_SPREADSHEET_ID,
        range: 'Eligible Votes!A2:B1000',
        aliases: ['promosfromdb']
      },
      {
        spreadsheetId: process.env.OFFICER_SPREADSHEET_ID,
        range: `'Statistics'!A2:AA`,
        aliases: ['statistics']
      },
      {
        spreadsheetId: process.env.OFFICER_SPREADSHEET_ID,
        range: `'Punishment Log'!A2:F1000`,
        aliases: ['punishments']
      },
      {
        spreadsheetId: process.env.OFFICER_SPREADSHEET_ID,
        range: `'Blacklist'!A2:F1000`,
        aliases: ['blacklist']
      }
    ];
    
    // Register all the aliases
    for (const { spreadsheetId, range, aliases } of sheetRanges) {
      registerAliases(spreadsheetId, range, aliases);
    }
    
    // Pre-cache all the data
    for (const { spreadsheetId, range, aliases } of sheetRanges) {
      await getCachedSheetData(
        spreadsheetId,
        range,
        aliases[0], // Use the first alias as the cache key
        true // Force refresh
      );
    }
    
    // Cache recent AAR logs separately
    await getRecentAARLogs(true); // Force refresh
    
    console.log('Cache initialization complete!');
  } catch (error) {
    console.error('Error initializing cache:', error);
    console.log('Continuing with empty cache. Data will be fetched as needed.');
  }
}

/**
 * Get cached sheet data or fetch it if not cached or expired
 * @param {string} spreadsheetId - The ID of the spreadsheet
 * @param {string} range - The range to fetch
 * @param {string} cacheKey - Optional key to use for caching (defaults to spreadsheetId:range)
 * @param {boolean} forceRefresh - Whether to force a refresh of the cache
 * @param {string} valueRenderOption - The value render option for the API call
 * @returns {Promise<Array>} - The sheet data
 */
async function getCachedSheetData(
  spreadsheetId, 
  range, 
  cacheKey = null, 
  forceRefresh = false,
  valueRenderOption = 'FORMATTED_VALUE'
) {
  // Generate a cache key if not provided
  const key = cacheKey || `${spreadsheetId}:${range}`;
  
  // Extract sheet name from range for better logging
  let sheetName = "unknown";
  if (range.includes("!")) {
    sheetName = range.split("!")[0].replace(/'/g, "");
  }
  
  // Initialize the cache entry if it doesn't exist
  if (!cache[key]) {
    cache[key] = {
      data: null,
      lastFetch: 0
    };
  }
  
  const now = Date.now();
  const cacheEntry = cache[key];
  
  // Check if we need to fetch fresh data
  if (
    forceRefresh || 
    !cacheEntry.data || 
    now - cacheEntry.lastFetch > CACHE_EXPIRATION
  ) {
    console.log(`Fetching fresh data for ${key} (Sheet: ${sheetName})`);
    
    try {
      const response = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range,
        valueRenderOption
      });
      
      // Update the cache
      cacheEntry.data = response.data.values || [];
      cacheEntry.lastFetch = now;
      
      console.log(`Cached ${cacheEntry.data.length} rows for ${key} (Sheet: ${sheetName})`);
    } catch (error) {
      console.error(`Error fetching data for ${key} (Sheet: ${sheetName}):`, error);
      
      // If we have cached data, use it even if expired
      if (cacheEntry.data) {
        console.log(`Using expired cache for ${key} (Sheet: ${sheetName})`);
      } else {
        // No cached data to fall back on
        throw error;
      }
    }
  } else {
    console.log(`Using cached data for ${key} (Sheet: ${sheetName}) (${cacheEntry.data.length} rows)`);
  }
  
  return cacheEntry.data;
}

/**
 * Get recent AAR logs (within 7 days and with log IDs)
 * @param {boolean} forceRefresh - Whether to force a refresh of the cache
 * @returns {Promise<Array>} - Filtered AAR data with row indices
 */
async function getRecentAARLogs(forceRefresh = false) {
  const cacheKey = 'recentaars';
  const now = Date.now();
  
  // Check if we have cached recent AAR data
  if (!forceRefresh && cache[cacheKey] && (now - cache[cacheKey].lastFetch < CACHE_EXPIRATION)) {
    console.log(`Using cached recent AAR data (${cache[cacheKey].data.length} logs)`);
    return cache[cacheKey].data;
  }

  try {
    console.log('Fetching and filtering recent AAR logs...');
    
    // Fetch all AAR data
    const aarData = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.MAIN_SPREADSHEET_ID,
      range: `'AARs'!A2:DE100000`,
      valueRenderOption: 'FORMATTED_VALUE'
    });

    const rows = aarData.data.values || [];
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    const recentLogs = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      
      // Check if log ID exists (column DE, index 108)
      const logId = row[108];
      if (!logId || logId.trim() === '') {
        continue;
      }

      // Check if date is within 7 days (column A, index 0)
      const dateStr = row[0];
      if (!dateStr) {
        continue;
      }

      try {
        // Parse date in format "m/dd/yyyy hh:mm:ss"
        const datePart = dateStr.split(' ')[0]; // Get just the date part
        const [month, day, year] = datePart.split('/');
        const logDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
        if (logDate >= sevenDaysAgo) {
          recentLogs.push({
            rowData: row,
            rowIndex: i + 2, // +2 because we start from A2 and sheets are 1-indexed
            logId: logId,
            date: logDate,
            aarType: row[3]
          });
        }
      } catch (error) {
        console.error('Error parsing date:', dateStr, error);
        continue;
      }
    }

    // Cache the filtered results
    cache[cacheKey] = {
      data: recentLogs,
      lastFetch: now
    };

    console.log(`Found and cached ${recentLogs.length} recent AAR logs with valid log IDs`);
    return recentLogs;
  } catch (error) {
    console.error('Error getting recent AAR logs:', error);
    
    // Return cached data if available, even if expired
    if (cache[cacheKey] && cache[cacheKey].data) {
      console.log('Using expired cached recent AAR data');
      return cache[cacheKey].data;
    }
    
    return [];
  }
}

/**
 * Find AAR log by log ID from cached data
 * @param {string} logId - The log ID to search for
 * @returns {Promise<Object|null>} - Log data with row index or null if not found
 */
async function findAARLogById(logId) {
  try {
    const recentLogs = await getRecentAARLogs();
    
    const foundLog = recentLogs.find(log => log.logId === logId);
    if (foundLog) {
      return {
        rowData: foundLog.rowData,
        rowIndex: foundLog.rowIndex
      };
    }
    
    return null;
  } catch (error) {
    console.error('Error finding AAR log by ID:', error);
    return null;
  }
}

/**
 * Clear the entire cache or a specific entry
 * @param {string} key - Optional key to clear (clears all if not provided)
 */
function clearCache(key = null) {
  if (key) {
    if (cache[key]) {
      // Extract sheet name from range for better logging
      let sheetName = "unknown";
      if (key.includes("!")) {
        sheetName = key.split("!")[0].replace(/'/g, "");
      } else if (key.includes(":")) {
        const range = key.split(":")[1];
        if (range && range.includes("!")) {
          sheetName = range.split("!")[0].replace(/'/g, "");
        }
      }
      
      delete cache[key];
      console.log(`Cleared cache for ${key} (Sheet: ${sheetName})`);
    }
  } else {
    Object.keys(cache).forEach(k => delete cache[k]);
    console.log('Cleared entire cache');
  }
}

/**
 * Get information about the current cache
 * @returns {Object} - Cache statistics
 */
function getCacheStats() {
  const stats = {
    entries: Object.keys(cache).length,
    totalRows: 0,
    keys: [],
    details: {}
  };
  
  Object.keys(cache).forEach(key => {
    const entry = cache[key];
    const rowCount = entry.data ? entry.data.length : 0;
    const age = Date.now() - entry.lastFetch;
    
    // Extract sheet name from key for better reporting
    let sheetName = "unknown";
    if (key.includes("!")) {
      sheetName = key.split("!")[0].replace(/'/g, "");
    } else if (key.includes(":")) {
      const range = key.split(":")[1];
      if (range && range.includes("!")) {
        sheetName = range.split("!")[0].replace(/'/g, "");
      }
    }
    
    stats.totalRows += rowCount;
    stats.keys.push(key);
    stats.details[key] = {
      sheetName: sheetName,
      rows: rowCount,
      ageMs: age,
      ageSec: Math.round(age / 1000),
      ageMin: Math.round(age / 60000),
      isFresh: age < CACHE_EXPIRATION
    };
  });
  
  return stats;
}

// Set up a periodic cache refresh with default interval of 4 minutes
function setupPeriodicCacheRefresh(intervalMinutes = 4) {
  const intervalMs = intervalMinutes * 60 * 1000;
  
  console.log(`Setting up periodic cache refresh every ${intervalMinutes} minutes`);
  
  setInterval(async () => {
    console.log('Performing periodic cache refresh...');
    const startTime = Date.now();
    let refreshedEntries = 0;
    let failedEntries = 0;
    
    try {
      // Define the key sheet ranges that need to be refreshed
      const sheetRanges = [
        {
          spreadsheetId: process.env.OFFICER_SPREADSHEET_ID,
          range: `'Bot'!A2:C1000`,
          cacheKey: 'registrationdata'
        },
        {
          spreadsheetId: process.env.MAIN_SPREADSHEET_ID,
          range: `'212th Attack Battalion'!C2:N1000`,
          cacheKey: 'mainsheetdata'
        },
        {
          spreadsheetId: process.env.OFFICER_SPREADSHEET_ID,
          range: 'Eligible Votes!A2:B1000',
          cacheKey: 'promosfromdb'
        },
        {
          spreadsheetId: process.env.OFFICER_SPREADSHEET_ID,
          range: `'Statistics'!A2:AA`,
          cacheKey: 'statistics'
        },
        {
          spreadsheetId: process.env.OFFICER_SPREADSHEET_ID,
          range: `'Punishment Log'!A2:F1000`,
          cacheKey: 'punishments'
        },
        {
          spreadsheetId: process.env.OFFICER_SPREADSHEET_ID,
          range: `'Blacklist'!A2:F1000`,
          cacheKey: 'blacklist'
        }
      ];
      
      // Refresh each range
      for (const { spreadsheetId, range, cacheKey } of sheetRanges) {
        try {
          console.log(`Refreshing cache for ${cacheKey} (${range})`);
          
          // Force refresh the cache for this range
          const data = await getCachedSheetData(
            spreadsheetId,
            range,
            cacheKey,
            true // Force refresh
          );
          
          refreshedEntries++;
          console.log(`Successfully refreshed ${cacheKey} with ${data.length} rows`);
        } catch (error) {
          console.error(`Failed to refresh ${cacheKey}:`, error);
          failedEntries++;
        }
      }
      
      // Refresh recent AAR logs
      try {
        console.log('Refreshing recent AAR logs cache');
        const recentLogs = await getRecentAARLogs(true);
        refreshedEntries++;
        console.log(`Successfully refreshed recent AAR logs with ${recentLogs.length} entries`);
      } catch (error) {
        console.error('Failed to refresh recent AAR logs:', error);
        failedEntries++;
      }
      
      const endTime = Date.now();
      const duration = (endTime - startTime) / 1000;
      
      // Get updated cache stats
      const stats = getCacheStats();
      
      console.log(`Periodic cache refresh complete in ${duration.toFixed(2)}s`);
      console.log(`Refreshed: ${refreshedEntries} entries, Failed: ${failedEntries} entries`);
      console.log(`Cache now contains ${stats.entries} entries with ${stats.totalRows} total rows`);
    } catch (error) {
      console.error('Error during periodic cache refresh:', error);
    }
  }, intervalMs);
}

module.exports = {
  initializeCache,
  getCachedSheetData,
  getRecentAARLogs,
  findAARLogById,
  clearCache,
  getCacheStats,
  setupPeriodicCacheRefresh
};