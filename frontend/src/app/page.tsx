import { redirect } from 'next/navigation';

// Same landing page the login flow uses (getLandingPage in AuthGuard): the till
// is what this business opens the app for.
export default function Home() {
  redirect('/pos');
}
