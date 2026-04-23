const mongoose = require('mongoose');

const connectDB = async () => {
  const uri = process.env.MONGO_URI;

  if (!uri) {
    console.error('MONGO_URI is not defined in .env');
    process.exit(1);
  }

  if (uri.includes('localhost') || uri.includes('127.0.0.1')) {
    console.warn('Using local MongoDB. If connection fails, use a MongoDB Atlas URI instead.');
  }

  try {
    mongoose.set('strictQuery', false);
    const conn = await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
    });
    console.log(`MongoDB Connected`);
  } catch (error) {
    console.error(`MongoDB connection error: ${error.message}`);
    if (error.message.includes('ECONNREFUSED')) {
      console.error('Fix: Update MONGO_URI in server/.env to your MongoDB Atlas connection string.');
    }
    process.exit(1);
  }
};

module.exports = connectDB;
