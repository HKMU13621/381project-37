const mongoose = require('mongoose');

mongoose.set('strictQuery', false); 

const databaseUrl = 'mongodb://nog19630:123@cluster0-shard-00-00.oicc7.mongodb.net:27017,cluster0-shard-00-01.oicc7.mongodb.net:27017,cluster0-shard-00-02.oicc7.mongodb.net:27017/COMPS381F_GroupProject?ssl=true&replicaSet=atlas-13zfqv-shard-0&authSource=admin&retryWrites=true&w=majority&appName=Cluster0';
let isConnected = false;

async function connect() {
    if (isConnected) return;

    await mongoose.connect(databaseUrl).then(() => {
        isConnected = true;
        console.log('Connected to MongoDB');
    }).catch((err) => {
        console.log(err);
    });
};

async function disconnect() {
    if (!isConnected) return;

    await mongoose.disconnect().then(() => {
        isConnected = false;
        console.log('Disconnected from MongoDB');
    }).catch((err) => {
        console.log(err);
    });
}

module.exports = { connect, disconnect };

