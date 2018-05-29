import React from 'react';
import PropTypes from 'prop-types';
import { List, Map } from 'immutable';

import {
  PageDrawer,
  PageDrawerActionsArea,
  PageDrawerActionsGroup,
  PageDrawerActionItem,
  PageDrawerActionPlaceholder,
} from '../../../components/PageDrawer';

import { ToolPanelContent } from './ToolPanelContent/ToolPanelContent';
import resizeable from '../../../hocs/resizeable';
import ToolState from '../../../models/ToolState';
import { noop } from '../../../utils/misc';
import * as JssyPropTypes from '../../../constants/common-prop-types';
import { DESKTOP_PANEL_MIN_WIDTH } from '../../../config';
import { IconArrowChevronLeft } from '../../../components/icons';

import {
  ToolPanelCommonActions,
} from './ToolPanelCommonActions/ToolPanelCommonActions';

/* eslint-disable react/no-unused-prop-types */
const propTypes = {
  toolGroups: JssyPropTypes.toolGroups,
  toolStates: JssyPropTypes.toolStates,
  isLeftExpanded: PropTypes.bool,
  isRightExpanded: PropTypes.bool,
  onCollapse: PropTypes.func,
  onExpand: PropTypes.func,
  onToolUndock: PropTypes.func,
  onToolSelect: PropTypes.func,
  onToolTitleChange: PropTypes.func,
  onToolActiveSectionChange: PropTypes.func,
};
/* eslint-enable react/no-unused-prop-types */

const defaultProps = {
  toolGroups: List(),
  toolStates: Map(),
  isLeftExpanded: false,
  isRightExpanded: false,
  onCollapse: noop,
  onExpand: noop,
  onToolUndock: noop,
  onToolSelect: noop,
  onToolTitleChange: noop,
  onToolActiveSectionChange: noop,
};

const ResizeablePageDrawer = resizeable(PageDrawer);

export const ToolPanel = props => {
  const activeTool = {
    left: null,
    right: null,
  };
  const shadowedTool = {
    left: null,
    right: null,
  };

  const panelSwitcherGroups = {
    left: [],
    right: [],
  };

  props.toolGroups.forEach((tools, groupIdx) => {
    const icons = {
      left: [],
      right: [],
    };
   
    tools.forEach(tool => {
      const toolState = props.toolStates.get(tool.id) || new ToolState();
      const iconsGroup = icons[toolState.position];
      if (toolState.closed) return;
      
      if (toolState.isInDockRegion) {
        iconsGroup.push(
          <PageDrawerActionPlaceholder key={tool.id} />,
        );
      } else if (toolState.docked) {
        if (toolState.isActiveInToolsPanel) {
          activeTool[toolState.position] = tool;
        } else if (toolState.isShadowedInToolsPanel) {
          shadowedTool[toolState.position] = tool;
        }
        
        iconsGroup.push(
          <PageDrawerActionItem
            key={tool.id}
            icon={tool.icon}
            title={tool.name}
            isActive={toolState.isActiveInToolsPanel}
            onPress={() => props.onToolSelect(tool)}
          />,
        );
      }
    });

    Object.keys(icons).forEach(position => {
      const iconsGroup = icons[position];
      if (iconsGroup.length > 0) {
        panelSwitcherGroups[position].push(
          <PageDrawerActionsGroup key={String(groupIdx)}>
            {iconsGroup}
          </PageDrawerActionsGroup>,
        );
      }
    });
  });

  console.log(activeTool);
  console.log(shadowedTool);

  const panelContent = {
    left: null,
    right: null,
  };

  const shadowedPanelContent = {
    left: null,
    right: null,
  };
  let isExpanded = false;

  Object.keys(activeTool).forEach(position => {
    if (activeTool[position] !== null) {
      const activeToolState =
        props.toolStates.get(activeTool[position].id) ||
        new ToolState();
  
      const onTitleChange = newTitle =>
        props.onToolTitleChange(activeTool[position], newTitle);
  
      const onUndock = () => {
        let nextActiveTool = null;
  
        /* eslint-disable consistent-return */
        props.toolGroups.forEach(tools => {
          tools.forEach(tool => {
            if (tool !== activeTool[position]) {
              nextActiveTool = tool;
              return false;
            }
          });
  
          if (nextActiveTool !== null) return false;
        });
        /* eslint-enable consistent-return */
  
        props.onToolUndock(activeTool[position], nextActiveTool);
      };
  
      const onActiveSectionChange = ({ newActiveSection }) =>
        props.onToolActiveSectionChange(activeTool[position], newActiveSection);

      panelContent[position] = (
        <ToolPanelContent
          key={`tool-panel-content-${activeTool[position].id}`}
          tool={activeTool[position]}
          toolState={activeToolState}
          onTitleChange={onTitleChange}
          onUndock={onUndock}
          onActiveSectionChange={onActiveSectionChange}
          onCollapse={() => props.onCollapse(position)}
        />
      );
  
      isExpanded = {
        left: props.isLeftExpanded,
        right: props.isRightExpanded,
      };
    }
  });

  Object.keys(shadowedTool).forEach(position => {
    if (shadowedTool[position] !== null) {
      const shadowedToolState =
        props.toolStates.get(shadowedTool[position].id) ||
        new ToolState();
  
      shadowedPanelContent[position] = (
        <ToolPanelContent
          key={`tool-panel-content-${shadowedTool[position].id}`}
          tool={shadowedTool[position]}
          toolState={shadowedToolState}
          shadowed
        />
      );
    }
  });

  const pageDrawerHasActions = {
    left: false,
    right: false,
  };

  Object.keys(panelSwitcherGroups).forEach(position => {
    pageDrawerHasActions[position] = panelSwitcherGroups[position].length > 0;
    if (!isExpanded[position] && pageDrawerHasActions[position]) {
      const expandActionGroup = (
        <PageDrawerActionsGroup key="expand">
          <PageDrawerActionItem
            icon={<IconArrowChevronLeft />}
            onPress={() => props.onExpand(position)}
          />
        </PageDrawerActionsGroup>
      );
  
      panelSwitcherGroups[position].unshift(expandActionGroup);
    }
  });
  
  const renderPageDrawer = position => (
    <ResizeablePageDrawer
      key={`page-drawer-${position}`}
      resizeEnabled={isExpanded[position]}
      resizeSides={['left']}
      resizeMinWidth={DESKTOP_PANEL_MIN_WIDTH}
      resizeMaxWidth={Math.round(window.innerWidth / 2)}
      isExpanded={isExpanded[position]}
      hasActions={pageDrawerHasActions[position]}
      position={position}
    >
      <PageDrawerActionsArea>
        <PageDrawerActionsGroup spread>
          {panelSwitcherGroups[position]}
        </PageDrawerActionsGroup>
        <ToolPanelCommonActions />
      </PageDrawerActionsArea>

      {shadowedPanelContent[position]}
      {panelContent[position]}
    </ResizeablePageDrawer>
  );

  return [
    renderPageDrawer('left'),
    renderPageDrawer('right'),
  ];
};

ToolPanel.propTypes = propTypes;
ToolPanel.defaultProps = defaultProps;
ToolPanel.displayName = 'ToolPanel';
