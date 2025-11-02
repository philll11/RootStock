import { useEffect } from 'react';
// 1. Import the hook and types directly from our 'shared' package
import { useClientsStore, type Client } from 'shared';

export function ClientList() {
  // 2. Use the hook to get the state and the fetch function
  const { clients, isLoading, error, fetchClients } = useClientsStore();

  // 3. Call the fetch function once when the component is first rendered
  useEffect(() => {
    fetchClients();
  }, [fetchClients]);

  // 4. Conditionally render the UI based on the state from the store
  if (isLoading) {
    return <p>Loading clients...</p>;
  }

  if (error) {
    return <p style={{ color: 'red' }}>{error}</p>;
  }

  return (
    <div>
      <h1>RootStock Clients</h1>
      {clients.length > 0 ? (
        <ul>
          {clients.map((client: Client) => (
            <li key={client._id}>
              <strong>{client.name}</strong> ({client.recordId})
            </li>
          ))}
        </ul>
      ) : (
        <p>No clients found.</p>
      )}
    </div>
  );
}