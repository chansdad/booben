/**
 * @author Dmitriy Bizyaev
 */

'use strict';

import React, { PureComponent } from 'react';
import PropTypes from 'prop-types';
import ImmutablePropTypes from 'react-immutable-proptypes';
import { connect } from 'react-redux';
import Portal from 'react-portal';
import { createSelector } from 'reselect';
import { List } from 'immutable';

import {
  Dialog,
  Header,
  HeaderRegion,
  HeaderTitle,
  Panel,
  PanelContent,
  Button,
  Breadcrumbs,
} from '@reactackle/reactackle';

import { Desktop } from '../containers/Desktop/Desktop';

import {
  ComponentsLibrary,
} from '../containers/ComponentsLibrary/ComponentsLibrary';

import {
  ComponentsTreeView,
} from '../containers/ComponentsTreeView/ComponentsTreeView';

import {
  ComponentPropsEditor,
} from '../containers/ComponentPropsEditor/ComponentPropsEditor';

import {
  ComponentRegionsEditor,
} from '../containers/ComponentRegionsEditor/ComponentRegionsEditor';

import {
  ComponentActionsEditor,
} from '../containers/ComponentActionsEditor/ComponentActionsEditor';

import {
  ComponentStateSlotSelect,
} from '../containers/ComponentStateSlotSelect/ComponentStateSlotSelect';

import { Canvas, getComponentCoords } from '../containers/Canvas/Canvas';

import {
  ComponentLayoutSelection,
  ComponentLayoutSelectionItem,
} from '../components/ComponentLayoutSelection/ComponentLayoutSelection';

import {
  ComponentsDragArea,
} from '../containers/ComponentsDragArea/ComponentsDragArea';

import store from '../store';
import ProjectComponentRecord from '../models/ProjectComponent';
import ToolRecord from '../models/Tool';
import ToolSectionRecord from '../models/ToolSection';
import ButtonRecord from '../models/Button';

import {
  renameComponent,
  deleteComponent,
  selectLayoutForNewComponent,
  saveComponentForProp,
  cancelConstructComponentForProp,
  pickComponentStateSlotDone,
} from '../actions/project';

import { dropComponent, ComponentDropAreas } from '../actions/preview';

import {
  haveNestedConstructorsSelector,
  singleComponentSelectedSelector,
  firstSelectedComponentIdSelector,
  currentComponentsSelector,
  getLocalizedTextFromState,
  containerStyleSelector,
} from '../selectors';

import {
  getComponentMeta,
  isCompositeComponent,
  getString,
  getComponentPropName,
  componentHasActions,
} from '../utils/meta';

import { returnTrue } from '../utils/misc';

import {
  TOOL_ID_LIBRARY,
  TOOL_ID_COMPONENTS_TREE,
  TOOL_ID_PROPS_EDITOR,
} from '../constants/toolIds';

import defaultComponentLayoutIcon from '../../assets/layout_default.svg';

export const DESIGN_TOOL_IDS = List([
  TOOL_ID_LIBRARY,
  TOOL_ID_COMPONENTS_TREE,
  TOOL_ID_PROPS_EDITOR,
]);

const propTypes = {
  params: PropTypes.shape({
    projectName: PropTypes.string.isRequired,
  }).isRequired,
  components: ImmutablePropTypes.mapOf(
    PropTypes.instanceOf(ProjectComponentRecord),
    PropTypes.number,
  ),
  meta: PropTypes.object,
  previewContainerStyle: PropTypes.string,
  singleComponentSelected: PropTypes.bool,
  firstSelectedComponentId: PropTypes.number,
  selectingComponentLayout: PropTypes.bool,
  draggedComponents: ImmutablePropTypes.mapOf(
    PropTypes.instanceOf(ProjectComponentRecord),
    PropTypes.number,
  ),
  language: PropTypes.string,
  haveNestedConstructor: PropTypes.bool,
  nestedConstructorBreadcrumbs: ImmutablePropTypes.listOf(PropTypes.string),
  pickedComponentId: PropTypes.number.isRequired,
  componentStateSlotsListIsVisible: PropTypes.bool.isRequired,
  isCompatibleStateSlot: PropTypes.func.isRequired,
  getLocalizedText: PropTypes.func.isRequired,
  onRenameComponent: PropTypes.func.isRequired,
  onDeleteComponent: PropTypes.func.isRequired,
  onSelectLayout: PropTypes.func.isRequired,
  onSaveComponentForProp: PropTypes.func.isRequired,
  onCancelConstructComponentForProp: PropTypes.func.isRequired,
  onDropComponent: PropTypes.func.isRequired,
  onSelectComponentStateSlot: PropTypes.func.isRequired,
};

const LIBRARY_ICON = 'cubes';
const COMPONENTS_TREE_ICON = 'sitemap';
const PROPS_EDITOR_ICON = 'sliders';

const nestedConstructorBreadcrumbsSelector = createSelector(
  state => state.project.data,
  state => state.project.currentRouteId,
  state => state.project.nestedConstructors,
  state => state.project.meta,
  state => state.project.languageForComponentProps,

  (project, currentRouteId, nestedConstructors, meta, language) => {
    const returnEmpty =
      !project ||
      currentRouteId === -1 ||
      nestedConstructors.isEmpty();

    if (returnEmpty) return List();
    
    const initialAccumulator = {
      ret: List(),
      components: project.routes.get(currentRouteId).components,
    };
    
    const reducer = (acc, cur) => {
      const componentId = cur.path.steps[0];
      const isSystemProp = cur.path.steps[1] === 'systemProps';
      const prop = cur.path.steps[2];
      const component = acc.components.get(componentId);
      const title = component.title || component.name;
      const componentMeta = getComponentMeta(component.name, meta);
      const propName = isSystemProp
        ? prop
        : getComponentPropName(componentMeta, prop, language);
  
      return {
        ret: acc.ret.push(title, propName),
        components: cur.components,
      };
    };
    
    return nestedConstructors.reduceRight(reducer, initialAccumulator).ret;
  },
);

const mapStateToProps = state => ({
  components: currentComponentsSelector(state),
  meta: state.project.meta,
  previewContainerStyle: containerStyleSelector(state),
  singleComponentSelected: singleComponentSelectedSelector(state),
  firstSelectedComponentId: firstSelectedComponentIdSelector(state),
  selectingComponentLayout: state.project.selectingComponentLayout,
  draggedComponents: state.project.draggedComponents,
  language: state.project.languageForComponentProps,
  haveNestedConstructor: haveNestedConstructorsSelector(state),
  nestedConstructorBreadcrumbs: nestedConstructorBreadcrumbsSelector(state),
  pickedComponentId: state.project.pickedComponentId,
  componentStateSlotsListIsVisible:
    state.project.componentStateSlotsListIsVisible,
  
  isCompatibleStateSlot:
    state.project.pickingComponentStateSlotsFilter ||
    returnTrue,
  
  getLocalizedText: getLocalizedTextFromState(state),
});

const mapDispatchToProps = dispatch => ({
  onRenameComponent: (componentId, newTitle) =>
    void dispatch(renameComponent(componentId, newTitle)),
  
  onDeleteComponent: componentId =>
    void dispatch(deleteComponent(componentId)),
  
  onSelectLayout: layoutIdx =>
    void dispatch(selectLayoutForNewComponent(layoutIdx)),
  
  onSaveComponentForProp: () =>
    void dispatch(saveComponentForProp()),
  
  onCancelConstructComponentForProp: () =>
    void dispatch(cancelConstructComponentForProp()),
  
  onDropComponent: area =>
    void dispatch(dropComponent(area)),
  
  onSelectComponentStateSlot: ({ stateSlot }) =>
    void dispatch(pickComponentStateSlotDone(stateSlot)),
});

/* eslint-disable react/prop-types */
const NestedConstructorsBreadcrumbsItem = props => (
  <span className={props.className}>
    {props.children}
  </span>
);
/* eslint-enable react/prop-types */

class DesignRoute extends PureComponent {
  constructor(props, context) {
    super(props, context);
    
    this._canvas = null;

    this.state = {
      confirmDeleteComponentDialogIsVisible: false,
    };

    this._handleToolTitleChange =
      this._handleToolTitleChange.bind(this);
    this._handleDeleteComponentButtonPress =
      this._handleDeleteComponentButtonPress.bind(this);
    this._handleDeleteComponentConfirm =
      this._handleDeleteComponentConfirm.bind(this);
    this._handleDeleteComponentCancel =
      this._handleDeleteComponentCancel.bind(this);
    this._handleConfirmDeleteComponentDialogClose =
      this._handleConfirmDeleteComponentDialogClose.bind(this);
    this._handleLayoutSelection =
      this._handleLayoutSelection.bind(this);
    this._handleDropComponent =
      this._handleDropComponent.bind(this);
  }
  
  _getLibraryTool() {
    const { getLocalizedText } = this.props;
    
    return new ToolRecord({
      id: TOOL_ID_LIBRARY,
      icon: LIBRARY_ICON,
      name: getLocalizedText('design.tool.componentsLibrary'),
      title: getLocalizedText('design.tool.componentsLibrary'),
      sections: List([
        new ToolSectionRecord({
          name: '',
          component: ComponentsLibrary,
        }),
      ]),
      windowMinWidth: 360,
    });
  }
  
  _getTreeTool() {
    const { getLocalizedText } = this.props;
    
    return new ToolRecord({
      id: TOOL_ID_COMPONENTS_TREE,
      icon: COMPONENTS_TREE_ICON,
      name: getLocalizedText('design.tool.elementsTree'),
      title: getLocalizedText('design.tool.elementsTree'),
      sections: List([
        new ToolSectionRecord({
          name: '',
          component: ComponentsTreeView,
        }),
      ]),
    });
  }
  
  _getPropsEditorTool() {
    const {
      meta,
      components,
      singleComponentSelected,
      firstSelectedComponentId,
      getLocalizedText,
    } = this.props;
    
    const propsEditorSection = new ToolSectionRecord({
      name: 'General',
      component: ComponentPropsEditor,
    });
  
    let title = '';
    let subtitle = '';
    let mainButtons = List();
    let sections = List([propsEditorSection]);
  
    if (singleComponentSelected) {
      const selectedComponent = components.get(firstSelectedComponentId);
      const parentComponent = selectedComponent.parentId > -1
        ? components.get(selectedComponent.parentId)
        : null;
    
      const isRegion = parentComponent
        ? isCompositeComponent(parentComponent.name, meta)
        : false;
    
      title = selectedComponent.title;
      subtitle = selectedComponent.name;
    
      if (!isRegion) {
        if (!selectedComponent.isWrapper) {
          mainButtons = mainButtons.push(
            new ButtonRecord({
              text: getLocalizedText('common.delete'),
              onPress: this._handleDeleteComponentButtonPress,
            }),
          );
        }
      
        if (isCompositeComponent(selectedComponent.name, meta)) {
          sections = sections.push(
            new ToolSectionRecord({
              name: 'Regions',
              component: ComponentRegionsEditor,
            }),
          );
        }
      }
  
      const selectedComponentMeta =
        getComponentMeta(selectedComponent.name, meta);
      
      if (componentHasActions(selectedComponentMeta)) {
        sections = sections.push(
          new ToolSectionRecord({
            name: 'Actions',
            component: ComponentActionsEditor,
          }),
        );
      }
    } else {
      title = getLocalizedText('design.tool.componentConfiguration');
    }

    const name = getLocalizedText('design.tool.componentConfiguration');
    const titlePlaceholder =
      getLocalizedText('design.tool.componentConfiguration.enterTitle');
    
    return new ToolRecord({
      id: TOOL_ID_PROPS_EDITOR,
      icon: PROPS_EDITOR_ICON,
      name,
      title,
      titleEditable: singleComponentSelected,
      titlePlaceholder,
      subtitle,
      mainButtons,
      sections,
    });
  }
  
  _getTools() {
    const libraryTool = this._getLibraryTool();
    const treeTool = this._getTreeTool();
    const propsEditorTool = this._getPropsEditorTool();
    return List([List([libraryTool, treeTool, propsEditorTool])]);
  }

  /**
   *
   * @param {Object} tool
   * @param {string} newTitle
   * @private
   */
  _handleToolTitleChange(tool, newTitle) {
    if (tool.id === TOOL_ID_PROPS_EDITOR) {
      this.props.onRenameComponent(
        this.props.firstSelectedComponentId,
        newTitle,
      );
    }
  }

    /**
     *
     * @private
     */
  _handleDeleteComponentButtonPress() {
    this.setState({
      confirmDeleteComponentDialogIsVisible: true,
    });
  }

    /**
     *
     * @param {Function} closeDialog
     * @private
     */
  _handleDeleteComponentConfirm(closeDialog) {
    const { firstSelectedComponentId, onDeleteComponent } = this.props;
    onDeleteComponent(firstSelectedComponentId);
    closeDialog();
  }

    /**
     *
     * @param {Function} closeDialog
     * @private
     */
  _handleDeleteComponentCancel(closeDialog) {
    closeDialog();
  }

    /**
     *
     * @private
     */
  _handleConfirmDeleteComponentDialogClose() {
    this.setState({
      confirmDeleteComponentDialogIsVisible: false,
    });
  }
  
  /**
   *
   * @param {number} layoutIdx
   * @private
   */
  _handleLayoutSelection({ layoutIdx }) {
    this.props.onSelectLayout(layoutIdx);
  }

  /**
   *
   * @private
   */
  _handleDropComponent({ dropZoneId }) {
    const { onDropComponent } = this.props;
    onDropComponent(dropZoneId);
  }
  
  /**
   *
   * @return {?ReactElement}
   * @private
   */
  _renderLayoutSelectionDialogContent() {
    const {
      meta,
      language,
      selectingComponentLayout,
      draggedComponents,
    } = this.props;
    
    if (!selectingComponentLayout) return null;
  
    const draggedComponent = draggedComponents.get(0);
    const draggedComponentMeta = getComponentMeta(draggedComponent.name, meta);
  
    const items = draggedComponentMeta.layouts.map((layout, idx) => {
      const icon = layout.icon || defaultComponentLayoutIcon;
      const title = getString(
        draggedComponentMeta.strings,
        layout.textKey,
        language,
      );
      
      const subtitle = getString(
        draggedComponentMeta.strings,
        layout.descriptionTextKey,
        language,
      );
    
      return (
        <ComponentLayoutSelectionItem
          key={String(idx)}
          layoutIdx={idx}
          image={icon}
          title={title}
          subtitle={subtitle}
          onSelect={this._handleLayoutSelection}
        />
      );
    });
  
    //noinspection JSValidateTypes
    return (
      <ComponentLayoutSelection>
        {items}
      </ComponentLayoutSelection>
    );
  }
  
  /**
   *
   * @return {ReactElement}
   * @private
   */
  _renderContent() {
    const {
      params,
      previewContainerStyle,
      nestedConstructorBreadcrumbs,
      haveNestedConstructor,
      getLocalizedText,
      onCancelConstructComponentForProp,
      onSaveComponentForProp,
    } = this.props;
  
    const canvas = (
      <Canvas
        interactive
        projectName={params.projectName}
        store={store}
        containerStyle={previewContainerStyle}
        dropZoneId={ComponentDropAreas.CANVAS}
      />
    );
    
    if (haveNestedConstructor) {
      const breadcrumbsItems = nestedConstructorBreadcrumbs
        .toArray()
        .map(item => ({ title: item }));
    
      //noinspection JSValidateTypes
      return (
        <Panel headerFixed spread height="auto" maxHeight="none">
          <Header>
            <HeaderRegion spread alignY="center">
              <HeaderTitle>
                <Breadcrumbs
                  items={breadcrumbsItems}
                  mode="light"
                  linkComponent={NestedConstructorsBreadcrumbsItem}
                />
              </HeaderTitle>
            </HeaderRegion>
            <HeaderRegion>
              <Button
                text={getLocalizedText('common.cancel')}
                light
                onPress={onCancelConstructComponentForProp}
              />
            
              <Button
                text={getLocalizedText('common.ok')}
                light
                onPress={onSaveComponentForProp}
              />
            </HeaderRegion>
          </Header>
        
          <PanelContent key="canvas-panel-content" flex>
            {canvas}
          </PanelContent>
        </Panel>
      );
    } else {
      return (
        <Panel spread height="auto" maxHeight="none">
          <PanelContent key="canvas-panel-content" flex>
            {canvas}
          </PanelContent>
        </Panel>
      );
    }
  }
  
  _renderStateSlotSelect() {
    const {
      meta,
      components,
      pickedComponentId,
      isCompatibleStateSlot,
      language,
      onSelectComponentStateSlot,
    } = this.props;
    
    const component = components.get(pickedComponentId);
    const componentMeta = getComponentMeta(component.name, meta);
    const componentElementCoords = getComponentCoords(pickedComponentId);
    
    if (!componentElementCoords) return null;
    
    const wrapperStyle = {
      position: 'absolute',
      zIndex: '1000',
      left: `${componentElementCoords.x}px`,
      top: `${componentElementCoords.y}px`,
    };
    
    return (
      <Portal isOpened>
        <div style={wrapperStyle}>
          <ComponentStateSlotSelect
            componentMeta={componentMeta}
            isCompatibleStateSlot={isCompatibleStateSlot}
            language={language}
            onSelect={onSelectComponentStateSlot}
          />
        </div>
      </Portal>
    );
  }

  render() {
    const {
      components,
      selectingComponentLayout,
      firstSelectedComponentId,
      componentStateSlotsListIsVisible,
      getLocalizedText,
    } = this.props;

    const { confirmDeleteComponentDialogIsVisible } = this.state;

    const layoutSelectionDialogContent =
      this._renderLayoutSelectionDialogContent();

    const confirmDeleteDialogButtons = [{
      text: getLocalizedText('common.delete'),
      onPress: this._handleDeleteComponentConfirm,
    }, {
      text: getLocalizedText('common.cancel'),
      onPress: this._handleDeleteComponentCancel,
    }];
  
    const toolGroups = this._getTools();
    const content = this._renderContent();

    let deleteComponentDialogText = '';
    if (confirmDeleteComponentDialogIsVisible) {
      const selectedComponent = components.get(firstSelectedComponentId);
      const componentTitle = selectedComponent.title || selectedComponent.name;

      deleteComponentDialogText = getLocalizedText(
        'design.deleteComponentQuestion',
        { title: componentTitle },
      );
    }
    
    let componentStateSlotSelect = null;
    if (componentStateSlotsListIsVisible)
      componentStateSlotSelect = this._renderStateSlotSelect();

    return (
      <Desktop
        toolGroups={toolGroups}
        onToolTitleChange={this._handleToolTitleChange}
      >
        {content}
        
        <Dialog
          title={getLocalizedText('design.selectLayout')}
          backdrop
          minWidth={400}
          visible={selectingComponentLayout}
        >
          {layoutSelectionDialogContent}
        </Dialog>

        <Dialog
          title={getLocalizedText('design.deleteComponent')}
          backdrop
          minWidth={400}
          buttons={confirmDeleteDialogButtons}
          visible={confirmDeleteComponentDialogIsVisible}
          closeOnEscape
          closeOnBackdropClick
          onClose={this._handleConfirmDeleteComponentDialogClose}
          onEnterKeyPress={this._handleDeleteComponentConfirm}
        >
          {deleteComponentDialogText}
        </Dialog>

        <Portal isOpened>
          <ComponentsDragArea
            onDrop={this._handleDropComponent}
          />
        </Portal>
        
        {componentStateSlotSelect}
      </Desktop>
    );
  }
}

DesignRoute.displayName = 'DesignRoute';
DesignRoute.propTypes = propTypes;

export default connect(
  mapStateToProps,
  mapDispatchToProps,
)(DesignRoute);
