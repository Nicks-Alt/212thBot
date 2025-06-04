function generateLogID() {
  // Generate a random 10-digit number
  let logID = '';
  for (let i = 0; i < 20; i++) {
    logID += Math.floor(Math.random() * 10);
  }
  return logID;
}

module.exports = { generateLogID };