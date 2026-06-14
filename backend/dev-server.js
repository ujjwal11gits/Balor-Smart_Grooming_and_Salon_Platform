const dns = require('dns');
dns.setServers(['8.8.8.8']);
require('dotenv').config();
const mongoose = require('mongoose');

async function start() {
  // Use Atlas URI from .env if provided, otherwise spin up in-memory MongoDB
  if (process.env.MONGO_URI) {
    console.log('Using MongoDB URI from .env (Atlas)...');
    await mongoose.connect(process.env.MONGO_URI);
    console.log('MongoDB Atlas connected ✅');
  } else {
    console.log('No MONGO_URI in .env — starting in-memory MongoDB...');
    const { MongoMemoryServer } = require('mongodb-memory-server');
    const mongod = await MongoMemoryServer.create({
      instance: { port: 27017, dbName: 'barber-app' },
      binary: { version: '7.0.14' },
    });
    const uri = mongod.getUri('barber-app');
    process.env.MONGO_URI = uri;
    console.log('In-memory MongoDB started at', uri);
    await mongoose.connect(uri);
    process.on('SIGINT', async () => { await mongod.stop(); process.exit(); });
  }

  require('./server');
}

start().catch(console.error);
