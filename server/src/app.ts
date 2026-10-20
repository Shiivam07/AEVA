import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import path from 'path';

import { authRouter } from './routes/auth.routes';
import { usersRouter } from './routes/users.routes';
import { businessRouter } from './routes/business.routes';
import { brandsRouter } from './routes/brands.routes';
import { productsRouter } from './routes/products.routes';
import { orderingIdsRouter } from './routes/orderingIds.routes';
import { ordersRouter } from './routes/orders.routes';
import { tasksRouter } from './routes/tasks.routes';
import { peopleRouter } from './routes/people.routes';
import { financialsRouter } from './routes/financials.routes';
import { distributionsRouter } from './routes/distributions.routes';
import { notificationsRouter } from './routes/notifications.routes';
import { reportsRouter } from './routes/reports.routes';
import { adminRouter } from './routes/admin.routes';
import { errorHandler } from './middleware/errorHandler';
import { notFound } from './middleware/notFound';

const app = express();

// Security & parsing middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true,
}));
app.use(morgan('dev'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Static file serving for uploads
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

// API Routes
app.use('/api/auth', authRouter);
app.use('/api/users', usersRouter);
app.use('/api/businesses', businessRouter);
app.use('/api/brands', brandsRouter);
app.use('/api/products', productsRouter);
app.use('/api/ordering-ids', orderingIdsRouter);
app.use('/api/orders', ordersRouter);
app.use('/api/tasks', tasksRouter);
app.use('/api/people', peopleRouter);
app.use('/api/financials', financialsRouter);
app.use('/api/distributions', distributionsRouter);
app.use('/api/notifications', notificationsRouter);
app.use('/api/reports', reportsRouter);
app.use('/api/admin', adminRouter);

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use(notFound);
app.use(errorHandler);

export default app;
