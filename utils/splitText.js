// Helper function to split text into chunks that fit within Discord's field value limit
function splitText(text, maxLength) {
    const chunks = [];
    let currentChunk = '';
    
    // Split by double newlines which separate message entries
    const entries = text.split('\n\n');
    
    for (const entry of entries) {
        // If adding this entry would exceed the max length, push current chunk and start a new one
        if (currentChunk.length + entry.length + 2 > maxLength && currentChunk.length > 0) {
            chunks.push(currentChunk);
            currentChunk = entry;
        } else {
            // Add to current chunk with a separator if not the first entry in this chunk
            if (currentChunk.length > 0) {
                currentChunk += '\n\n';
            }
            currentChunk += entry;
        }
    }
    
    // Push the last chunk if it has content
    if (currentChunk.length > 0) {
        chunks.push(currentChunk);
    }
    
    return chunks;
}

module.exports = {splitText}