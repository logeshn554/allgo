import { createDispatchServer } from './server.js';

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3001;
const { server } = createDispatchServer();

server.listen(PORT, () => {
  console.log(`[AllGo Dispatch Service] listening on port ${PORT}`);
});
