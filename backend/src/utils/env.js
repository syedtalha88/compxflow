/**
 * Startup environment validator.
 * Crashes the process with a clear message if required env vars are missing.
 * Must be called AFTER dotenv.config() and BEFORE anything else.
 */
export function validateEnv() {
  const required = [
    'JWT_SECRET',
    'MONGODB_URI',
    'SUPER_ADMIN_KEY',
    'CLOUDINARY_CLOUD_NAME',
    'CLOUDINARY_API_KEY',
    'CLOUDINARY_API_SECRET',
    'GOOGLE_VISION_API_KEY'
  ];

  const missing = required.filter((key) => !process.env[key] || process.env[key].trim() === '');

  if (missing.length > 0) {
    console.error('──────────────────────────────────────────────');
    console.error('FATAL: Missing required environment variables:');
    missing.forEach((key) => console.error(`  • ${key}`));
    console.error('──────────────────────────────────────────────');
    console.error('Server cannot start. Set these in your .env file.');
    process.exit(1);
  }

  // Warn if JWT_SECRET looks like the example/default value
  if (process.env.JWT_SECRET === 'factflow_super_secret_jwt_key_min_32_chars_long') {
    console.warn('⚠ WARNING: JWT_SECRET is set to the example value. Change it to a strong random secret for production.');
  }
}

export default validateEnv;
