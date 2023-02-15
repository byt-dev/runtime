import { handler } from './handler.js';

const payload = {
  name: 'John Doe',
  age: 42,
};

export default await handler(payload);