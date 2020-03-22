require('dotenv').config();
const MongoClient = require('mongodb').MongoClient;

const url = `mongodb://${ process.env.MONGODB_USERNAME }:${ process.env.MONGODB_PASSWORD }@${ process.env.MONGODB_HOST }:${ process.env.MONGODB_PORT }`;
const dbName = process.env.MONGODB_DEFAULTDB;

const listCollections = async () => {
    const client = new MongoClient(url, {
        useUnifiedTopology: true,
        useNewUrlParser: true,
    });
    let docs = [];
    try {
        await client.connect();
        const db = client.db(dbName);
        docs = await db.listCollections().toArray();
    } catch(err) {
        console.error(err);
    } finally {
        client.close();
    }
    return docs;
}

const findFromCollection = async (collection, options) => {
    const client = new MongoClient(url, {
        useUnifiedTopology: true,
        useNewUrlParser: true,
    });
    let docs = [];
    try {
        await client.connect();
        const db = client.db(dbName);
        const col = db.collection(collection);
        docs = await col.find(options).toArray();
    } catch(err) {
        console.error(err);
        throw err;
    } finally {
        client.close();
    }
    return docs;
}

const insertToCollection = async (collection, optionsArr) => {
    const client = new MongoClient(url, {
        useUnifiedTopology: true,
        useNewUrlParser: true,
    });

    let result = null;
    try {
        await client.connect();
        const db = client.db(dbName);
        result = await db.collection(collection).insertMany(
            optionsArr
        );
    } catch(err) {
        console.error(err);
        throw err;
    } finally {
        client.close();
    }

    return result;
}

const updateFromCollection = async (collection, options, many = false) => {
    const client = new MongoClient(url, {
        useUnifiedTopology: true,
        useNewUrlParser: true,
    });

    const { findOptions, setOptions } = options;

    let result = null;
    try {
        await client.connect();
        const db = client.db(dbName);
        if(many) {
            result = await db.collection(collection).updateMany(
                findOptions,
                { $set: setOptions }
            );
        } else {
            result = await db.collection(collection).updateOne(
                findOptions,
                { $set: setOptions }
            );
        }  
    } catch(err) {
        console.error(err);
        throw err;
    } finally {
        client.close();
    }

    return result;
}

const deleteFromCollection = async (collection, options, many = false) => {
    const client = new MongoClient(url, {
        useUnifiedTopology: true,
        useNewUrlParser: true
    });

    let result = null;
    try {
        await client.connect();
        const db = client.db(dbName);
        if(many) {
            result = await db.collection(collection).deleteMany(options);
        } else {
            result = await db.collection(collection).deleteOne(options);
        }
    } catch(err) {
        console.error(err);
        throw err;
    }

    return result;
}

const aggregateFromCollection = async (collection, pipeline) => {
    const client = new MongoClient(url, {
        useUnifiedTopology: true,
        useNewUrlParser: true
    });

    let result = null;
    try {
        await client.connect();
        const db = client.db(dbName);
        result = await db.collection(collection).aggregate(pipeline);
    } catch(err) {
        console.error(err);
        throw err;
    }

    // console.log(result);
    return result.toArray();
}

module.exports = {
    listCollections,
    findFromCollection,
    insertToCollection,
    updateFromCollection,
    deleteFromCollection,
    aggregateFromCollection
}