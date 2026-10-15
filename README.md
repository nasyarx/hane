# Web App Template (tRPC + Better Auth + Database)

This template gives you a React 19 + Tailwind 4 + Express 4 + tRPC 11 stack with Better Auth already wired. Procedures are your contracts, types flow end to end, and authentication "just works".

---

## Quick Facts

- **tRPC-first:** define procedures in `server/routers.ts`, consume them with `trpc.*` hooks.
- **Superjson out of the box:** return Drizzle rows directly—`Date` stays a `Date`.
- **Auth baked in:** Better Auth handles authentication via `/api/auth/*`, `protectedProcedure` injects `ctx.user`.
- **Gateway-ready:** all RPC traffic is under `/api/trpc`, making it easy to route at the edge.

---

## Build Loop

1. Update schema in `drizzle/schema.ts`, then run `pnpm db:push`.
2. Add database helpers in `server/db.ts` (return raw results).
3. Add or extend procedures in `server/routers.ts`, then wire the UI with `trpc.*.useQuery/useMutation`.
4. Build frontend experience according to `Frontend Workflow`.
5. Cover your changes with Vitest specs inside `server/*.test.ts` (see `server/auth.logout.test.ts`) and run `pnpm test`.

That's it—no manual REST routes, no Axios client, no shared contract files.

---

## File Structure

```
client/
  public/         ← Static assets copied verbatim to '/'
  src/
    pages/        ← Page-level components
    components/   ← Reusable UI & shadcn/ui
    contexts/     ← React contexts
    hooks/        ← Custom hooks
    lib/trpc.ts   ← tRPC client
    lib/upload.ts ← File upload helper (uploadFile, deleteFile)
    App.tsx       ← Routes & layout
    main.tsx      ← Providers
    index.css     ← global style
drizzle/          ← Schema & migrations
server/
  db.ts           ← Query helpers
  routers.ts      ← tRPC procedures
  storage.ts      ← R2 file storage (upload, delete, signed URLs)
  _core/upload.ts ← POST /api/upload endpoint (multipart)
  auth.logout.test.ts ← Reference sample vitest test file
shared/           ← Shared constants & types
```

Only touch the files under "←" markers. Anything under `server/_core` or other tooling directories is framework-level—avoid editing unless you are extending the infrastructure.

Assets placed under `client/public` are served with aggressive caching, so add a content hash to filenames (for example, `asset.3fa9b2e4.svg`) whenever you replace a file and update its references to avoid stale assets. Files in `client/public` are available at the root of your site—reference them with absolute paths (`/asset.3fa9b2e4.svg`, `/robots.txt`, etc.).

---

## Authentication Flow

- Better Auth handles authentication via `/api/auth/*` endpoints (sign-up, sign-in, sign-out, sessions).
- Supports email/password out of the box, with optional Google and GitHub OAuth providers.
- Each request to `/api/trpc` builds context via `server/_core/context.ts`, making the current user available as `ctx.user`.
- Wrap protected logic in `protectedProcedure`; public access uses `publicProcedure`.
- Frontend reads auth state with `useAuth()` hook from `@/lib/hooks/useAuth`.

---

## Environment Variables

Available pre-defined system envs:

- `DATABASE_URL`: PostgreSQL connection string
- `BETTER_AUTH_SECRET`: Session/cookie encryption secret (auto-generated)
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`: Optional Google OAuth credentials
- `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`: Optional GitHub OAuth credentials
- `TRUSTED_ORIGINS`: Comma-separated list of trusted origins for CORS

Do not edit these directly in code or commit `.env` files.
When using env in website code, refer to `server/_core/env.ts` for the available list.

---

## Frontend Workflow & Guidelines

### Workflow

1. Choose a design style before writing any frontend code according to Design Guide. Edit `client/src/index.css` for global theming, add fonts via Google Fonts CDN in `client/index.html`.
2. Design layout and navigation based on app purpose in App.tsx:

- **Internal tools / dashboards** (finance trackers, task managers, admin panels, analytics): Use DashboardLayout with sidebar navigation.
- **Public-facing products** (marketing sites, e-commerce, communities): Design custom navigation (top nav, contextual nav) and landing page.

3. Start by updating `client/src/pages/Home.tsx` using shadcn/ui components.
4. Create additional pages under `client/src/pages/FeatureName.tsx`.
5. Register routes in `client/src/App.tsx`.
6. Handle loading/empty/error states in the UI—tRPC already surfaces typed responses and errors.

### tRPC & Data Management

- Use `trpc.*.useQuery/useMutation` for all backend calls—never introduce Axios/fetch wrappers.
- **Optimistic updates for instant feedback**: Use `onMutate` to update cache, `onError` to rollback. Ideal for list CRUD, toggles, profile edits. For critical operations (payments, auth), prefer `invalidate` with loading states.
- When using `invalidate`: call `trpc.useUtils().feature.invalidate()` in mutation's `onSuccess`.
- Auth state comes from `useAuth()`; do not manipulate cookies manually.

### UI & Styling

- Prefer shadcn/ui components; import from `@/components/ui/*`.
- Compose Tailwind utilities with component variants; avoid excessive custom CSS.
- Preserve design tokens: keep `@layer base` rules in `client/src/index.css`.
- Theming: Choose dark/light theme for ThemeProvider, manage colors with CSS variables in `index.css`.
- Accessibility: keep visible focus rings, ensure keyboard reachability, design mobile-first.
- Micro-interactions and empty states: add motion, empty states, and icons tastefully.
- Navigation: For internal tools use persistent sidebar. For public apps, design navigation based on content structure—ensure clear escape routes from all pages.
- Placeholder UI elements: show toast on click ("Feature coming soon") for not-yet-implemented features. Inform user which elements are placeholders.

### React Best Practices

- Never call setState/navigation in render phase → wrap in `useEffect`

### Customized Defaults

- `.container` is customized to auto-center and add responsive padding (see `index.css`). Use directly without `mx-auto`/`px-*`. For custom widths, use `max-w-*` with `mx-auto px-4`.
- `.flex` has `min-width:0` and `min-height:0` by default
- `button` variant `outline` uses transparent background (not `bg-background`). Add bg color class manually if needed.

---

## Design Guide

Before coding, understand the context and commit to a BOLD aesthetic direction:

- **Purpose**: What problem does this interface solve? Who uses it?
- **Tone**: Pick an extreme: brutally minimal, maximalist chaos, retro-futuristic, organic/natural, luxury/refined, playful/toy-like, editorial/magazine, brutalist/raw, art deco/geometric, soft/pastel, industrial/utilitarian, etc. There are so many flavors to choose from. Use these for inspiration but design one that is true to the aesthetic direction.
- **Constraints**: Technical requirements (framework, performance, accessibility).
- **Differentiation**: What makes this UNFORGETTABLE? What's the one thing someone will remember?

**CRITICAL**: Choose a clear conceptual direction and execute it with precision. Bold maximalism and refined minimalism both work - the key is intentionality, not intensity.

Then implement working code (HTML/CSS/JS, React, Vue, etc.) that is:

- Production-grade and functional
- Visually striking and memorable
- Cohesive with a clear aesthetic point-of-view
- Meticulously refined in every detail

### Frontend Aesthetics Guidelines

Focus on:

- **Typography**: Choose fonts that are beautiful, unique, and interesting. Avoid generic fonts like Arial and Inter; opt instead for distinctive choices that elevate the frontend's aesthetics; unexpected, characterful font choices. Pair a distinctive display font with a refined body font.
- **Color & Theme**: Commit to a cohesive aesthetic. Use CSS variables for consistency. Dominant colors with sharp accents outperform timid, evenly-distributed palettes.
- **Motion**: Use animations for effects and micro-interactions. Prioritize CSS-only solutions for HTML. Use Motion library for React when available. Focus on high-impact moments: one well-orchestrated page load with staggered reveals (animation-delay) creates more delight than scattered micro-interactions. Use scroll-triggering and hover states that surprise.
- **Spatial Composition**: Unexpected layouts. Asymmetry. Overlap. Diagonal flow. Grid-breaking elements. Generous negative space OR controlled density.
- **Backgrounds & Visual Details**: Create atmosphere and depth rather than defaulting to solid colors. Add contextual effects and textures that match the overall aesthetic. Apply creative forms like gradient meshes, noise textures, geometric patterns, layered transparencies, dramatic shadows, decorative borders, custom cursors, and grain overlays.

NEVER use generic AI-generated aesthetics like overused font families (Inter, Roboto, Arial, system fonts), cliched color schemes (particularly purple gradients on white backgrounds), predictable layouts and component patterns, and cookie-cutter design that lacks context-specific character.

Interpret creatively and make unexpected choices that feel genuinely designed for the context. No design should be the same. Vary between light and dark themes, different fonts, different aesthetics. NEVER converge on common choices (Space Grotesk, for example) across generations.

**IMPORTANT**: Match implementation complexity to the aesthetic vision. Maximalist designs need elaborate code with extensive animations and effects. Minimalist or refined designs need restraint, precision, and careful attention to spacing, typography, and subtle details. Elegance comes from executing the vision well.

Remember: The agent is capable of extraordinary creative work. Don't hold back, show what can truly be created when thinking outside the box and committing fully to a distinctive vision.

---

## Feature Checklist

- [ ] Tables updated in `drizzle/schema.ts`, migrations pushed (`pnpm db:push`)
- [ ] Query helper added in `server/db.ts` (returns raw Drizzle rows)
- [ ] Procedure created in `server/routers.ts` (choose `public` vs `protected`)
- [ ] UI calls the procedure via `trpc.*.useQuery/useMutation`
- [ ] Success + error paths verified in the browser

---

## Pre-built Components

Before implementing UI features, check if these components already exist. MUST evaluate first before building from scratch.

- `client/src/components/DashboardLayout.tsx` — Full dashboard layout with sidebar navigation, auth handling, user profile. Loading skeleton: `DashboardLayoutSkeleton.tsx`.
- `client/src/components/AIChatBox.tsx` — Chat interface with message history, streaming, markdown rendering.
- `client/src/components/Map.tsx` — Google Maps integration with proxy auth. MapView with onMapReady callback for Places, Geocoder, Directions, Drawing, etc.

---

## Internal Tools & Admin Panels

**Use DashboardLayout for:** admin dashboards, personal productivity apps, analytics tools.
**Do NOT use for:** public platforms, e-commerce storefronts, marketing sites.

- Use `DashboardLayout` from `client/src/components/DashboardLayout.tsx` and remove page-level headers to avoid duplication.
- Read its content before making changes and preserve its core structure.

**Role-based Access Control:**

- The `user` table includes a `role` field (enum: `admin` | `user`)
- Use `ctx.user.role` in procedures to gate admin-only operations
- Frontend can conditionally render based on `useAuth().user?.role`

```ts
adminOnlyProcedure: protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== 'admin') throw new TRPCError({ code: 'FORBIDDEN' });
  return next({ ctx });
}),
```

To promote a user to admin, update the `role` field directly in the database. For additional roles, extend the enum in `drizzle/schema.ts`.

---

## Easy-Peasy.AI APIs

All AI APIs below are server-side only—call from tRPC procedures to keep API keys secure. The `EASY_PEASY_API_KEY` is preconfigured in `.env`. For full API docs, read `/home/user/.skills/easy-peasy-api.md`.

### Chat Completions (OpenAI-compatible)

Pairs well with `AIChatBox` component.

```ts
import { chatCompletion, chatCompletionStream } from "./server/_core/chat";

const response = await chatCompletion({
  messages: [
    { role: "system", content: "You are a helpful cooking assistant." },
    { role: "user", content: "How do I make pasta carbonara?" },
  ],
  temperature: 0.7,
});

// Streaming
for await (const chunk of chatCompletionStream({ messages })) {
  process.stdout.write(chunk);
}
```

Or use the OpenAI SDK directly:

```ts
import OpenAI from "openai";
const client = new OpenAI({
  apiKey: process.env.EASY_PEASY_API_KEY,
  baseURL: "https://easy-peasy.ai/api",
});
const result = await client.chat.completions.create({
  model: "gemini-3-flash",
  messages: [{ role: "user", content: "Hello!" }],
});
```

### Text Generation (50+ templates)

```ts
import { generateText, listPresets } from "./server/_core/llm";

const results = await generateText({
  preset: "custom-generator",
  keywords: "Write a product description for a smart watch",
  tone: "professional",
  length: "Medium",
});

// Discover available templates
const { presets } = await listPresets("Marketing");
```

LLM responses often contain markdown. Use `<Streamdown>{content}</Streamdown>` (imported from `streamdown`) to render with proper formatting.

### Voice Transcription

Transcription is async — start with `createTranscription()`, then poll with `getTranscription()`. Supported formats: webm, mp3, wav, ogg, m4a.

```ts
import {
  createTranscription,
  getTranscription,
} from "./server/_core/voiceTranscription";

const { id } = await createTranscription({
  audioUrl: "https://storage.example.com/audio/recording.mp3",
  language: "en",
});

let result;
do {
  await new Promise(r => setTimeout(r, 5000));
  result = await getTranscription(id);
} while (result.status === "processing");
console.log(result.text);
```

### Image Generation (40+ models)

Image generation takes 5-20 seconds — implement loading states. Generated URLs are public and can be used directly in `<img>` tags.

```ts
import { generateImage } from "./server/_core/imageGeneration";

const images = await generateImage({
  prompt: "A futuristic city at sunset",
  model: "Nano Banana 2", // Also: Midjourney V7, FLUX.2, Stable Diffusion 3.5, Imagen 4, etc.
  dimensions: "1:1",
});
console.log(images[0].image_url);

// Image-to-image transformation
const edited = await generateImage({
  prompt: "Add a rainbow to this landscape",
  image: "https://example.com/original.jpg",
});
```

---

## ☁️ File Storage

Files are stored in **Cloudflare R2** (S3-compatible) with CDN delivery via `sandbox-storage.easy-peasy.ai`. Auto-configured — no setup needed.

For AI-generated assets (images, audio, video), the Easy-Peasy.AI API returns public URLs directly — no upload needed.

### Client-side: upload from the browser

A built-in `/api/upload` endpoint accepts multipart file uploads (up to 50 MB). Use the client helper:

```tsx
import { uploadFile, deleteFile } from "@/lib/upload";

const { url, fileKey } = await uploadFile(file); // file is a File object
// url     → public CDN URL, use in <img src>, <audio src>, etc.
// fileKey → storage key, save to your database for later deletion

await deleteFile(fileKey);
```

Example: file input handler

```tsx
<input
  type="file"
  accept="image/*"
  onChange={async e => {
    const file = e.target.files?.[0];
    if (!file) return;
    const { url, fileKey } = await uploadFile(file);
    // save url and fileKey to your state / database
  }}
/>
```

### Server-side: upload from tRPC procedures

For server-side uploads (e.g. processing a file before storing), use `storage.ts` directly:

```ts
import { uploadFile, deleteFile, getFileUrl } from "../storage";

const { url, fileKey } = await uploadFile(buffer, "photo.jpg", {
  contentType: "image/jpeg",
});

await deleteFile(fileKey);

// Generate a time-limited signed URL (for private files)
const signedUrl = await getFileUrl(fileKey, 3600); // 1 hour
```

### Best practices

- Store `fileKey` and `url` in your database columns, **never** store file bytes in the database
- Set `contentType` for proper browser handling (e.g. inline image display)
- Use the client-side `uploadFile()` from `@/lib/upload` for browser uploads; use server-side `uploadFile()` from `../storage` when processing files in tRPC procedures

---

## 🗺️ Maps Integration

**Default: Use Frontend SDK** - Import MapView from `client/src/components/Map.tsx` and initialize ANY Google Maps service (geocoding, directions, places, drawing, etc.) in the onMapReady callback.

**Use Backend API only when:** persisting data to database, bulk operations (1000+ addresses), or server-side needs (caching, scheduled jobs).

Backend: Create tRPC procedures using `makeRequest` from `server/_core/map.ts`.

---

## ⏱ Datetime & Timezone

Store all timestamps as UTC-based Unix timestamps (milliseconds since epoch) at the database and API layer. In React, convert to local timezone for display: `new Date(utcTimestamp).toLocaleString()`.

---

## Tips

- Keep router files under ~150 lines—split into `server/routers/<feature>.ts` once they grow.
- Show loading states at component level (spinners, skeletons) rather than blocking entire pages.

---

## Core File References

Note: All TODO comments are remarks for the agent (you), not for the user.

`package.json`

```ts
{
  {
    FILE: package.json;
  }
}
```

`drizzle/schema.ts`

```ts
{
  {
    FILE: drizzle / schema.ts;
  }
}
```

`server/db.ts`

```ts
{
  {
    FILE: server / db.ts;
  }
}
```

`server/routers.ts`

```ts
{
  {
    FILE: server / routers.ts;
  }
}
```

`client/src/App.tsx`

```tsx
{
  {
    FILE: client / src / App.tsx;
  }
}
```

`client/src/lib/trpc.ts`

```ts
{
  {
    FILE: client / src / lib / trpc.ts;
  }
}
```

`client/src/pages/Home.tsx`

```tsx
{
  {
    FILE: client / src / pages / Home.tsx;
  }
}
```

`server/auth.logout.test.ts`

```ts
{
  {
    FILE: server / auth.logout.test.ts;
  }
}
```

---

## Common Pitfalls

### Infinite loading loops from unstable references

Objects/arrays created in render have new references each time, causing infinite tRPC re-fetches.

```tsx
// ❌ Bad: New reference every render
const { data } = trpc.items.getByDate.useQuery({ date: new Date() });
const { data } = trpc.items.getByIds.useQuery({ ids: [1, 2, 3] });

// ✅ Good: Stabilize with useState/useMemo
const [date] = useState(() => new Date());
const ids = useMemo(() => [1, 2, 3], []);
```

### Storing file bytes in database columns

```ts
// ❌ Bad: Database bloat and slow queries
export const files = pgTable("files", { content: bytea("content") });

// ✅ Good: Store R2 reference, upload via uploadFile()
export const files = pgTable("files", {
  url: text("url").notNull(),
  fileKey: text("file_key").notNull(),
});
```

### Navigation dead-ends in subpages

Define layout wrapper in App.tsx first, then build pages inside it. For admin tools use DashboardLayout; for detail pages add back button with `router.back()`.

### Invisible text from theme/color mismatches

Semantic colors resolve based on ThemeProvider's active theme. Two rules:

1. **Match theme to CSS variables:** If `defaultTheme="dark"`, ensure `.dark {}` in index.css has dark background + light foreground
2. **Always pair bg with text:** `bg-{semantic}` must include `text-{semantic}-foreground`

```tsx
<div className="bg-popover text-popover-foreground">...</div>
<div className="bg-card text-card-foreground">...</div>
```

### Nested anchor tags in Link components

Pass children directly to `<Link>`—it already renders an `<a>` internally. Never nest `<a>` inside `<Link>`.

### Empty `Select.Item` values

Every `<Select.Item>` must have a non-empty `value` prop—never `""`, `undefined`, or omitted.
