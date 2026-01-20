# YLStack Admin Dashboard

The admin dashboard is a SvelteKit SPA that provides a responsive UI for managing the YLStack platform.

## Features

- **User Management**: Create, edit, and delete users
- **Plugin Management**: Install, configure, and manage plugins
- **Settings**: Configure platform settings
- **Authentication**: JWT-based authentication
- **Responsive Design**: Mobile-friendly UI
- **Type-Safe**: Full TypeScript support

## Development Setup

### Prerequisites

- Node.js 18+
- Bun (package manager)
- Backend API running on port 3000

### Installation

```bash
cd packages/admin
bun install
```

### Development

```bash
bun run dev
```

The admin dashboard will be available at `http://localhost:5173`

### Building

```bash
bun run build
```

The build output will be in the `build` directory.

### Type Checking

```bash
bun run check
```

## Architecture

### Directory Structure

```
src/
├── lib/
│   ├── api/
│   │   └── client.ts       # API client for backend communication
│   ├── auth/
│   │   └── store.ts        # Svelte auth store with localStorage
│   ├── components/
│   │   ├── Button.svelte   # Reusable button component
│   │   ├── Input.svelte    # Form input component
│   │   ├── Card.svelte     # Card container
│   │   ├── Modal.svelte    # Modal dialog
│   │   ├── Sidebar.svelte   # Navigation sidebar
│   │   └── TopNav.svelte   # Top navigation bar
│   └── layouts/
│       └── MainLayout.svelte # Main layout with sidebar
└── routes/
    ├── +layout.ts           # Root layout loader
    ├── login/+page.svelte   # Login page
    ├── +page.svelte         # Dashboard
    ├── admin/
    │   ├── users/+page.svelte      # User management
    │   ├── plugins/+page.svelte    # Plugin management
    │   └── settings/+page.svelte   # Settings
```

## API Client

The API client handles communication with the backend:

```typescript
import { api } from '$lib/api/client';

// GET request
const data = await api.get('/api/users');

// POST request
const result = await api.post('/auth/login', {
  email: 'user@example.com',
  password: 'password',
});

// PUT request
await api.put('/api/users/1', { name: 'Updated Name' });

// DELETE request
await api.delete('/api/users/1');
```

### Features

- Automatic token injection
- 401 redirect to login
- Request/response interceptors
- Error handling

## Auth Store

Svelte store for authentication state management:

```typescript
import { auth, user, isAuthenticated } from '$lib/auth/store';

// Initialize
await auth.initialize();

// Login
await auth.login('user@example.com', 'password');

// Logout
await auth.logout();

// Subscribe to changes
user.subscribe(currentUser => {
  console.log('Current user:', currentUser);
});

// Derived stores
if ($isAuthenticated) {
  console.log('User is logged in');
}
```

### Features

- localStorage persistence
- Automatic token refresh
- Login/logout functions
- User state management

## Components

### Button

```svelte
<Button variant="primary" on:click={handleClick}>
  Click Me
</Button>

<Button variant="secondary" loading={true}>
  Loading...
</Button>

<Button variant="danger" on:click={handleDelete}>
  Delete
</Button>
```

### Input

```svelte
<Input
  type="email"
  label="Email Address"
  placeholder="you@example.com"
  bind:value={email}
  error={errorMessage}
  required
/>
```

### Card

```svelte
<Card title="Card Title">
  <p>Card content goes here</p>
</Card>
```

### Modal

```svelte
<Modal bind:open={showModal} title="Modal Title">
  <p>Modal content</p>
</Modal>
```

## Layouts

### MainLayout

Main layout with sidebar and top navigation:

```svelte
<script>
  import MainLayout from '$lib/layouts/MainLayout.svelte';
</script>

<MainLayout>
  <h1>Page Content</h1>
</MainLayout>
```

## Route Protection

Protected routes check authentication and roles:

```typescript
// +page.ts or +layout.ts
export const load = async () => {
  if (!$isAuthenticated) {
    throw redirect(302, '/login');
  }

  return { data: '...' };
};
```

## Styling

Uses Tailwind CSS with custom configuration:

```javascript
// tailwind.config.js
export default {
  theme: {
    extend: {
      colors: {
        primary: {
          500: '#3b82f6',
          // ...
        },
      },
    },
  },
  darkMode: 'class',
};
```

### Dark Mode

Toggle dark mode:

```typescript
document.documentElement.classList.toggle('dark');
```

## Environment Variables

Create `.env` file:

```bash
VITE_API_URL=http://localhost:3000
```

## Building for Production

1. Build the admin dashboard:
```bash
bun run build
```

2. Serve the `build` directory with your web server

3. Configure reverse proxy (nginx example):

```nginx
location / {
  root /path/to/build;
  try_files $uri $uri/ /index.html;
}

location /api {
  proxy_pass http://localhost:3000;
}
```

## Testing

```bash
bun run test
```

## Component Patterns

### Loading States

```svelte
<script>
  let loading = false;

  async function loadData() {
    loading = true;
    await api.get('/data');
    loading = false;
  }
</script>

{#if loading}
  <p>Loading...</p>
{:else}
  <p>Data loaded</p>
{/if}
```

### Error Handling

```svelte
<script>
  let error = '';

  async function handleSubmit() {
    error = '';
    try {
      await api.post('/endpoint', data);
    } catch (err: any) {
      error = err.message;
    }
  }
</script>

{#if error}
  <div class="error">{error}</div>
{/if}
```

### Form Validation

```svelte
<script>
  let form = {
    name: '',
    email: '',
  };

  let errors = {
    name: '',
    email: '',
  };

  function validate() {
    errors.name = form.name ? '' : 'Name is required';
    errors.email = form.email.includes('@') ? '' : 'Invalid email';
    return !errors.name && !errors.email;
  }
</script>

<form on:submit|preventDefault={handleSubmit}>
  <Input bind:value={form.name} error={errors.name} />
  <Input bind:value={form.email} error={errors.email} />
  <Button type="submit">Submit</Button>
</form>
```

## Adding New Pages

1. Create page component:
```bash
mkdir src/routes/admin/new-page
touch src/routes/admin/new-page/+page.svelte
```

2. Add to sidebar navigation:
```svelte
<!-- Sidebar.svelte -->
const navigation = [
  // ...
  { path: '/admin/new-page', label: 'New Page' },
];
```

3. Add route protection if needed:
```typescript
export const load = async () => {
  if (!$isAdmin) {
    throw redirect(302, '/');
  }
};
```

## Deployment

### Static Hosting

Deploy the `build` directory to any static hosting service:

- Vercel
- Netlify
- Cloudflare Pages
- GitHub Pages
- AWS S3 + CloudFront

### Docker

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package.json bun.lockb ./
RUN npm install -g bun
RUN bun install
COPY . .
RUN bun run build

FROM nginx:alpine
COPY --from=0 /app/build /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

### CI/CD

Example GitHub Actions:

```yaml
name: Deploy
on:
  push:
    branches: [main]
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Setup Bun
        uses: oven-sh/setup-bun@v1
      - name: Install dependencies
        run: bun install
      - name: Build
        run: bun run build
      - name: Deploy
        run: # Deploy to your hosting
```

## Performance Optimization

1. **Code Splitting**: Use dynamic imports for large components
2. **Image Optimization**: Use Next.js Image equivalent or optimize manually
3. **Lazy Loading**: Load routes and components on demand
4. **Caching**: Leverage browser caching for static assets
5. **Bundle Analysis**: Use `bunx vite-bundle-visualizer`

## Accessibility

Ensure components follow WCAG 2.1 AA:

- Semantic HTML elements
- ARIA labels where needed
- Keyboard navigation
- Focus management
- Color contrast ratios

## Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

For older browsers, add polyfills.

## Troubleshooting

### Build Fails

```bash
# Clear cache
rm -rf .svelte-kit node_modules
bun install
bun run build
```

### API Errors

1. Check backend is running
2. Verify API_URL in .env
3. Check browser console for errors
4. Review network tab for failed requests

### Styling Issues

```bash
# Rebuild Tailwind
bun run build
```

## Support

For issues or questions, refer to the main YLStack README.
