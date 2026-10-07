# EcoStream Lite

EcoStream Lite is an AI-assisted, multi-store e-commerce application. It contains
four independent storefront backends, a shared administration dashboard, and
SQLite persistence for users, products, and reviews.

The application is designed for local development and demonstration. Each
storefront is a self-contained React/Vite frontend served by an Express API.
The APIs provide authentication, product management, reviews, and AI-assisted
content and sentiment features.

## Contents

- [How the application works](#how-the-application-works)
- [Repository structure](#repository-structure)
- [Requirements](#requirements)
- [Installation](#installation)
- [Environment configuration](#environment-configuration)
- [Running the application](#running-the-application)
- [Using the application](#using-the-application)
- [API overview](#api-overview)
- [Data and persistence](#data-and-persistence)
- [AI request flow](#ai-request-flow)
- [Production and security checklist](#production-and-security-checklist)
- [Troubleshooting](#troubleshooting)

## How the application works

EcoStream is made up of five development services:

| Service | Directory | URL | Purpose |
| --- | --- | --- | --- |
| EcoFinds API/storefront | `ecostream-mvp00001` | `http://localhost:3000` | General eco-friendly products |
| TechBazaar API/storefront | `tech-bazaar` | `http://localhost:3001` | Electronics and gadgets |
| StyleAvenue API/storefront | `style-avenue` | `http://localhost:3002` | Fashion and lifestyle products |
| HomeHarmony API/storefront | `home-harmony` | `http://localhost:3003` | Home and interior products |
| Unified admin dashboard | `ecostream-mvp00001/admin-dashboard` | `http://localhost:5173` | Manage products and reviews |

Each storefront API serves its own React application and its own
`database.db` file. The browser calls the API on the same origin, so product
and review requests do not require a separate frontend proxy in development.

At a high level:

1. A visitor opens one of the storefront URLs.
2. The React client requests products and reviews from that storefront's
   Express API.
3. A customer can register, sign in, browse products, submit reviews, and use
   the sentiment feature.
4. An administrator signs in through the dashboard, creates or edits products,
   generates product descriptions, analyzes reviews, and publishes replies.
5. Protected requests include the JWT returned by the login endpoint.
6. AI requests use OpenRouter first and Gemini as a fallback.
7. SQLite stores users, products, reviews, and administrator replies locally.

## Repository structure

```text
ECOSTREAM-LITE-main/
├── README.md
├── start_all.ps1
├── relaunch_all.ps1
├── ecostream-mvp00001/
│   ├── server.ts
│   ├── src/                         # EcoFinds storefront
│   ├── admin-dashboard/             # Unified admin React app
│   ├── .env.example
│   └── package.json
├── tech-bazaar/
│   ├── server.ts
│   ├── src/
│   ├── .env.example
│   └── package.json
├── style-avenue/
│   ├── server.ts
│   ├── src/
│   ├── .env.example
│   └── package.json
└── home-harmony/
    ├── server.ts
    ├── src/
    ├── .env.example
    └── package.json
```

The `admin-dashboard` directory has its own `package.json` and must be
installed separately from the storefront backend.

## Requirements

- Node.js 18 or newer (Node.js 20 or newer is recommended)
- npm
- Windows PowerShell for the provided orchestration scripts
- An OpenRouter API key for AI features
- A Gemini API key if Gemini fallback features are required

## Installation

Clone the repository and enter the project directory:

```powershell
git clone https://github.com/VigneshCodeNest/ECOSTREAM-LITE-main.git
cd ECOSTREAM-LITE-main\ECOSTREAM-LITE-main
```

Install dependencies for all four APIs and the admin dashboard:

```powershell
$apps = @(
  "ecostream-mvp00001",
  "tech-bazaar",
  "style-avenue",
  "home-harmony",
  "ecostream-mvp00001\admin-dashboard"
)

foreach ($app in $apps) {
  Push-Location $app
  npm install
  Pop-Location
}
```

## Environment configuration

Do not commit a real `.env` file. The repository ignores `.env` and local
environment variants. Copy the example into each API directory:

```powershell
Copy-Item ecostream-mvp00001\.env.example ecostream-mvp00001\.env
Copy-Item tech-bazaar\.env.example tech-bazaar\.env
Copy-Item style-avenue\.env.example style-avenue\.env
Copy-Item home-harmony\.env.example home-harmony\.env
```

Set private values in each `.env` file:

```dotenv
GEMINI_API_KEY=your_gemini_api_key
OPENROUTER_API_KEY=your_openrouter_api_key
JWT_SECRET=generate_a_long_random_secret
APP_URL=http://localhost:3000
```

`APP_URL` should match the service being configured when it is used by a
deployment or callback integration:

- EcoFinds: `http://localhost:3000`
- TechBazaar: `http://localhost:3001`
- StyleAvenue: `http://localhost:3002`
- HomeHarmony: `http://localhost:3003`

Use a different, long, random `JWT_SECRET` for every deployed service. Never
paste API keys into source files, test scripts, screenshots, commits, or
public issue reports.

## Running the application

### Run one storefront

From the selected storefront directory:

```powershell
cd tech-bazaar
npm run dev
```

Then open `http://localhost:3001`. Use the equivalent directory and port for
the other stores.

Available npm scripts in each application:

| Command | Description |
| --- | --- |
| `npm run dev` | Start the TypeScript Express/Vite development server |
| `npm start` | Start the server with Node |
| `npm run build` | Build the Vite frontend |
| `npm run preview` | Preview the Vite production build |
| `npm run lint` | Run the TypeScript compiler without emitting files |

### Run the admin dashboard

The dashboard is a separate Vite application:

```powershell
cd ecostream-mvp00001\admin-dashboard
npm run dev
```

Open `http://localhost:5173`. The dashboard calls the API routes configured by
its development setup and is intended to be used with the EcoFinds service
when started by the included orchestrator.

### Start every service

From the repository root:

```powershell
.\start_all.ps1
```

For a clean restart that stops existing Node processes, waits for startup, and
checks ports:

```powershell
.\relaunch_all.ps1
```

The restart script starts:

```text
Admin hub:  http://localhost:5173
EcoFinds:   http://localhost:3000
TechBazaar: http://localhost:3001
StyleAvenue:http://localhost:3002
HomeHarmony: http://localhost:3003
```

Only use `relaunch_all.ps1` when it is safe to stop all Node processes on the
machine. For shared development machines, start services individually.

## Using the application

### Customer flow

1. Open a storefront.
2. Register a customer account or sign in.
3. Browse the product catalog.
4. Select a product to view its reviews.
5. Submit a review while authenticated.
6. Use the sentiment action where available to analyze review text.
7. Sign out to remove the JWT and user data from browser storage.

### Administrator flow

1. Open the admin dashboard at `http://localhost:5173`.
2. Sign in with an administrator account.
3. Load products and reviews from the connected API.
4. Create, edit, or delete products.
5. Ask the AI service to generate product descriptions.
6. Analyze review sentiment and generate a customer reply.
7. Review the generated text before publishing it.
8. Save the administrator reply against the review.

The development seed creates an administrator account in a new database. Do
not use development credentials in a shared or production deployment; change
the seed behavior and credentials before exposing the application publicly.

## API overview

Each storefront API exposes the same core route family:

### Authentication

| Method | Route | Authentication | Description |
| --- | --- | --- | --- |
| `POST` | `/api/auth/register` | Public | Create a customer account |
| `POST` | `/api/auth/login` | Public | Return a JWT and user information |

### Products

| Method | Route | Authentication | Description |
| --- | --- | --- | --- |
| `GET` | `/api/products` | Public | List products |
| `POST` | `/api/products` | Admin | Create a product |
| `PUT` | `/api/products/:id` | Admin | Update a product |
| `DELETE` | `/api/products/:id` | Admin | Delete a product |

### Reviews

| Method | Route | Authentication | Description |
| --- | --- | --- | --- |
| `GET` | `/api/reviews` | Public | List reviews |
| `GET` | `/api/products/:id/reviews` | Public | List reviews for a product |
| `POST` | `/api/reviews` | User | Add a review |
| `PUT` | `/api/reviews/:id/reply` | Admin | Save an administrator reply |

### AI features

| Method | Route | Authentication | Description |
| --- | --- | --- | --- |
| `POST` | `/api/ai/generate-description` | Admin | Generate product copy |
| `POST` | `/api/ai/analyze-reviews` | Admin | Analyze a group of reviews |
| `POST` | `/api/ai/generate-reply` | Admin | Draft a customer reply |
| `POST` | `/api/ai/analyze-sentiment` | User | Analyze review sentiment |

For protected routes, send the login token as:

```http
Authorization: Bearer <jwt>
```

## Data and persistence

Each API creates a local SQLite database named `database.db` in its own
directory. Tables include:

- `users`: username, bcrypt password hash, and role
- `products`: product name, description, price, image, and metadata
- `reviews`: product reviews, ratings, sentiment-related data, and replies

The database is created automatically on first start and is intentionally
ignored by Git. Back up the database before deleting it. Deleting a local
database resets the development data and triggers the seed logic again.

## AI request flow

1. The server receives an authenticated AI request.
2. It tries the configured OpenRouter models in order.
3. If OpenRouter fails or returns an error, the server attempts Gemini.
4. The generated result is returned to the admin or customer client.
5. Administrators can edit or reject generated content before saving it.

AI output is not guaranteed to be correct. Treat descriptions, sentiment
labels, and replies as drafts that require human review.

## Production and security checklist

Before deploying:

- Set real secrets through the hosting provider's secret manager.
- Use a unique high-entropy `JWT_SECRET` per environment.
- Remove development seed accounts and default credentials.
- Run behind HTTPS and configure a restricted CORS allowlist.
- Replace permissive local database handling with managed persistence and
  backups.
- Add rate limiting, request validation, and audit logging.
- Keep API keys server-side; never expose them through frontend bundles.
- Review AI-generated content before displaying or sending it.
- Rotate any key that has ever appeared in a commit, terminal log, or public
  artifact.
- Run `npm run lint` and `npm run build` in every application before release.

## Troubleshooting

### `npm run lint` cannot find `tsc`

Install dependencies in the application directory:

```powershell
npm install
npm run lint
```

### A port is already in use

Find the process using the port and stop only that process, or start the
affected service individually after choosing an available port in its
`server.ts`. The orchestrator expects ports `3000`, `3001`, `3002`, `3003`,
and `5173`.

### AI requests fail

Check that the relevant `.env` contains valid `OPENROUTER_API_KEY` and
`GEMINI_API_KEY` values, then restart the API. Do not put the key in a test
file or commit it to Git.

### Login tokens stop working

The API requires `JWT_SECRET` at startup. If the secret changes while an API
is running, existing tokens become invalid; users must sign in again.

### The dashboard cannot load data

Confirm that the API it is configured to use is running, that its port is
available, and that the browser request points to the correct API origin.
Check the browser console and the API terminal output for the failing route.

## License and contribution

This repository is a development application. Before accepting external
contributions or deploying commercially, add the project's intended license,
define contribution guidelines, and document the supported deployment target.
