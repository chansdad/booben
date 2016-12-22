'use strict';

// noinspection JSUnresolvedVariable
import React, { PureComponent, PropTypes } from 'react';
import { connect } from 'react-redux';
import { graphql } from 'react-apollo';
import _merge from 'lodash.merge';
import _mapValues from 'lodash.mapvalues';
import { List } from 'immutable';

import { getComponentById } from '../../app/models/Project';
import jssyConstants from '../../app/constants/jssyConstants';
import { NO_VALUE } from '../../app/constants/misc';

import { ContentPlaceholder } from '../components/ContentPlaceholder';
import { Outlet } from '../components/Outlet';

import { currentSelectedComponentIdsSelector } from '../../app/selectors';

import getComponentByName from '../getComponentByName';
import isPseudoComponent from '../isPseudoComponent';

import {
    isContainerComponent,
    isCompositeComponent,
    canInsertComponent,
    getComponentMeta,
} from '../../app/utils/meta';

import {
    buildQueryForComponent,
    mapDataToComponentProps,
    extractPropValueFromData,
} from '../../app/utils/graphql';

import {
    getFunctionInfo,
} from '../../app/utils/functions';

import {
    returnNull,
} from '../../app/utils/misc';

class BuilderComponent extends PureComponent {
    /**
     *
     * @param {Object} propValue
     * @param {Object} theMap
     * @return {Function}
     */
  _makeBuilderForProp(propValue, theMap) {
    return props => (
      <Builder
        components={propValue.sourceData.components}
        rootId={propValue.sourceData.rootId}
        dontPatch
        propsFromOwner={props}
        theMap={theMap}
        dataContextInfo={theMap.get(propValue)}
        children={props.children}
      />
        );
  }

    /**
     *
     * @param {Object} propValue
     * @param {TypeDefinition} typedef
     * @param {Immutable.Map<Object, Object>} theMap
     * @return {*}
     */
  _buildPropValue(propValue, typedef, theMap) {
    if (propValue.source == 'static') {
      if (propValue.sourceData.ownerPropName && !this.props.ignoreOwnerProps) {
        return this.props.propsFromOwner[propValue.sourceData.ownerPropName];
      } else if (typedef.type === 'shape') {
        if (propValue.sourceData.value === null) return null;

        return _mapValues(typedef.fields, (fieldMeta, fieldName) => {
          const fieldValue = propValue.sourceData.value.get(fieldName);

          return this._buildPropValue(
                            fieldValue,
                            fieldMeta,
                            theMap,
                        );
        });
      } else if (typedef.type === 'objectOf') {
        if (propValue.sourceData.value === null) return null;

        return propValue.sourceData.value.map(nestedValue =>
                        this._buildPropValue(
                            nestedValue,
                            typedef.ofType,
                            theMap,
                        ),
                    ).toJS();
      } else if (typedef.type === 'arrayOf') {
        return propValue.sourceData.value.map(nestedValue =>
                        this._buildPropValue(
                            nestedValue,
                            typedef.ofType,
                            theMap,
                        ),
                    ).toJS();
      } else {
        return propValue.sourceData.value;
      }
    } else if (propValue.source === 'const') {
      if (propValue.sourceData.jssyConstId)
        return jssyConstants[propValue.sourceData.jssyConstId];

      else
                return propValue.sourceData.value;
    } else if (propValue.source === 'designer') {
      if (propValue.sourceData.components && propValue.sourceData.rootId > -1)
        return this._makeBuilderForProp(propValue, theMap);

      else
                return returnNull;
    } else if (propValue.source === 'data') {
      if (propValue.sourceData.dataContext.size > 0 && this.props.dataContextInfo) {
        const dataContextInfo =
                    this.props.dataContextInfo[propValue.sourceData.dataContext.last()];

        const data = this.props.propsFromOwner[dataContextInfo.ownerPropName];

        return extractPropValueFromData(
                    propValue,
                    data,
                    this.props.schema,
                    dataContextInfo.type,
                );
      }
    } else if (propValue.source === 'function') {
      const fnInfo = getFunctionInfo(
                propValue.sourceData.functionSource,
                propValue.sourceData.function,
                this.props.project,
            );

      if (!fnInfo) return NO_VALUE;

      const argValues = fnInfo.args.map(argInfo => {
        const argValue = propValue.sourceData.args.get(argInfo.name);

        let ret = NO_VALUE;

        if (argValue) {
          ret = this._buildPropValue(
                        argValue,
                        argInfo.typedef,
                        theMap,
                    );
        }

        if (ret === NO_VALUE) ret = argInfo.defaultValue;
        return ret;
      });

            // TODO: Pass fns as last argument
      return fnInfo.fn(...argValues, {});
    } else if (propValue.source === 'actions') {
            // TODO: Handle actions source
    }

    return NO_VALUE;
  }

    /**
     * Constructs props object
     *
     * @param {Object} component
     * @param {Immutable.Map<Object, Object>} theMap
     * @return {Object<string, *>}
     */
  _buildProps(component, theMap) {
    const componentMeta = getComponentMeta(component.name, this.props.meta);

    const ret = {};

    component.props.forEach((propValue, propName) => {
      const propMeta = componentMeta.props[propName];

      const value = this._buildPropValue(
                propValue,
                propMeta,
                theMap,
            );

      if (value !== NO_VALUE) ret[propName] = value;
    });

    return ret;
  }

    /**
     *
     * @param {Object} component
     * @return {*}
     * @private
     */
  _renderPseudoComponent(component) {
    if (component.name === 'Outlet') {
      return this.props.children || <Outlet />;
    } else if (component.name === 'Text') {
      const props = this._buildProps(component);
      return props.text || '';
    } else if (component.name === 'List') {
      const props = this._buildProps(component),
        ItemComponent = props.component;

      return props.data.map((item, idx) => (
        <ItemComponent key={idx} item={item} />
            ));
    }
  }

    /**
     *
     * @param {number} containerId
     * @param {number} afterIdx
     * @return {ReactElement}
     * @private
     */
  _renderPlaceholderForDraggedComponent(containerId, afterIdx) {
    const rootDraggedComponentId = this.props.draggedComponentId > -1
            ? this.props.draggedComponentId
            : 0;

    const rootDraggedComponent =
            this.props.draggedComponents.get(rootDraggedComponentId);

    const containerComponent = containerId > -1
            ? this.props.components.get(containerId)
            : this.props.enclosingComponentId > -1
                ? getComponentById(
                    this.props.project,
                    this.props.enclosingComponentId,
                )
                : null;

    let canDropHere = true;
    if (containerComponent) {
      const containerChildrenNames = containerComponent.children
                .map(id => this.props.components.get(id).name);

      canDropHere = canInsertComponent(
                rootDraggedComponent.name,
                containerComponent.name,
                containerChildrenNames,
                afterIdx + 1,
                this.props.meta,
            );
    }

    if (!canDropHere) return null;

    const key = `placeholder-${containerId}:${afterIdx}`;

        // noinspection JSValidateTypes
    return (
      <Builder
        key={key}
        components={this.props.draggedComponents}
        rootId={rootDraggedComponentId}
        isPlaceholder
        afterIdx={afterIdx}
        containerId={containerId}
      />
    );
  }

    /**
     *
     * @param {ProjectComponent} component
     * @param {boolean} [isPlaceholder=false]
     * @return {?ReactElement[]}
     * @private
     */
  _renderComponentChildren(component, isPlaceholder = false) {
    if (component.children.size === 0) return null;

    const ret = [];

    const isComposite = isCompositeComponent(component.name, this.props.meta);

    component.children.forEach((childComponentId, idx) => {
      const childComponent = this.props.components.get(childComponentId);

            // Do not render disabled regions in composite components
      if (!isPlaceholder && isComposite && !component.regionsEnabled.has(idx))
        return;

      const needPlaceholders =
                !isPlaceholder &&
                this.props.draggingComponent &&
                childComponent.id === this.props.draggingOverComponentId;

      if (needPlaceholders) {
                // Render placeholders for the component being dragged
                // before and after the component user is dragging over
        ret.push(this._renderPlaceholderForDraggedComponent(
                    component.id,
                    idx - 1,
                ));
        ret.push(this._renderComponent(childComponent, isPlaceholder));
        ret.push(this._renderPlaceholderForDraggedComponent(
                    component.id,
                    idx,
                ));
      } else {
        ret.push(this._renderComponent(childComponent, isPlaceholder));
      }
    });

    return ret;
  }

    /**
     *
     * @param {Object} props
     * @param {boolean} isHTMLComponent
     * @param {number} componentId
     * @private
     */
  _patchComponentProps(props, isHTMLComponent, componentId) {
    if (isHTMLComponent) props['data-jssy-id'] = componentId;
    else props.__jssy_component_id__ = componentId;
  }

    /**
     *
     * @param {Object} props
     * @param {boolean} isHTMLComponent
     * @private
     */
  _patchPlaceholderRootProps(props, isHTMLComponent) {
    if (isHTMLComponent) {
      props['data-jssy-placeholder'] = '';
      props['data-jssy-after'] = this.props.afterIdx;
      props['data-jssy-container-id'] = this.props.containerId;
    } else {
      props.__jssy_placeholder__ = true;
      props.__jssy_after__ = this.props.afterIdx;
      props.__jssy_container_id__ = this.props.containerId;
    }
  }

  _willRenderContentPlaceholder(component) {
    return this.props.showContentPlaceholders ||
            this.props.selectedComponentIds.has(component.id);
  }

    /**
     *
     * @param {Object} component
     * @param {boolean} [isPlaceholder=false]
     * @param {boolean} [isPlaceholderRoot=false]
     * @return {ReactElement}
     * @private
     */
  _renderComponent(component, isPlaceholder = false, isPlaceholderRoot = false) {
        // Do not render component that's being dragged right now
    if (component.id === this.props.draggedComponentId && !isPlaceholder) return null;

        // Handle special components like Text, Outlet etc.
    if (isPseudoComponent(component)) return this._renderPseudoComponent(component);

        // Get component class
    const Component = getComponentByName(component.name),
      isHTMLComponent = typeof Component === 'string';

        // Build GraphQL query
    const { query: graphQLQuery, theMap } = buildQueryForComponent(
            component,
            this.props.schema,
            this.props.meta,
            this.props.project,
        );

        // Build props
    const props = this._buildProps(
            component,
            this.props.theMap ? this.props.theMap.merge(theMap) : theMap,
        );

        // Render children
    props.children = this._renderComponentChildren(component, isPlaceholder);

    if (!isPlaceholder) {
      props.key = component.id;

      if (!this.props.dontPatch)
        this._patchComponentProps(props, isHTMLComponent, component.id);

      if (this.props.draggingComponent) {
                // User is dragging something
        const willRenderPlaceholderInside =
                    isContainerComponent(component.name, this.props.meta) && (
                        !props.children || (
                            component.children.size === 1 &&
                            component.children.first() === this.props.draggedComponentId
                        )
                    );

                // Render placeholders inside empty containers
        if (willRenderPlaceholderInside) {
          props.children = this._renderPlaceholderForDraggedComponent(
                        component.id,
                        -1,
                    );
        }
      } else if (this._willRenderContentPlaceholder(component)) {
                // Content placeholders are enabled
        const willRenderContentPlaceholder =
                    !props.children &&
                    isContainerComponent(component.name, this.props.meta);

        if (willRenderContentPlaceholder)
          props.children = <ContentPlaceholder />;
      }
    } else {
      props.key = `placeholder-${String(Math.floor(Math.random() * 1000000000))}`;

      if (isPlaceholderRoot && !this.props.dontPatch)
        this._patchPlaceholderRootProps(props, isHTMLComponent);

      const willRenderContentPlaceholder =
                !props.children &&
                isContainerComponent(component.name, this.props.meta);

            // Render fake content inside placeholders for container components
      if (willRenderContentPlaceholder)
        props.children = <ContentPlaceholder />;
    }

    if (graphQLQuery) {
      const Container = graphql(graphQLQuery, {
        props: ({ ownProps, data }) => {
                    // TODO: Better check
          if (Object.keys(data).length <= 10) return ownProps;

          const dataProps = mapDataToComponentProps(
                        component,
                        data,
                        this.props.schema,
                        this.props.meta,
                    );

          return _merge({}, ownProps, dataProps);
        },

        options: {
          forceFetch: true,
          notifyOnNetworkStatusChange: true,
        },
      })(Component);

            // noinspection JSValidateTypes
      return (
        <Container {...props} />
      );
    } else {
            // noinspection JSValidateTypes
      return (
        <Component {...props} />
      );
    }
  }

  render() {
    if (this.props.rootId > -1) {
      const rootComponent = this.props.components.get(this.props.rootId);

            // Render as usual
      return this._renderComponent(
                rootComponent,
                this.props.isPlaceholder,
                this.props.isPlaceholder,
            );
    } else if (this.props.draggingComponent && !this.props.isPlaceholder) {
      return this._renderPlaceholderForDraggedComponent(-1, -1);
    } else {
      return null;
    }
  }
}

BuilderComponent.propTypes = {
  components: PropTypes.object, // Immutable.Map<number, Component>
  rootId: PropTypes.number,
  dontPatch: PropTypes.bool,
  enclosingComponentId: PropTypes.number,
  isPlaceholder: PropTypes.bool,
  afterIdx: PropTypes.number,
  containerId: PropTypes.number,
  propsFromOwner: PropTypes.object,
  theMap: PropTypes.object,
  dataContextInfo: PropTypes.object,
  ignoreOwnerProps: PropTypes.bool,

  project: PropTypes.any,
  meta: PropTypes.object,
  schema: PropTypes.object,
  draggingComponent: PropTypes.bool,
  draggedComponentId: PropTypes.number,
  draggedComponents: PropTypes.any,
  draggingOverComponentId: PropTypes.number,
  showContentPlaceholders: PropTypes.bool,
  selectedComponentIds: PropTypes.object, // Immutable.Set<number>
};

BuilderComponent.defaultProps = {
  components: null,
  rootId: -1,
  dontPatch: false,
  enclosingComponentId: -1,
  isPlaceholder: false,
  afterIdx: -1,
  containerId: -1,
  propsFromOwner: {},
  theMap: null,
  dataContextInfo: null,
  ignoreOwnerProps: false,
};

BuilderComponent.displayName = 'Builder';

const mapStateToProps = state => ({
  project: state.project.data,
  meta: state.project.meta,
  schema: state.project.schema,
  draggingComponent: state.project.draggingComponent,
  draggedComponentId: state.project.draggedComponentId,
  draggedComponents: state.project.draggedComponents,
  draggingOverComponentId: state.project.draggingOverComponentId,
  showContentPlaceholders: state.app.showContentPlaceholders,
  selectedComponentIds: currentSelectedComponentIdsSelector(state),
});

const Builder = connect(mapStateToProps)(BuilderComponent);
export default Builder;
