import { ToolRegistry } from '../../tools/ToolRegistry';
import type { Tool } from '../../tools/types';
import { ToolExecutionService } from '../../modules/api/chat/services/ToolExecutionService';
import type { FunctionCallInfo } from '../../modules/api/chat/utils';

function createTestTool(name: string): Tool {
    return {
        declaration: {
            name,
            description: `${name} description`,
            category: 'test',
            parameters: {
                type: 'object',
                properties: {}
            }
        },
        handler: jest.fn().mockResolvedValue({ success: true })
    };
}

function createSettingsManagerStub() {
    return {
        isToolEnabled: jest.fn().mockReturnValue(true),
        getCurrentPromptMode: jest.fn().mockReturnValue({
            id: 'ask',
            toolPolicy: ['read_file']
        }),
        getSubAgentsConfig: jest.fn().mockReturnValue({ maxConcurrentAgents: 3 })
    } as any;
}

async function drainProgressExecution(
    service: ToolExecutionService,
    calls: FunctionCallInfo[],
    conversationId: string,
    messageIndex: number
): Promise<void> {
    const iterator = service.executeFunctionCallsWithProgress(calls, conversationId, messageIndex);
    let result = await iterator.next();

    while (!result.done) {
        result = await iterator.next();
    }
}

describe('ToolExecutionService checkpoint bridge', () => {
    test('passes only executable tool names to checkpoint creation in batch execution', async () => {
        const toolRegistry = new ToolRegistry();
        toolRegistry.register(() => createTestTool('read_file'));
        toolRegistry.register(() => createTestTool('write_file'));

        const checkpointService = {
            createToolExecutionCheckpoint: jest.fn().mockResolvedValue(null)
        } as any;

        const service = new ToolExecutionService(
            toolRegistry,
            undefined,
            createSettingsManagerStub(),
            checkpointService
        );

        const calls: FunctionCallInfo[] = [
            { id: 'call-read', name: 'read_file', args: {} },
            { id: 'call-write', name: 'write_file', args: {} }
        ];

        await service.executeFunctionCallsWithResults(calls, 'conv-1', 7);

        expect(checkpointService.createToolExecutionCheckpoint).toHaveBeenNthCalledWith(
            1,
            'conv-1',
            7,
            'tool_batch',
            'before',
            ['read_file']
        );
        expect(checkpointService.createToolExecutionCheckpoint).toHaveBeenNthCalledWith(
            2,
            'conv-1',
            7,
            'tool_batch',
            'after',
            ['read_file']
        );
    });

    test('passes only executable tool names to checkpoint creation in progress execution', async () => {
        const toolRegistry = new ToolRegistry();
        toolRegistry.register(() => createTestTool('read_file'));
        toolRegistry.register(() => createTestTool('write_file'));

        const checkpointService = {
            createToolExecutionCheckpoint: jest.fn().mockResolvedValue(null)
        } as any;

        const service = new ToolExecutionService(
            toolRegistry,
            undefined,
            createSettingsManagerStub(),
            checkpointService
        );

        const calls: FunctionCallInfo[] = [
            { id: 'call-read', name: 'read_file', args: {} },
            { id: 'call-write', name: 'write_file', args: {} }
        ];

        await drainProgressExecution(service, calls, 'conv-2', 9);

        expect(checkpointService.createToolExecutionCheckpoint).toHaveBeenNthCalledWith(
            1,
            'conv-2',
            9,
            'tool_batch',
            'before',
            ['read_file']
        );
        expect(checkpointService.createToolExecutionCheckpoint).toHaveBeenNthCalledWith(
            2,
            'conv-2',
            9,
            'tool_batch',
            'after',
            ['read_file']
        );
    });
});
