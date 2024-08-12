'use server';

interface FlowiseResponse {
  sessionId: string;
}

export async function queryFlowise(data: any): Promise<string> {
  console.log('Querying Flowise with data:', JSON.stringify(data));
  const flowise_base_url =
    process.env.FLOWISE_BASE_URL ?? 'http://localhost:3000';
  const endpoint = process.env.FLOWISE_GINDER_ENDPOINT;
  console.log(`Flowise URL: ${flowise_base_url}${endpoint}`);
  
  try {
    const response = await fetch(
      `${flowise_base_url}${endpoint}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer ' + process.env.FLOWISE_API_KEY,
        },
        body: JSON.stringify(data),
      }
    );

    if (!response.ok) {
      console.error('Flowise response not OK:', response.statusText);
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const res = await response.json();
    console.log('Flowise response:', res);
    return (res as FlowiseResponse).sessionId;
  } catch (error) {
    console.error('Error in queryFlowise:', error);
    throw error;
  }
}