/**
 * @author Dmitriy Bizyaev
 */

'use strict';

export const DESKTOP_ADD_TOOLS = 'DESKTOP_ADD_TOOLS';

export const addTools = newToolGroups => ({
    type: DESKTOP_ADD_TOOLS,
    newToolGroups
});

export const DESKTOP_COLLAPSE_TOOLS_PANEL = 'DESKTOP_COLLAPSE_TOOLS_PANEL';

export const collapseToolsPanel = () => ({
    type: DESKTOP_COLLAPSE_TOOLS_PANEL
});

export const DESKTOP_EXPAND_TOOLS_PANEL = 'DESKTOP_EXPAND_TOOLS_PANEL';

export const expandToolsPanel = () => ({
    type: DESKTOP_EXPAND_TOOLS_PANEL
});

export const DESKTOP_TOOL_DOCK = 'DESKTOP_TOOL_DOCK';

export const dockTool = toolId => ({
    type: DESKTOP_TOOL_DOCK,
    toolId
});

export const DESKTOP_TOOL_UNDOCK = 'DESKTOP_TOOL_UNDOCK';

export const undockTool = (toolId, nextActiveToolId) => ({
    type: DESKTOP_TOOL_UNDOCK,
    toolId,
    nextActiveToolId
});

export const DESKTOP_TOOL_FOCUS = 'DESKTOP_TOOL_FOCUS';

export const focusTool = toolId => ({
    type: DESKTOP_TOOL_FOCUS,
    toolId
});

export const DESKTOP_TOOL_SELECT = 'DESKTOP_TOOL_SELECT';

export const selectTool = toolId => ({
    type: DESKTOP_TOOL_SELECT,
    toolId
});

export const DESKTOP_TOOL_CLOSE = 'DESKTOP_TOOL_CLOSE';

export const closeTool = toolId => ({
    type: DESKTOP_TOOL_CLOSE,
    toolId
});

export const DESKTOP_TOOL_OPEN = 'DESKTOP_TOOL_OPEN';

export const openTool = toolId => ({
    type: DESKTOP_TOOL_OPEN,
    toolId
});

export const DESKTOP_SET_STICKY_TOOL = 'DESKTOP_SET_STICKY_TOOL';

export const setStickyTool = toolId => ({
    type: DESKTOP_SET_STICKY_TOOL,
    toolId
});