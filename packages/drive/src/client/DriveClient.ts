export class DriveClient {
  constructor(private env: { [key: string]: unknown }) {}

  get files() {
    return {
      createTestFile: async () => {
        console.log('Creating a test file...');
        return { id: 'test-file-id' };
      },
      listFiles: async () => {
        console.log('Listing files...');
        return { files: [{ id: 'test-file-id' }] };
      },
      deleteFile: async (fileId: string) => {
        console.log(`Deleting file with id ${fileId}`);
        return {};
      },
    };
  }
}
