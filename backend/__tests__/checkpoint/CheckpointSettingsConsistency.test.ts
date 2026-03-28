import { ToolRegistry } from '../../tools/ToolRegistry';
import type { Tool } from '../../tools/types';
import { SettingsHandler } from '../../modules/api/settings/SettingsHandler';
import { SettingsManager, type SettingsStorage } from '../../modules/settings/SettingsManager';

function createInMemoryStorage(): SettingsStorage {
    return {
        load: jest.fn().mockResolvedValue(null),
        save: jest.fn().mockResolvedValue(undefined)
    };
}

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

describe('Checkpoint settings consistency', () => {
    test('SettingsManager single-tool helpers follow checkpoint trigger policy', async () => {
        const settingsManager = new SettingsManager(createInMemoryStorage());
        await settingsManager.initialize();
        await settingsManager.updateCheckpointConfig({
            beforeTools: ['read_file', 'write_file'],
            afterTools: ['search_in_files', 'create_review']
        });

        expect(settingsManager.shouldCreateBeforeCheckpoint('read_file')).toBe(false);
        expect(settingsManager.shouldCreateBeforeCheckpoint('write_file')).toBe(true);
        expect(settingsManager.shouldCreateAfterCheckpoint('search_in_files')).toBe(false);
        expect(settingsManager.shouldCreateAfterCheckpoint('create_review')).toBe(true);
    });

    test('SettingsHandler annotates tools with checkpoint relevance from the shared policy', async () => {
        const settingsManager = {
            isToolEnabled: jest.fn().mockReturnValue(true),
            getProxySettings: jest.fn().mockReturnValue(undefined)
        } as any;

        const toolRegistry = new ToolRegistry();
        toolRegistry.register(() => createTestTool('read_file'));
        toolRegistry.register(() => createTestTool('write_file'));
        toolRegistry.register(() => createTestTool('create_review'));

        const handler = new SettingsHandler(settingsManager, toolRegistry);
        const response = await handler.getToolsList({});

        expect(response.success).toBe(true);
        if (!response.success) {
            return;
        }

        const toolsByName = new Map(response.tools.map(tool => [tool.name, tool]));
        expect(toolsByName.get('read_file')?.checkpointRelevant).toBe(false);
        expect(toolsByName.get('write_file')?.checkpointRelevant).toBe(true);
        expect(toolsByName.get('create_review')?.checkpointRelevant).toBe(true);
    });
});
