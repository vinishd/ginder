'use server'

export async function queryFlowise(data: any) {
  const flowise_base_url = process.env.FLOWISE_BASE_URL ?? "http://localhost:3000";
  const response = await fetch(
    `${flowise_base_url}${process.env.FLOWISE_GINDER_URL}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(data)
    }
  );

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  return await response.json();
};