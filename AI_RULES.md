# AI Rules for Nurture Hub Development

This document outlines the technical stack and specific library usage guidelines to ensure consistency, maintainability, and best practices across the Nurture Hub application.

## Tech Stack Overview

*   **Frontend Framework:** React with TypeScript
*   **Build Tool:** Vite
*   **Styling:** Tailwind CSS for all styling, following a mobile-first approach.
*   **UI Components:** Shadcn/ui for pre-built, accessible components.
*   **Backend & Database:** Supabase (PostgreSQL, Authentication, Row Level Security, Realtime).
*   **Payments:** Stripe for subscription management and billing.
*   **Geocoding & Maps:** MapTiler API for accurate address geocoding and map visualizations.
*   **Icons:** Lucide-React for all iconography.
*   **Progressive Web App (PWA):** VitePWA plugin for offline capabilities and installability.
*   **Routing:** React Router for managing application routes.

## Library Usage Guidelines

To maintain a clean and efficient codebase, please adhere to the following rules for library usage:

*   **React & TypeScript:** Always use React with TypeScript for all new components and logic.
*   **Styling (Tailwind CSS):**
    *   **Exclusive Use:** All component styling MUST be done using Tailwind CSS utility classes.
    *   **Custom CSS:** Only `src/index.css` and `src/App.css` are permitted for global styles or base layer configurations. Avoid creating new `.css` files for individual components.
    *   **Responsive Design:** Always prioritize responsive design using Tailwind's utility-first approach.
*   **UI Components (shadcn/ui):**
    *   **First Choice:** Utilize components from the shadcn/ui library whenever possible.
    *   **Customization:** If a shadcn/ui component doesn't meet specific requirements, create a new, custom component in `src/components/` that uses Tailwind CSS. Do not modify shadcn/ui source files directly.
*   **Backend Interaction (Supabase):**
    *   **Client Library:** Use the `@supabase/supabase-js` client library for all interactions with Supabase (authentication, database queries, real-time subscriptions).
    *   **RLS:** Always assume Row Level Security (RLS) is active and design queries accordingly.
*   **Payments (Stripe):**
    *   **Client-side:** Use `@stripe/react-stripe-js` and `@stripe/stripe-js` for client-side payment form elements and interactions.
    *   **Server-side:** Any server-side Stripe operations (e.g., creating checkout sessions, handling webhooks) are assumed to be handled by Supabase Edge Functions or a separate backend service.
*   **Geocoding & Maps (MapTiler):**
    *   **Utilities:** Use the existing `src/lib/maptiler.ts` and `src/lib/geocoding.ts` utility functions for all geocoding, reverse geocoding, and address autocomplete functionalities.
    *   **Map Display:** Use the `MapTilerMap` component for rendering maps.
*   **Icons (Lucide-React):**
    *   **Standard:** All icons throughout the application should come from the `lucide-react` library.
*   **State Management:**
    *   **React Hooks:** Prefer `useState` and `useContext` for managing component-local and application-wide state.
    *   **Avoid Over-engineering:** Do not introduce external state management libraries (e.g., Redux, Zustand) unless there is a clear, demonstrated need for complex global state patterns that cannot be efficiently managed with React's built-in hooks.
*   **Routing (React Router):**
    *   **Centralized:** All top-level application routes should be defined and managed within `src/App.tsx` using React Router.
    *   **Dashboard Navigation:** Internal navigation within the dashboard can use simple state management (`useState`) as currently implemented.
*   **File Structure:**
    *   `src/pages/`: For top-level page components.
    *   `src/components/`: For reusable UI components.
    *   `src/contexts/`: For React Context API providers.
    *   `src/lib/`: For third-party library configurations and wrappers.
    *   `src/utils/`: For general utility functions.
    *   New components or hooks MUST be created in their own dedicated files.
*   **Error Handling:** Do not implement `try/catch` blocks unless specifically requested. Errors should be allowed to bubble up for centralized monitoring and debugging.
*   **Code Quality:** Maintain high standards for code readability, simplicity, and performance. Prioritize elegant and minimal solutions.