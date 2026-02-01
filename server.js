import dotenv from 'dotenv';
import app from './app.js';
import connectDB from './config/db.js';
import { seedAdminUser } from './services/seedService.js';

dotenv.config();

const PORT = process.env.PORT || 5000;

// Connect to database and start server
const startServer = async () => {
    try {
        await connectDB();

        // Seed admin user (runs only once)
        await seedAdminUser();

        app.listen(PORT, () => {
            console.log(`🚀 Server running on port ${PORT}`);
            console.log(`📱 Environment: ${process.env.NODE_ENV || 'development'}`);
        });
    } catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
};

startServer();
