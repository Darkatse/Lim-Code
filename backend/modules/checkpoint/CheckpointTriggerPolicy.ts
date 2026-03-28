import type { CheckpointConfig } from '../settings/types';

const CHECKPOINT_RELEVANT_TOOL_NAMES = new Set<string>([
    'apply_diff',
    'write_file',
    'insert_code',
    'delete_code',
    'delete_file',
    'create_directory',
    'execute_command',
    'generate_image',
    'remove_background',
    'crop_image',
    'resize_image',
    'rotate_image',
    'create_plan',
    'create_design',
    'create_review',
    'record_review_milestone',
    'finalize_review',
    'subagents'
]);

export function isCheckpointRelevantTool(toolName: string): boolean {
    return CHECKPOINT_RELEVANT_TOOL_NAMES.has(toolName);
}

export function selectCheckpointTriggerTools(
    config: Pick<CheckpointConfig, 'beforeTools' | 'afterTools'>,
    phase: 'before' | 'after',
    toolNames: readonly string[]
): string[] {
    const configuredTools = new Set(phase === 'before' ? config.beforeTools : config.afterTools);
    const triggerTools = new Set<string>();

    for (const toolName of toolNames) {
        if (configuredTools.has(toolName) && isCheckpointRelevantTool(toolName)) {
            triggerTools.add(toolName);
        }
    }

    return [...triggerTools];
}
