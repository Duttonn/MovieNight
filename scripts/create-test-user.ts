// Load environment variables
import { config } from 'dotenv';
config();

import { storage } from '../server/storage';
import { scrypt, randomBytes } from 'crypto';
import { promisify } from 'util';

const scryptAsync = promisify(scrypt);

// Verify we're connecting to the right database
console.log('DATABASE_URL:', process.env.DATABASE_URL);

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString('hex');
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString('hex')}.${salt}`;
}

async function createTestUser() {
  try {
    // Check if test user already exists
    const existingUser = await storage.getUserByUsername('testuser');
    
    if (existingUser) {
      console.log('Test user already exists:', existingUser.username);
      process.exit(0);
    }
    
    // Create test user
    const hashedPassword = await hashPassword('password123');
    
    const newUser = await storage.createUser({
      username: 'testuser',
      passwordHash: hashedPassword, // Use the correct field name from the schema
      email: 'test@example.com',
      name: 'Test User'
    });
    
    // Remove sensitive data for logging
    const { passwordHash, ...userWithoutPassword } = newUser;
    console.log('Test user created successfully:', userWithoutPassword);
    
  } catch (error) {
    console.error('Error creating test user:', error);
  } finally {
    process.exit(0);
  }
}

// Run the function
createTestUser();