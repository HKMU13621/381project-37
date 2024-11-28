// mongodbHandler.js
const mongoose = require('mongoose');

mongoose.set('strictQuery', false);

const databaseUrl = process.env.MONGODB_URI || 'mongodb://nog19630:123@cluster0-shard-00-00.oicc7.mongodb.net:27017,cluster0-shard-00-01.oicc7.mongodb.net:27017,cluster0-shard-00-02.oicc7.mongodb.net:27017/COMPS381F_GroupProject?ssl=true&replicaSet=atlas-13zfqv-shard-0&authSource=admin&retryWrites=true&w=majority&appName=Cluster0';
let isConnected = false;

// Initialize connection
async function initializeConnection() {
    try {
        await mongoose.connect(databaseUrl);
        // console.log('MongoDB connected successfully');
    } catch (err) {
        console.error('MongoDB connection error:', err);
        throw err;
    }
}

// Connect once at startup
initializeConnection().catch(console.error);

async function findDocument(collection, query) {
    try {
        let result = await collection.find(query);
        return result;
    } catch (err) {
        throw new Error(`Failed to find document: ${err.message}`);
    }
}

async function insertDocument(collection, doc) {
    try {
        let result = await collection.create(doc);
        return result;
    } catch (err) {
        throw new Error(`Failed to insert document: ${err.message}`);
    }
}

async function updateDocument(collection, query, updateData) {
    try {
        let result = await collection.findOneAndUpdate(
            query,
            { $set: updateData },
            { 
                new: true,
                runValidators: true
            }
        );
        return result;
    } catch (err) {
        throw new Error(`Failed to update document: ${err.message}`);
    }
}

async function deleteDocument(collection, query, oneOrMany = 'one') {
    try {
        let result;
        if (oneOrMany === 'one') {
            result = await collection.deleteOne(query);
        } else if (oneOrMany === 'many') {
            result = await collection.deleteMany(query);
        } else {
            throw new Error('Invalid input parameter');
        }
        return result;
    } catch (err) {
        throw new Error(`Failed to delete document: ${err.message}`);
    }
}

// Add connection event handlers
mongoose.connection.on('connected', () => {
    isConnected = true;
    // console.log('Mongoose connected to MongoDB');
});

mongoose.connection.on('error', (err) => {
    console.error('Mongoose connection error:', err);
});

mongoose.connection.on('disconnected', () => {
    isConnected = false;
    console.log('Mongoose disconnected from MongoDB');
});

// Proper cleanup on process termination
process.on('SIGINT', async () => {
    await mongoose.connection.close();
    process.exit(0);
});

module.exports = {
    findDocument,
    insertDocument,
    updateDocument,
    deleteDocument,
    isConnected: () => isConnected
};