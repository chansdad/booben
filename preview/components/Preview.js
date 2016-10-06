'use strict';

//noinspection JSUnresolvedVariable
import React, { Component, PropTypes } from 'react';
import ReactDOM from 'react-dom';
import { Router, hashHistory } from 'react-router';
import { connect } from 'react-redux';
import ImmutablePropTypes from 'react-immutable-proptypes';
import { List, Set, Map } from 'immutable';

import Builder from './Builder';

import {
    selectPreviewComponent,
    deselectPreviewComponent,
    highlightPreviewComponent,
    unhighlightPreviewComponent,
    setPreviewWorkspace,
    unsetPreviewWorkspace,
    showPreviewWorkspace,
    hidePreviewWorkspace,
    setDomElementToMap
} from '../../app/actions/preview';

import {
    componentDeleteFromRoute
} from '../../app/actions/project';

let workspaceMap = Map();

/**
 * Get owner React element by condition
 *
 * @param  {function} el
 * @param  {function} [condition]
 * @return {function}
 */
const getOwner = (el, condition) => {
    const owner = el._owner;
    if (!owner) return null;
    if (!condition) return owner;

    return condition(owner) ? owner : getOwner(owner, condition);
};

/**
 * Get child React element by condition
 *
 * @param  {function} el
 * @param  {function} [condition]
 * @return {function}
 */
const getChild = (el, condition) => {
    let child = null;

    if(el._renderedComponent) {
        child = el._renderedComponent;
        if (!child) return null;
        if (!condition) return child;
        return condition(child) ? child : getChild(child, condition);
    } else if(el._renderedChildren) {
        for(let key in el._renderedChildren) {
            if(condition(el._renderedChildren[key])) return el._renderedChildren[key];

            child = getChild(el._renderedChildren[key], condition);
            if(child) return child;
        }

        return null;
    }
};

const mouseEvents = [
    'click',
    'mouseover',
    'mouseout',
    'dragover',
    'dragleave',
    'drop',
    'mousedown'
];

class Preview extends Component {
    constructor(props) {
        super(props);

        this.domNode = null;
        this.domOverlay = null;
        this.dndParams = {};
        this.dndFlag = false;
        this.animationFrame = null;
        this.needRAF = true;
        this.currentRouteID = null;
        this.currentOwner = null;

        this._handleMouseEvent = this._handleMouseEvent.bind(this);
        this._handleResize = this._handleResize.bind(this);
        this._handleDrag = this._handleDrag.bind(this);
        this._handleStartDrag = this._handleStartDrag.bind(this);
        this._handleStopDrag = this._handleStopDrag.bind(this);
        this._handleAnimationFrame = this._handleAnimationFrame.bind(this);
        this._handlerChangeRoute = this._handlerChangeRoute.bind(this);
    }

    componentDidMount() {
        this.domNode = ReactDOM.findDOMNode(this);
        this.domOverlay = this.props.domOverlay;
        this.workspace = workspaceMap.get(this.currentRouteID);

        if (this.props.interactive) {
            mouseEvents.forEach(e => {
                this.domNode.addEventListener(e, this._handleMouseEvent, false);
            });

            window.addEventListener('resize', this._handleResize, false);

            this._updateWorkspace();
        }
    }

    componentWillUnmount() {
        if (this.props.interactive) {
            mouseEvents.forEach(e => {
                this.domNode.removeEventListener(e, this._handleMouseEvent, false);
            });

            window.removeEventListener('resize', this._handleResize, false);
        }

        this.domNode = null;
    }

    shouldComponentUpdate(nextProps) {
        return nextProps.routes !== this.props.routes;
    }

    _updateWorkspace() {
        const builderWS = getChild(this['_reactInternalInstance'],
            item => item._currentElement.props['data-uid'] == this.workspace);

        if(!builderWS || !builderWS._renderedComponent) return;

        this.props.setWorkspace(this.workspace);
        this._setDomElementToMap(this.workspace, builderWS._renderedComponent._hostNode);
    }

    _handleResize() {}

    /**
     * Get array of selected components
     *
     * @param  {function} el
     * @param  {string} uid
     */
    _updateSelected(uid) {
        if(this.props.selected.has(uid)) {
            this.props.deselectComponent(uid);
        } else {
            this.props.selectComponent(uid)
        }
    }

    /**
     * Get array of highlighted components
     *
     * @param  {string} uid
     */
    _updateHighlighted(uid) {
        if(this.props.highlighted.has(uid)) {
            this.props.unhighlightComponent(uid);
        } else {
            this.props.highlightComponent(uid);
        }
    }

    _setDomElementToMap(key, value) {
        if(!this.props.domElementsMap.has(key)) {
            this.props.setDomElementToMap(key, value);
        }
    }

    _inWorkspace(uid) {
        const workspace = this.props.componentsMap.get(this.workspace),
            el = this.props.componentsMap.get(uid);

        for(var i in workspace.where) {
            if(workspace.where[i] != el.where[i]) return false;
        }

        return true;
    }

    _getOwner(target) {
        const keys = Object.keys(target),
            riiKey = keys.find(key => key.startsWith('__reactInternalInstance$'));

        if (!riiKey) return null;

        const el = target[riiKey]._currentElement,
            owner = getOwner(el, item => item._currentElement.props['data-uid']);

        return owner;
    }

    _handleAnimationFrame() {
        var el = this.dndParams.el;

        el.style.transform = `translate(${this.dndParams.pageX}px,
            ${this.dndParams.pageY}px)`;
        this.animationFrame = null;
        this.needRAF = true;
    }

    _handleStartDrag(event) {
        if(this.dndFlag) return;

        this.domNode.addEventListener('mousemove', this._handleDrag);
        this.domNode.addEventListener('mouseup', this._handleStopDrag);
        window.top.addEventListener('mouseup', this._handleStopDrag);
    }

    _handleStopDrag(event) {
        this.domNode.removeEventListener('mousemove', this._handleDrag);
        this.domNode.removeEventListener('mouseup', this._handleStopDrag);
        window.top.removeEventListener('mouseup', this._handleStopDrag);

        this.props.hideWorkspace();

        if(!this.dndFlag) return;

        this.dndFlag = false;

        const owner = this.currentOwner;

        if (owner && this.dndParams) {
            if(
                owner &&
                owner._currentElement.props['data-uid'] &&
                owner._currentElement.props['data-uid'] != this.dndParams.uid
            ) {
                // this.props.componentsMap.get(owner._currentElement.props['data-uid']).where
            }
        }

        if (this.animationFrame !== null) {
            window.cancelAnimationFrame(this.animationFrame);
            this.animationFrame = null;
        }

        this.domOverlay.removeChild(this.dndParams.el);
    }

    _handleDrag(event) {
        const moveX = event.pageX - this.dndParams.dragStartX,
            moveY = event.pageY - this.dndParams.dragStartY;

        if ( Math.abs(moveX) < 10 && Math.abs(moveY) < 10 ) {
            return;
        }

        if(!this.dndFlag) {
            var el = this.dndParams.el;
            el.innerHTML = this.props.componentsMap.get(this.dndParams.uid).name;

            el.style.position = 'absolute';
            el.style.zIndex = 1000;

            this.dndParams.pageX = this.dndParams.dragStartX + 10;
            this.dndParams.pageY = this.dndParams.dragStartY + 10;

            el.style.transform = `translate(${this.dndParams.pageX}px,
            ${this.dndParams.pageY}px)`;

            this.domOverlay.appendChild(el);
            this.dndFlag = true;

            this.props.componentDeleteFromRoute(this.dndParams.where);

            this.props.showWorkspace();
        }

        this.dndParams.pageX = event.pageX + 10;
        this.dndParams.pageY = event.pageY + 10;

        if (this.needRAF) {
            this.needRAF = false;

            this.animationFrame =
                window.requestAnimationFrame(this._handleAnimationFrame);
        }
    }

    /**
     * 
     * @param {MouseEvent} event
     */
    _handleMouseEvent(event) {
        const type = event.type;

        if( type == 'dragover' || type == 'mouseover') {
            const owner = this._getOwner(event.target),
                uid = owner._currentElement.props['data-uid'];

            if(!this._inWorkspace(uid)) return;

            this._setDomElementToMap(uid, owner._renderedComponent._hostNode);
            this._updateHighlighted(uid);

            this.currentOwner = owner;
        }

        const owner = this.currentOwner,
            uid = owner && owner._currentElement.props['data-uid'] || false;

        if(!uid || !this._inWorkspace(uid)) return;

        if( type == 'click' ) {
            if(!event.ctrlKey) return;
            this._updateSelected(uid);
        } else if( type == 'dragleave' || type == 'mouseout') {
            this._updateHighlighted(uid);
            this.currentOwner = null;
        } else if( type == 'drop' ) {
            console.log({
                source: JSON.parse(event.dataTransfer.getData("Text")),
                target: uid
            });
        }

        if ( type == 'mousedown' ) {
            if (event.which != 1 || !event.ctrlKey) return;

            event.preventDefault();

            this.dndParams.el = document.createElement('div');
            this.dndParams.uid = uid;
            this.dndParams.where = this.props.componentsMap.get(uid).where;
            this.dndParams.dragStartX = event.pageX;
            this.dndParams.dragStartY = event.pageY;

            this._handleStartDrag();
        }
    }

    _handlerChangeRoute(id) {
        this.currentRouteID = id;
    }

    _createRoute(route, pathToRoute) {
        const ret = {
            component: ({ children }) => <Builder
                component={route.component}
                children={children}
                routeIndex={pathToRoute}
            />
        };

        if (route.children.size > 0) {
            ret.childRoutes = route.children
                .map((child, routeIndex) => this._createRoute(
                    child,
                    [].concat(pathToRoute, 'children', routeIndex)
                ))
                .toArray();

            ret.onEnter = this._handlerChangeRoute.bind(this, route.id);

            workspaceMap = workspaceMap.set(route.id, route.component.uid);
        }

        if (route.haveRedirect) {
            ret.onEnter = (nextState, replace) => replace(route.redirectTo);
        }
        else if (route.haveIndex) {
            ret.indexRoute = {
                component: ({ children }) => <Builder
                    component={route.indexComponent}
                    children={children}
                    routeIndex={pathToRoute}
                    isIndexRoute
                />
            };
        }

        return ret;
    }

    render() {
        const routes = this.props.routes
            .map((route, idx) => this._createRoute(route, [idx]))
            .toArray();

        return (
            <Router history={hashHistory} routes={routes} />
        );
    }
}

Preview.propTypes = {
    domOverlay: React.PropTypes.object,
    interactive: PropTypes.bool,
    routes: ImmutablePropTypes.listOf(
        ImmutablePropTypes.contains({
            id: PropTypes.number,
            path: PropTypes.string,
            component: ImmutablePropTypes.contains({
                uid: React.PropTypes.string,
                name: React.PropTypes.string,
                props: ImmutablePropTypes.map,
                children: ImmutablePropTypes.list
            })
        })
    ),
    selected: ImmutablePropTypes.set,
    highlighted: ImmutablePropTypes.set,
    currentRouteIsIndexRoute: PropTypes.bool,

    deselectComponent: PropTypes.func,
    selectComponent: PropTypes.func,
    unhighlightComponent: PropTypes.func,
    highlightComponent: PropTypes.func,
    setWorkspace: PropTypes.func,
    unsetWorkspace: PropTypes.func,
    showWorkspace: PropTypes.func,
    hideWorkspace: PropTypes.func,
    setDomElementToMap: PropTypes.func
};

Preview.defaultProps = {
    domOverlay: null,
    interactive: false
};

Preview.displayName = 'Preview';

const mapStateToProps = state => ({
    routes: state.project.data.routes,
    selected: state.preview.selectedItems,
    highlighted: state.preview.highlightedItems,
    componentsMap: state.preview.componentsMap,
    domElementsMap: state.preview.domElementsMap,
    currentRouteIsIndexRoute: state.preview.currentRouteIsIndexRoute
});

const mapDispatchToProps = dispatch => ({
    deselectComponent: selected => void dispatch(deselectPreviewComponent(selected)),
    selectComponent: selected => void dispatch(selectPreviewComponent(selected)),
    highlightComponent: highlighted => void dispatch(highlightPreviewComponent(highlighted)),
    unhighlightComponent: highlighted => void dispatch(unhighlightPreviewComponent(highlighted)),
    componentDeleteFromRoute: (where) => void dispatch(componentDeleteFromRoute(where)),
    setWorkspace: component => void dispatch(setPreviewWorkspace(component)),
    unsetWorkspace: component => void dispatch(unsetPreviewWorkspace(component)),
    showWorkspace: () => void dispatch(showPreviewWorkspace()),
    hideWorkspace: () => void dispatch(hidePreviewWorkspace()),
    setDomElementToMap: (uid, component) => void dispatch(setDomElementToMap(uid, component))
});

export default connect(
    mapStateToProps,
    mapDispatchToProps
)(Preview);
