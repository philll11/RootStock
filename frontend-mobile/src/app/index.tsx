import { Redirect, Href } from 'expo-router';

export default function Index() {
    // TODO: Add Auth check here
    // For now, auto-redirect to dashboard
    return <Redirect href={"/(root)/dashboard" as Href} />;
}
