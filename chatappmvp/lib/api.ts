type RequestMethod = 'GET' | 'POST' | 'PUT' | 'DELETE';

// Generic function to make authenticated API requests
export async function fetchWithAuth(url: string, method: RequestMethod = 'GET', body?: any) {
  const response = await fetch(url, {
    method,
    headers: {
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  return response.json();
}

// Thread-related API functions
export async function createThread(title: string, participantIds: string[]) {
  return fetchWithAuth('/api/threads', 'POST', { title, participantIds });
}

export async function getThreads() {
  return fetchWithAuth('/api/threads');
}

export async function getThread(id: string) {
  return fetchWithAuth(`/api/threads/${id}`);
}

export async function updateThread(id: string, title: string, participantIds: string[]) {
  return fetchWithAuth(`/api/threads/${id}`, 'PUT', { title, participantIds });
}

export async function deleteThread(id: string) {
  return fetchWithAuth(`/api/threads/${id}`, 'DELETE');
}

// Message-related API functions
export async function updateMessage(id: string, content: string) {
  return fetchWithAuth(`/api/messages/${id}`, 'PUT', { content });
}

export async function deleteMessage(id: string) {
  return fetchWithAuth(`/api/messages/${id}`, 'DELETE');
}

