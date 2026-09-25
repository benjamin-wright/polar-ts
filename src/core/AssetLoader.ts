/** Fetch JSON without assuming the server returned a successful asset response. */
export async function loadJson(url: string): Promise<unknown> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Could not load ${url}: HTTP ${response.status}`);
  try {
    return (await response.json()) as unknown;
  } catch {
    throw new Error(`Could not load ${url}: expected valid JSON`);
  }
}
