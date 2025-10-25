const fs = require('fs');
const path = require('path');
const { pool } = require('./connection');

async function waitForDatabase(maxRetries = 30, delay = 1000) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      await pool.query('SELECT 1');
      console.log('Database connection established');
      return true;
    } catch (error) {
      console.log(`Waiting for database... (${i + 1}/${maxRetries})`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  throw new Error('Database connection timeout');
}

async function initializeDatabase() {
  try {
    console.log('Initializing database...');
    
    // Wait for database to be ready
    await waitForDatabase();
    
    // Read and execute schema
    const schemaPath = path.join(__dirname, 'schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');
    
    await pool.query(schema);
    console.log('Database schema created successfully');
    
    // Insert sample word pairs if they don't exist
    const wordPairsCount = await pool.query('SELECT COUNT(*) FROM word_pairs');
    if (wordPairsCount.rows[0].count === '0') {
      console.log('Inserting sample word pairs...');
      
      const samplePairs = [
        ['tea', 'coffee'],
        ['dog', 'cat'],
        ['sun', 'moon'],
        ['car', 'bike'],
        ['book', 'movie'],
        ['pizza', 'burger'],
        ['beach', 'mountain'],
        ['summer', 'winter'],
        ['day', 'night'],
        ['happy', 'sad']
      ];
      
      for (const [word1, word2] of samplePairs) {
        await pool.query(
          'INSERT INTO word_pairs (word1, word2, category, difficulty) VALUES ($1, $2, $3, $4)',
          [word1, word2, 'general', 'easy']
        );
      }
      
      console.log('Sample word pairs inserted');
    }
    
    console.log('Database initialization completed');
  } catch (error) {
    console.error('Database initialization failed:', error);
    throw error;
  }
}

// Run initialization if this file is executed directly
if (require.main === module) {
  initializeDatabase()
    .then(() => {
      console.log('Database ready!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Failed to initialize database:', error);
      process.exit(1);
    });
}

module.exports = { initializeDatabase };
