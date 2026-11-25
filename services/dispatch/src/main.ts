import { validateDispatchEnv } from '@allgo/env';
import { createDispatchServer } from './server.js';

const env = validateDispatchEnv(process.env);
const { server } = createDispatchServer();

server.listen(env.PORT, () => {
  console.log(`[AllGo Dispatch Service] listening on port ${env.PORT} (${env.NODE_ENV})`);
});
