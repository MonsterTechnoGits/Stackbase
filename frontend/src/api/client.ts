import { client } from '@/api/generated/client.gen';

// Configure the generated SDK client once here — the only place that sets baseUrl/credentials.
// All services import from api/generated/ via the services layer; nothing calls this file directly.
client.setConfig({
  baseUrl: process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:44300',
  credentials: 'include',
});

export { client };
