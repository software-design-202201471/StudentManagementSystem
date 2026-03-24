import { connectDB } from '@/lib/mongoose';

export async function GET() {
  try {
    await connectDB();
    return Response.json({ status: 'ok', db: 'connected' });
  } catch (error) {
    return Response.json({ status: 'error', message: error.message }, { status: 500 });
  }
}