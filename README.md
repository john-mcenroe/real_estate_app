# HomePrice MVP - README

## Overview
**RealEstateGen** is an AI-powered platform aimed at simplifying property valuations in Ireland, enabling homeowners to quickly assess their property value and connect with realtors. The MVP (Minimum Viable Product) focuses on a **Property Valuation Tool** designed to generate leads for realtors and provide users with accurate property estimates based on real-time market data.

## Features
### 1. Property Valuation App
- **Instant Property Valuation**: Enter an address and receive an AI-driven property valuation.
- **Similar Property Insights**: View similar properties in the area and their valuation.

## Project Structure
The project is structured as a Next.js application with the following key directories:

- `/app`: Core application code
  - `/api`: API routes for server-side functionality
  - `/blog`: Blog-related components and pages
  - `/privacy-policy`: Privacy policy page
  - `/result`: Results page for property valuations
  - `/tos`: Terms of Service page
  - `/components`: Reusable React components
- `/libs`: Utility libraries and modules
  - `api.js`: API-related utilities
  - `get.js`: Data fetching utilities
  - `mailgun.js`: Email service integration
  - `mongo.js` and `mongoose.js`: Database connection and ORM
  - `next-auth.js`: Authentication setup
  - `seo.js`: SEO-related utilities
  - `stripe.js`: Payment integration
  - `supabaseClient.js`: Supabase client setup
- `/public`: Static assets
- `/python-api`: Python-based API (possibly for machine learning tasks)

## Development Setup
1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/realestategen.git
   cd realestategen
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables:
   - Copy `.env.local.example` to `.env.local`
   - Fill in the required environment variables

4. Run the development server:
   ```bash
   npm run dev
   ```

5. Open [http://localhost:3000](http://localhost:3000) in your browser to see the application.

## Deployment and Continuous Integration

This project is deployed on Vercel and uses continuous integration for automatic updates.

### Vercel Deployment
1. The project is linked to a Vercel project via the Vercel CLI or the Vercel dashboard.
2. Vercel automatically detects the Next.js framework and sets up the build configuration.

### Automatic Synchronization
1. When changes are pushed to the `main` branch on GitHub, Vercel automatically triggers a new deployment.
2. Vercel pulls the latest code, builds the project, and deploys it to production.
3. Each commit to `main` creates a unique deployment URL for easy testing and rollback if needed.

### Environment Variables
- Sensitive information and API keys are stored as environment variables in the Vercel project settings.
- These variables are securely injected into the application during the build process.

### Deployment Preview
- Pull requests automatically generate preview deployments, allowing for easy review of changes before merging.

## Additional Information

- **API Integration**: The project uses a combination of Next.js API routes (`/app/api`) and a separate Python API (`/python-api`), possibly for more complex data processing or machine learning tasks.

- **Database**: MongoDB is used as the database, with Mongoose as the ORM for data modeling and management.

- **Authentication**: Next-Auth is implemented for user authentication, providing secure access to user-specific features.

- **Payment Processing**: Stripe integration is set up for handling any payment-related features.

- **Email Service**: Mailgun is integrated for sending automated emails, likely for user notifications or lead information to realtors.

- **SEO Optimization**: Custom SEO utilities are implemented to ensure good search engine visibility.

- **Styling**: The project uses Tailwind CSS for styling, as evidenced by the `tailwind.config.js` file.

## Contributing
Contributions are welcome! Please read our contributing guidelines and code of conduct before submitting pull requests.

## License
[Specify your license here]
