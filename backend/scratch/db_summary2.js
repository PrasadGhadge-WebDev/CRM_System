const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

async function getDbSummary() {
  let md = '# Database Summary\n\n';
  
  try {
    await mongoose.connect('mongodb://127.0.0.1:27017/crm');
    
    // Get all collections
    const collections = await mongoose.connection.db.listCollections().toArray();
    md += '## Collections & Document Counts\n| Collection | Documents |\n| --- | --- |\n';
    
    for (const collection of collections) {
      const name = collection.name;
      const count = await mongoose.connection.db.collection(name).countDocuments();
      md += `| **${name}** | ${count} |\n`;
    }
    
    md += '\n## Users Directory\n';
    md += '| # | Name | Username | Email | Role | Status |\n| --- | --- | --- | --- | --- | --- |\n';
    
    // Get all users
    const users = await mongoose.connection.db.collection('users').find({}).toArray();
    users.forEach((u, idx) => {
      md += `| ${idx + 1} | ${u.name || '-'} | ${u.username || '-'} | ${u.email || '-'} | ${u.role || '-'} | ${u.status || '-'} |\n`;
    });
    
    md += `\n**Total Users:** ${users.length}\n`;

    fs.writeFileSync(path.join(__dirname, 'summary.md'), md);
    console.log('Done writing summary.md');
  } catch (err) {
    console.error('Error fetching database summary:', err);
  } finally {
    mongoose.connection.close();
  }
}

getDbSummary();
