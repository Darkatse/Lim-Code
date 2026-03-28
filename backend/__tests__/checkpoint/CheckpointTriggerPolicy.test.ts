import { isCheckpointRelevantTool, selectCheckpointTriggerTools } from '../../modules/checkpoint/CheckpointTriggerPolicy';

describe('CheckpointTriggerPolicy', () => {
    const config = {
        beforeTools: [
            'read_file',
            'write_file',
            'create_design',
            'todo_write'
        ],
        afterTools: [
            'search_in_files',
            'finalize_review'
        ]
    };

    test('selects only configured workspace-mutating tools from a mixed batch', () => {
        expect(
            selectCheckpointTriggerTools(config, 'before', [
                'read_file',
                'write_file',
                'create_design',
                'write_file'
            ])
        ).toEqual([
            'write_file',
            'create_design'
        ]);
    });

    test('treats review and design document tools as checkpoint-relevant workspace mutations', () => {
        expect(isCheckpointRelevantTool('create_design')).toBe(true);
        expect(isCheckpointRelevantTool('finalize_review')).toBe(true);
    });

    test('excludes metadata-only and read-only tools from checkpoint triggers', () => {
        expect(isCheckpointRelevantTool('todo_write')).toBe(false);
        expect(isCheckpointRelevantTool('read_file')).toBe(false);
        expect(
            selectCheckpointTriggerTools(config, 'after', [
                'search_in_files',
                'todo_write'
            ])
        ).toEqual([]);
    });
});
