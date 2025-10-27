export async function runDriveHealthChecks(client: any): Promise<{
  results: Array<{ testName: string; success: boolean; error: string | null }>;
  logs: string[];
}> {
  const results = [];
  const logs = [];

  try {
    logs.push('Creating test file...');
    const file = await client.files.createTestFile();
    logs.push(`Test file created with ID: ${file.id}`);

    logs.push('Listing files...');
    const list = await client.files.listFiles();
    logs.push(`Found ${list.files.length} files.`);

    logs.push(`Deleting test file with ID: ${file.id}...`);
    await client.files.deleteFile(file.id);
    logs.push('Test file deleted successfully.');

    results.push({ testName: 'drive_basic_ops', success: true, error: null });
  } catch (e: any) {
    logs.push(`Error during Drive health check: ${e.message}`);
    results.push({ testName: 'drive_basic_ops', success: false, error: e.message });
  }

  return { results, logs };
}
