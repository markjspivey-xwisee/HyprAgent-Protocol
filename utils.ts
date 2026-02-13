export const generateProvId = (): string => {
  const uuid = typeof crypto !== 'undefined' && crypto.randomUUID 
    ? crypto.randomUUID() 
    : Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  return `urn:uuid:${uuid}`;
};

export const formatProvIdShort = (id: string): string => {
  if (id.startsWith('urn:uuid:')) {
    return id.substring(9).substring(0, 8); // Return first 8 chars of the UUID part
  }
  // Fallback for DIDs or other URIs
  if (id.startsWith('did:')) {
    return id.split(':').pop()?.substring(0, 8) || id;
  }
  if (id.startsWith('http')) {
      return id.split('/').pop()?.substring(0, 15) || id;
  }
  return id.substring(0, 8);
};

export const formatTime = (ts: number): string => {
  return new Date(ts).toLocaleTimeString([], { hour12: false, hour: '2-digit', minute:'2-digit', second:'2-digit' });
};
