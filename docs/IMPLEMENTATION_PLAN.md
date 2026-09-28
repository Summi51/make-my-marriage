# Implementation Plan

Build small, tested vertical slices. Do not pre-create directories for later work.

## Milestone 0 — Foundation

Next.js App Router with TypeScript and Tailwind CSS; a thin health route; ESLint, Prettier, Vitest and build validation. Acceptance: every validation command passes.

## Milestone 1 — Environment and database

Validate server environment variables with Zod and establish the MongoDB/Mongoose connection. Acceptance: invalid configuration fails clearly and a test database connection succeeds.

## Milestone 2 — Authentication

Implement signup, login, logout and current-user slices with password hashing, MongoDB-backed sessions and secure cookies. Acceptance: contracts and failure cases match the API and database designs.

## Milestone 3 — Wedding tenancy

Implement wedding creation, membership, authenticated wedding-context resolution, and Admin/Manager authorization. Acceptance: private requests derive the wedding from membership and reject cross-wedding access.

## Later milestones

Implement the dashboard, events and tasks before guests, invitations, expenses, vendors, website, gallery and livestream. Add external SDKs only when used.
