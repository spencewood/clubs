import { server } from '../src/test/server';

/**
 * Playwright global setup - starts MSW server for E2E tests
 * This allows E2E tests to use the same mocks as unit tests
 */
export default function globalSetup() {
  // Start MSW server before all tests
  server.listen({ onUnhandledRequest: 'warn' });

  return () => {
    // Clean up after all tests complete
    server.close();
  };
}
