const axios = require('axios');
const fs = require('fs');
const path = require('path');

async function fetchAndCacheBattalionData(battalion) {
  try {
    const targetUrl = `https://superiorservers.co/api/ssrp/cwrp/groupinfo/${battalion}`;
    
    const response = await axios.get(targetUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'application/json, text/plain, */*',
        'Accept-Language': 'en-US,en;q=0.9',
        'Referer': 'https://superiorservers.co/',
        'Origin': 'https://superiorservers.co',
        'Cookie': 'ss_session=1; ss_lastvisit=' + Math.floor(Date.now() / 1000)
      }
    });
    
    if (response.data && response.data.success) {
      // Save to cache file
      const cacheDir = path.join(__dirname, 'cache');
      if (!fs.existsSync(cacheDir)) {
        fs.mkdirSync(cacheDir, { recursive: true });
      }
      
      const cacheFile = path.join(cacheDir, `${battalion}.json`);
      fs.writeFileSync(cacheFile, JSON.stringify(response.data));
      console.log(`Successfully cached ${battalion} data`);
    }
  } catch (error) {
    console.error(`Error caching ${battalion} data:`, error.message);
  }
}

// Run the cache update
(async () => {
  await fetchAndCacheBattalionData('212th');
  await fetchAndCacheBattalionData('212AB');
})();