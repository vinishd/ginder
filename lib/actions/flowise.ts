'use server';

interface FlowiseResponse {
	sessionId: string;
}
export async function queryFlowise(data: any): Promise<string> {
	const flowise_base_url =
		process.env.FLOWISE_BASE_URL ?? 'http://localhost:3000';
	const response = await fetch(
		`${flowise_base_url}${process.env.FLOWISE_GINDER_ENDPOINT}`,
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
		console.error(response.statusText);
		throw new Error(`HTTP error! status: ${response.status}`);
	}
	const res = await response.json();
	return (res as FlowiseResponse).sessionId;
}
