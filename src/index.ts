import { Elysia } from 'elysia';
import { staticPlugin } from '@elysiajs/static';
import { swagger } from '@elysiajs/swagger';

const app = new Elysia()
    .use(swagger())
    // API Routes
    .get('/api/hello', () => ({
        message: 'Hello from Elysia!',
        timestamp: new Date().toISOString()
    }))

    .get('/api/users', () => [
        { id: 1, name: 'Alice', email: 'alice@example.com' },
        { id: 2, name: 'Bob', email: 'bob@example.com' },
        { id: 3, name: 'Charlie', email: 'charlie@example.com' }
    ])

    .post('/api/users', ({ body }) => {
        return {
            success: true,
            user: body,
            id: Math.random().toString(36).substr(2, 9)
        };
    })

    .get('/api/data/:id', ({ params: { id } }) => ({
        id,
        data: `Data for item ${id}`,
        fetched: new Date().toISOString()
    }))

    .use(staticPlugin({
        assets: 'dist',
        prefix: '/',
        indexHTML: true
    }))

    .listen(3000);

console.log(`🦊 Elysia + Svelte running at http://localhost:3000`);

export type App = typeof app;