// AwarenessList.tsx

import React, { useState, useEffect } from 'react';
// The Awareness type is exported from 'y-protocols/awareness':
import { Awareness } from 'y-protocols/awareness';

interface Collaborator {
  name: string;
  color: string;
}

// We expect the parent to pass in a Yjs Awareness instance:
interface AwarenessListProps {
  awareness: Awareness;
}

/**
 * AwarenessList displays all active users from Yjs awareness.
 */
const AwarenessList: React.FC<AwarenessListProps> = ({ awareness }) => {
  const [users, setUsers] = useState<Collaborator[]>([]);

  useEffect(() => {
    const updateUsers = () => {
      // awareness.getStates() returns a Map<number, unknown>
      // We convert it to an array of { user: { name, color } } (or something similar).
      const statesArray = Array.from(awareness.getStates().values());

      // We'll map each "state" to the shape of { name, color } if it exists
      const userList: Collaborator[] = statesArray
        .map((state: any) => state.user) // each state might have a .user object
        .filter((userObj: any): userObj is Collaborator => !!userObj); // keep only valid user objects

      setUsers(userList);
    };

    // Initial population:
    updateUsers();

    // Listen for changes:
    awareness.on('change', updateUsers);

    // Cleanup:
    return () => {
      awareness.off('change', updateUsers);
    };
  }, [awareness]);

  return (
    <div className="p-2 border rounded bg-white">
      <h3 className="font-semibold mb-2">Active Users</h3>
      {users.length === 0 ? (
        <p className="text-gray-500">No collaborators online.</p>
      ) : (
        users.map((user, idx) => (
          <div key={idx} style={{ color: user.color }}>
            {user.name}
          </div>
        ))
      )}
    </div>
  );
};

export default AwarenessList;
