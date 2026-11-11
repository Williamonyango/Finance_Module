import { SessionProvider } from './SessionContext'

export function AppProviders({ children }) {
  return <SessionProvider>{children}</SessionProvider>
}
