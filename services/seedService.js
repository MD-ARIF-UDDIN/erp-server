import User from '../models/User.js';

export const seedAdminUser = async () => {
    try {
        const userCount = await User.countDocuments();

        if (userCount === 0) {
            const admin = await User.create({
                name: process.env.ADMIN_NAME || 'Admin',
                email: process.env.ADMIN_EMAIL || 'admin@business.com',
                password: process.env.ADMIN_PASSWORD || 'admin123',
                phone: process.env.ADMIN_PHONE || '01700000000',
                role: 'admin'
            });

            console.log('✅ Admin user created successfully');
            console.log(`Email: ${admin.email}`);
            console.log(`Password: ${process.env.ADMIN_PASSWORD || 'admin123'}`);
        } else {
            console.log('ℹ️  Admin user already exists, skipping seed');
        }
    } catch (error) {
        console.error('❌ Error seeding admin user:', error.message);
    }
};
