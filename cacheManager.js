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
  clearCache,
  getCacheStats,
  setupPeriodicCacheRefresh
};