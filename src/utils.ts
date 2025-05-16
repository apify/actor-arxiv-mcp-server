export async function waitForServer(
	url: string,
	timeoutMs = 30000,
	intervalMs = 1000,
): Promise<void> {
	const start = Date.now();

	while (Date.now() - start < timeoutMs) {
		try {
			const response = await fetch(url);
			if (response.status === 200) {
				return;
			}
		} catch (error) {
			// Ignore errors (server not up yet)
		}
		await new Promise((resolve) => setTimeout(resolve, intervalMs));
	}

	throw new Error(`Server at ${url} not online after ${timeoutMs}ms`);
}
