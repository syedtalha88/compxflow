import dotenv from 'dotenv';
import { validateEnv } from './utils/env.js';
import app from './app.js';
import connectDB from './config/db.js';

dotenv.config();
validateEnv();

const PORT = process.env.PORT || 5000;

// Connect to Database and start server
connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
  });
}).catch((error) => {
  console.error('Failed to start server:', error);
});
