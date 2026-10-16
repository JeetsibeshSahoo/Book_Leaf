import express from 'express';
import cors from 'cors';
import authRoutes from './routes/auth.routes.js';
import bookRoutes from './routes/book.routes.js';
import ticketRoutes from './routes/ticket.routes.js';
import adminRoutes from './routes/admin.routes.js';
import { errorHandler, notFoundHandler } from './middlewares/error.middleware.js';

const app = express();

// 1. GLOBAL MIDDLEWARES
// Enable CORS for frontend applications (allowing localhost and standard ports)
app.use(
  cors({
    origin: true, // Reflects origin, allowing local development across any port
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

// Parse JSON request payloads
app.use(express.json({ limit: '10mb' }));

// Parse URL-encoded form data
app.use(express.urlencoded({ extended: true, limit: '10mb' }));


// 2. HEALTH CHECK & ROOT ENDPOINTS
app.get('/health', (req, res) => {
  return res.status(200).json({
    status: 'healthy',
    service: 'BookLeaf Author Support API',
    timestamp: new Date().toISOString(),
  });
});

app.get('/', (req, res) => {
  return res.status(200).json({
    name: 'BookLeaf Author Support & Communication Portal API',
    version: '1.0.0',
    documentation: '/api/docs',
    healthCheck: '/health',
  });
});


// 3. API ROUTE REGISTRATION

app.use('/api/auth', authRoutes);
app.use('/api/books', bookRoutes);
app.use('/api/tickets', ticketRoutes);
app.use('/api/admin', adminRoutes);


// 4. 404 NOT FOUND & GLOBAL ERROR HANDLER
// Catch any route that doesn't match above
app.use(notFoundHandler);

// Centralized error handler returning uniform JSON payloads
app.use(errorHandler);

export default app;