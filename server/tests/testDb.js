const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongoServer;

/**
 * Starts an in-memory MongoDB instance and connects mongoose to it. Call
 * once per test file in `beforeAll`.
 */
async function connect() {
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    await mongoose.connect(uri);
}

/**
 * Wipes all collections between tests so each test starts from a clean
 * slate without paying the cost of a fresh server per test.
 */
async function clearDatabase() {
    const collections = mongoose.connection.collections;
    for (const key of Object.keys(collections)) {
        await collections[key].deleteMany({});
    }
}

/**
 * Tears down the mongoose connection and stops the in-memory server. Call
 * once per test file in `afterAll`.
 */
async function closeDatabase() {
    await mongoose.connection.dropDatabase();
    await mongoose.connection.close();
    if (mongoServer) {
        await mongoServer.stop();
    }
}

module.exports = { connect, clearDatabase, closeDatabase };
