import cors from 'cors';
import express, { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { db } from './firebase';

const app = express();
const PORT = process.env.PORT || 4001;
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret';

app.use(cors());
app.use(express.json());

// Simple request logger for debugging
app.use((req: Request, _res: Response, next: NextFunction) => {
  // Avoid logging very large bodies
  const bodyString = JSON.stringify(req.body);
  const truncatedBody = bodyString.length > 500 ? bodyString.slice(0, 500) + '...<truncated>' : bodyString;

  console.log('[BACKEND REQUEST]', {
    method: req.method,
    path: req.path,
    query: req.query,
    body: truncatedBody,
    time: new Date().toISOString(),
  });

  next();
});

interface User {
  id: string;
  username: string;
  password: string; // plain text for demo only
  name?: string;
  phone?: string;
  email?: string;
  birthDate?: string;
  gender?: string;
  address?: string;
}

interface Booking {
  id: string;
  userId: string;
  fromAddress: string;
  toAddress: string;

  fromLocation?: { lat: number; lng: number }; // ✅ เพิ่ม
  toLocation?: { lat: number; lng: number };   // ✅ เพิ่ม

  date: string;
  time: string;
  passengerType?: string;
  equipment?: string[];
  status: 'pending' | 'completed' | 'cancelled';
  createdAt: string;
}

interface PaymentRecord {
  id: string;
  method: string;
  amount: number;
  createdAt: string;
}

interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  time: string;
  read: boolean;
  type: 'success' | 'info' | 'promo' | 'default';
  createdAt: string;
}

// Helper to generate simple IDs
const genId = () => Math.random().toString(36).substring(2, 10);

// Auth middleware
interface AuthedRequest extends Request {
  user?: User;
}

const authMiddleware = async (req: AuthedRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Unauthorized' });
  }
  const token = authHeader.slice(7);
  try {
    const payload = jwt.verify(token, JWT_SECRET) as { userId: string };
    const userDoc = await db.collection('users').doc(payload.userId).get();
    if (!userDoc.exists) return res.status(401).json({ message: 'User not found' });
    req.user = { id: userDoc.id, ...userDoc.data() } as User;
    next();
  } catch {
    return res.status(401).json({ message: 'Invalid token' });
  }
};

// Auth routes
app.post('/api/auth/register', async (req: Request, res: Response) => {
  const { email, password, name, phone } = req.body as Partial<User> & { email?: string };
  if (!email || !password) {
    return res.status(400).json({ message: 'email and password are required' });
  }
  const existingUsers = await db.collection('users').where('email', '==', email).get();
  if (!existingUsers.empty) {
    return res.status(409).json({ message: 'Email already exists' });
  }
  const id = genId();
  const baseUsername = email.split('@')[0];
  const username = `${baseUsername}_${Math.random().toString(36).substring(2, 8)}`;
  const userData = {
    username,
    password,
    name: name || '',
    phone: phone || '',
    email,
    createdAt: new Date().toISOString(),
  };
  await db.collection('users').doc(id).set(userData);
  const token = jwt.sign({ userId: id }, JWT_SECRET, { expiresIn: '7d' });
  res.status(201).json({ token, user: { id, username, name, phone, email } });
});

app.post('/api/auth/login', async (req: Request, res: Response) => {
  const { email, password } = req.body as { email?: string; password?: string };
  if (!email || !password) {
    return res.status(400).json({ message: 'email and password are required' });
  }
  console.log('[LOGIN_QUERY]', { email, passwordLength: password.length });
  const usersSnapshot = await db.collection('users').where('email', '==', email).where('password', '==', password).get();
  console.log('[LOGIN_RESULT]', { found: usersSnapshot.size });
  if (usersSnapshot.empty) {
    return res.status(401).json({ message: 'Invalid credentials' });
  }
  const userDoc = usersSnapshot.docs[0];
  const user = { id: userDoc.id, ...userDoc.data() };
  const token = jwt.sign({ userId: userDoc.id }, JWT_SECRET, { expiresIn: '7d' });
  res.json({ token, user });
});

app.post('/api/auth/google', async (req: Request, res: Response) => {
  const { email, name } = req.body as { email?: string; name?: string };
  if (!email) {
    return res.status(400).json({ message: 'Email is required' });
  }
  const existingUsers = await db.collection('users').where('email', '==', email).get();
  let id: string;
  let username: string;
  if (existingUsers.empty) {
    id = genId();
    username = email.split('@')[0];
    await db.collection('users').doc(id).set({
      username,
      password: genId(),
      name: name || '',
      email,
      createdAt: new Date().toISOString(),
    });
  } else {
    const userDoc = existingUsers.docs[0];
    id = userDoc.id;
    username = userDoc.data().username;
  }
  const token = jwt.sign({ userId: id }, JWT_SECRET, { expiresIn: '7d' });
  res.json({ token, user: { id, username, name, email } });
});

app.post('/api/auth/forgot-password', async (req: Request, res: Response) => {
  const { email } = req.body as { email?: string };
  if (!email) {
    return res.status(400).json({ message: 'Email is required' });
  }
  const usersSnapshot = await db.collection('users').where('email', '==', email).get();
  if (usersSnapshot.empty) {
    return res.status(404).json({ message: 'Email not found' });
  }
  console.log(`[FORGOT_PASSWORD] Reset link would be sent to: ${email}`);
  res.json({ message: 'Password reset link sent to email' });
});

app.get('/api/auth/me', authMiddleware, async (req: AuthedRequest, res: Response) => {
  const user = req.user!;
  const userDoc = await db.collection('users').doc(user.id).get();
  const u = userDoc.exists ? { id: userDoc.id, ...userDoc.data() } : user;
  res.json(u);
});

// User profile
app.put('/api/users/me', authMiddleware, async (req: AuthedRequest, res: Response) => {
  const user = req.user!;
  const { name, phone, email, birthDate, gender, address } = req.body as Partial<User>;
  const updateData: any = {};
  if (name !== undefined) updateData.name = name;
  if (phone !== undefined) updateData.phone = phone;
  if (email !== undefined) updateData.email = email;
  if (birthDate !== undefined) updateData.birthDate = birthDate;
  if (gender !== undefined) updateData.gender = gender;
  if (address !== undefined) updateData.address = address;
  await db.collection('users').doc(user.id).update(updateData);
  const updatedDoc = await db.collection('users').doc(user.id).get();
  res.json({ message: 'Profile updated', user: { id: updatedDoc.id, ...updatedDoc.data() } });
});

// Bookings
app.post('/api/bookings', authMiddleware, async (req: AuthedRequest, res: Response) => {
  const {
    fromAddress,
    toAddress,
    date,
    time,
    passengerType,
    equipment,
    fromLocation,   // ✅ เพิ่ม
    toLocation      // ✅ เพิ่ม
  } = req.body;

  if (!fromAddress || !toAddress || !date || !time) {
    return res.status(400).json({ message: 'fromAddress, toAddress, date, time are required' });
  }

  const id = genId();

  const bookingData = {
    userId: req.user!.id,
    fromAddress,
    toAddress,

    // ✅ เพิ่ม lat lng
    fromLocation: fromLocation || null,
    toLocation: toLocation || null,

    date,
    time,
    passengerType: passengerType || '',
    equipment: equipment || [],
    status: 'upcoming' as const,
    createdAt: new Date().toISOString(),
  };

  await db.collection('bookings').doc(id).set(bookingData);

  res.status(201).json({ id, ...bookingData });
});

app.get('/api/bookings', authMiddleware, async (req: AuthedRequest, res: Response) => {
  const statusFilter = req.query.status as string | undefined;
  let query = db.collection('bookings').where('userId', '==', req.user!.id);
  if (statusFilter && ['upcoming', 'completed', 'cancelled'].includes(statusFilter)) {
    query = query.where('status', '==', statusFilter);
  }
  const snapshot = await query.get();
  const bookings = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  res.json(bookings);
});

app.get('/api/bookings/:id', authMiddleware, async (req: AuthedRequest, res: Response) => {
  const bookingDoc = await db.collection('bookings').doc(req.params.id).get();
  if (!bookingDoc.exists || bookingDoc.data()?.userId !== req.user!.id) {
    return res.status(404).json({ message: 'Booking not found' });
  }
  res.json({ id: bookingDoc.id, ...bookingDoc.data() });
});

app.put('/api/bookings/:id', authMiddleware, async (req: AuthedRequest, res: Response) => {
  const { fromAddress, toAddress, date, time, passengerType, equipment, status } = req.body as Partial<Booking>;
  if (status && !['upcoming', 'completed', 'cancelled'].includes(status)) {
    return res.status(400).json({ message: 'Invalid status' });
  }
  const bookingDoc = await db.collection('bookings').doc(req.params.id).get();
  if (!bookingDoc.exists || bookingDoc.data()?.userId !== req.user!.id) {
    return res.status(404).json({ message: 'Booking not found' });
  }
  const updateData: any = {};
  if (fromAddress !== undefined) updateData.fromAddress = fromAddress;
  if (toAddress !== undefined) updateData.toAddress = toAddress;
  if (date !== undefined) updateData.date = date;
  if (time !== undefined) updateData.time = time;
  if (passengerType !== undefined) updateData.passengerType = passengerType;
  if (equipment !== undefined) updateData.equipment = equipment;
  if (status !== undefined) updateData.status = status;
  if (Object.keys(updateData).length === 0) return res.json({ message: 'No changes' });
  await db.collection('bookings').doc(req.params.id).update(updateData);
  const updatedDoc = await db.collection('bookings').doc(req.params.id).get();
  res.json({ id: updatedDoc.id, ...updatedDoc.data() });
});

app.delete('/api/bookings/:id', authMiddleware, async (req: AuthedRequest, res: Response) => {
  const bookingDoc = await db.collection('bookings').doc(req.params.id).get();
  if (!bookingDoc.exists || bookingDoc.data()?.userId !== req.user!.id) {
    return res.status(404).json({ message: 'Booking not found' });
  }
  await db.collection('bookings').doc(req.params.id).delete();
  res.status(204).send();
});

// Payments (no auth for demo)
app.post('/api/payments', async (req: Request, res: Response) => {
  const { method, amount } = req.body as { method?: string; amount?: number };
  if (!method) {
    return res.status(400).json({ message: 'method is required' });
  }
  const id = genId();
  const paymentData = {
    method,
    amount: typeof amount === 'number' ? amount : 0,
    createdAt: new Date().toISOString(),
  };
  await db.collection('payments').doc(id).set(paymentData);
  res.status(201).json({ id, ...paymentData });
});

// Notifications
app.get('/api/notifications', authMiddleware, async (req: AuthedRequest, res: Response) => {
  const snapshot = await db.collection('notifications').where('userId', '==', req.user!.id).orderBy('createdAt', 'desc').get();
  const notifications = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  res.json(notifications);
});

app.post('/api/notifications', authMiddleware, async (req: AuthedRequest, res: Response) => {
  const { title, message, type } = req.body as { title?: string; message?: string; type?: Notification['type'] };
  if (!title || !message) {
    return res.status(400).json({ message: 'title and message are required' });
  }
  const id = genId();
  const notificationData = {
    userId: req.user!.id,
    title,
    message,
    time: 'เมื่อสักครู่',
    read: false,
    type: type || 'default',
    createdAt: new Date().toISOString(),
  };
  await db.collection('notifications').doc(id).set(notificationData);
  res.status(201).json({ id, ...notificationData });
});

app.put('/api/notifications/:id/read', authMiddleware, async (req: AuthedRequest, res: Response) => {
  const notifDoc = await db.collection('notifications').doc(req.params.id).get();
  if (!notifDoc.exists || notifDoc.data()?.userId !== req.user!.id) {
    return res.status(404).json({ message: 'Notification not found' });
  }
  await db.collection('notifications').doc(req.params.id).update({ read: true });
  const updatedDoc = await db.collection('notifications').doc(req.params.id).get();
  res.json({ id: updatedDoc.id, ...updatedDoc.data() });
});

app.put('/api/notifications/mark-all-read', authMiddleware, async (req: AuthedRequest, res: Response) => {
  const unreadSnapshot = await db.collection('notifications').where('userId', '==', req.user!.id).where('read', '==', false).get();
  const batch = db.batch();
  unreadSnapshot.docs.forEach(doc => {
    batch.update(doc.ref, { read: true });
  });
  await batch.commit();
  res.json({ message: 'All notifications marked as read' });
});

app.get('/', (_req: Request, res: Response) => {
  res.json({ message: 'SAFEPath demo backend running' });
});

app.listen(PORT, () => {
  console.log(`Backend server running on http://localhost:${PORT}`);
});
