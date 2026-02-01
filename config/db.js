import mongoose from 'mongoose';

const connectDB = async () => {
  try {
    console.log('Connecting to MongoDB...');
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`MongoDB Connection Error!`);
    console.error(`Error Name: ${error.name}`);
    console.error(`Error Message: ${error.message}`);

    if (error.message.includes('SSL routines') || error.message.includes('tlsv1 alert')) {
      console.error('\n--- TROUBLESHOOTING TIP ---');
      console.error('This error usually means MongoDB Atlas rejected the connection.');
      console.error('1. Check if your IP address is whitelisted in MongoDB Atlas.');
      console.error(`   Your current public IP seems to be: 103.204.211.198`);
      console.error('2. Ensure your connection string in .env is correct.');
      console.error('3. Check if your network/firewall blocks port 27017.\n');
    }

    process.exit(1);
  }
};

export default connectDB;
