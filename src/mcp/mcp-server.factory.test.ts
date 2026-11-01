import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { McpServerFactory } from './mcp-server.factory';

describe('McpServerFactory', () => {
  const user = { userId: 'user-1', email: 'user@example.com' };
  let tools: Record<string, jest.Mock>;
  let client: Client;

  beforeEach(async () => {
    tools = {
      logApplication: jest.fn().mockResolvedValue({ action: 'created' }),
      scheduleInterview: jest.fn().mockResolvedValue({ action: 'created' }),
      updateStatus: jest
        .fn()
        .mockRejectedValue(new Error('boom: secret detail')),
    };
    const server = new McpServerFactory(tools as never).create(user);
    const [clientTransport, serverTransport] =
      InMemoryTransport.createLinkedPair();
    client = new Client({ name: 'test', version: '0' });
    await Promise.all([
      server.connect(serverTransport),
      client.connect(clientTransport),
    ]);
  });

  afterEach(async () => {
    await client.close();
  });

  it('exposes exactly the six non-destructive tools', async () => {
    const { tools: listed } = await client.listTools();
    expect(listed.map((tool) => tool.name).sort()).toEqual([
      'add_application_note',
      'find_applications',
      'list_upcoming_interviews',
      'log_application',
      'schedule_interview',
      'update_application_status',
    ]);
  });

  it.each(['javascript:alert(1)', 'data:text/html,x', 'ftp://example.com/x'])(
    'rejects non-http(s) jobUrl %s',
    async (jobUrl) => {
      const result = await client
        .callTool({
          name: 'log_application',
          arguments: { companyName: 'Acme', jobTitle: 'Engineer', jobUrl },
        })
        .catch((error: Error) => error);

      expect(tools.logApplication).not.toHaveBeenCalled();
      const rejected =
        result instanceof Error || (result as { isError?: boolean }).isError;
      expect(rejected).toBe(true);
    },
  );

  it('rejects a javascript: meetingLink', async () => {
    const result = await client
      .callTool({
        name: 'schedule_interview',
        arguments: {
          applicationId: '00000000-0000-4000-8000-000000000000',
          stage: 'OTHER',
          interviewType: 'VIDEO',
          scheduledAt: '2099-01-01T10:00:00Z',
          meetingLink: 'javascript:alert(1)',
        },
      })
      .catch((error: Error) => error);

    expect(tools.scheduleInterview).not.toHaveBeenCalled();
    expect(
      result instanceof Error || (result as { isError?: boolean }).isError,
    ).toBe(true);
  });

  it('upper-cases currency and accepts https links', async () => {
    await client.callTool({
      name: 'log_application',
      arguments: {
        companyName: 'Acme',
        jobTitle: 'Engineer',
        jobUrl: 'https://jobs.example.com/1',
        currency: 'usd',
      },
    });

    expect(tools.logApplication).toHaveBeenCalledWith(
      user,
      expect.objectContaining({ currency: 'USD' }),
    );
  });

  it('hides unexpected error details from the client', async () => {
    const result = (await client.callTool({
      name: 'update_application_status',
      arguments: {
        applicationId: '00000000-0000-4000-8000-000000000000',
        status: 'REJECTED',
      },
    })) as { isError?: boolean; content: Array<{ text: string }> };

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toBe(
      'Unexpected error while running the tool.',
    );
  });
});
