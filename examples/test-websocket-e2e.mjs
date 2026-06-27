import { io } from 'socket.io-client';

const AUTH_URL = process.env.AUTH_URL || 'http://localhost:4001';
const TASK_URL = process.env.TASK_URL || 'http://localhost:4003';
const WS_URL = process.env.WS_URL || 'http://localhost:4004/notifications';
const EMAIL = process.env.TEST_EMAIL || `ws-test-${Date.now()}@example.com`;
const PASSWORD = process.env.TEST_PASSWORD || 'password123';

function waitForEvent(socket, event, timeoutMs = 15000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`Timed out waiting for '${event}' after ${timeoutMs}ms`));
    }, timeoutMs);

    socket.once(event, (payload) => {
      clearTimeout(timer);
      resolve(payload);
    });
  });
}

async function main() {
  console.log('1) Registering user...');
  const registerRes = await fetch(`${AUTH_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
  });

  if (!registerRes.ok && registerRes.status !== 409) {
    throw new Error(`Register failed: ${registerRes.status} ${await registerRes.text()}`);
  }

  console.log('2) Logging in...');
  const loginRes = await fetch(`${AUTH_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
  });

  if (!loginRes.ok) {
    throw new Error(`Login failed: ${loginRes.status} ${await loginRes.text()}`);
  }

  const login = await loginRes.json();
  const token = login.accessToken;

  if (!token) {
    throw new Error('No accessToken in login response');
  }

  console.log('3) Connecting WebSocket...');
  const socket = io(WS_URL, {
    transports: ['websocket'],
    auth: { token },
  });

  const connected = await waitForEvent(socket, 'connected');
  console.log('   connected:', connected);

  const notificationPromise = waitForEvent(socket, 'notification');

  console.log('4) Creating task (Kafka -> notification -> WebSocket)...');
  const taskRes = await fetch(`${TASK_URL}/tasks`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      title: 'WebSocket E2E test task',
      description: 'Triggered from examples/test-websocket-e2e.mjs',
    }),
  });

  if (!taskRes.ok) {
    socket.disconnect();
    throw new Error(`Create task failed: ${taskRes.status} ${await taskRes.text()}`);
  }

  const task = await taskRes.json();
  console.log('   task created:', task.id);

  const notification = await notificationPromise;
  console.log('5) Notification received via WebSocket:');
  console.log(JSON.stringify(notification, null, 2));

  socket.disconnect();
  console.log('\n✅ WebSocket end-to-end test passed');
}

main().catch((error) => {
  console.error('\n❌ WebSocket end-to-end test failed');
  console.error(error.message || error);
  process.exit(1);
});
