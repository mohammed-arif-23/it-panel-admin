import { MongoClient, MongoClientOptions } from 'mongodb';

const uri = process.env.MONGODB_URI;
const dbName = process.env.DB_NAME || 'college_results';

if (!uri) {
  throw new Error('Please add your MongoDB URI to .env.local');
}

const options: MongoClientOptions = {
  maxPoolSize: 10,
  minPoolSize: 1,
  maxIdleTimeMS: 10000,
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
  retryWrites: true,
  w: 'majority',
  readPreference: 'primary',
};

let client: MongoClient;
let clientPromise: Promise<MongoClient>;

if (process.env.NODE_ENV === 'development') {
  // In development mode, use a global variable so the client is not recreated on every hot reload
  let globalWithMongo = global as typeof globalThis & {
    _mongoClientPromise?: Promise<MongoClient>;
  };

  if (!globalWithMongo._mongoClientPromise) {
    client = new MongoClient(uri, options);
    globalWithMongo._mongoClientPromise = client.connect();
  }
  clientPromise = globalWithMongo._mongoClientPromise;
} else {
  // In production mode, it's best to not use a global variable
  client = new MongoClient(uri, options);
  clientPromise = client.connect();
}

export async function getDatabase() {
  try {
    const client = await clientPromise;
    return client.db(dbName);
  } catch (error) {
    console.error('Failed to connect to MongoDB:', error);
    throw new Error('Database connection failed');
  }
}

export async function getCollection(collectionName: string) {
  try {
    const db = await getDatabase();
    return db.collection(collectionName);
  } catch (error) {
    console.error(`Failed to get collection ${collectionName}:`, error);
    throw new Error(`Collection ${collectionName} access failed`);
  }
}

// Health check function
export async function checkDatabaseConnection(): Promise<boolean> {
  try {
    const client = await clientPromise;
    await client.db('admin').command({ ping: 1 });
    return true;
  } catch (error) {
    console.error('Database health check failed:', error);
    return false;
  }
}
