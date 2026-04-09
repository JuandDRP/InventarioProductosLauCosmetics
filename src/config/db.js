const { MongoClient } = require('mongodb');
require('dotenv').config();
const uri=process.env.MONGO_URI;
const client = new MongoClient(uri);
let db;

async function conectarDB() {
  if (!db) {
    await client.connect();
    db = client.db('LauCosmetic');
    console.log("✅ Base de datos conectada");
  }
  return db;
}

module.exports = conectarDB;