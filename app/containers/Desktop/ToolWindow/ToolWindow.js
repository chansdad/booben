/**
 * @author Dmitriy Bizyaev
 */

'use strict';

//noinspection JSUnresolvedVariable
import React, { Component, PropTypes } from 'react';
import ReactDOM from 'react-dom';

import {
    DraggableWindow,
    DraggableWindowRegion
} from '../../../components/DraggableWindow/DraggableWindow';

import {
    BlockContent,
    BlockContentTitle,
    BlockContentNavigation,
    BlockContentActions,
    BlockContentActionsRegion
} from '../../../components/BlockContent/BlockContent';

import {
    Button,
    Tabs,
    Tab
} from '@reactackle/reactackle';

import { List } from 'immutable';

import ButtonType from '../../../models/Button';
import ToolType from '../../../models/Tool';
import ToolStateType from '../../../models/ToolState';

import { noop, throttle } from '../../../utils/misc';

export const STICK_REGION_LEFT = 0;
export const STICK_REGION_RIGHT = 1;
export const STICK_REGION_TOP = 2;
export const STICK_REGION_BOTTOM = 3;

let draggedWindow = null,
    windowsNum = 0;

const mouseUpListener = () => {
    if (draggedWindow === null) return;
    draggedWindow._handleStopDrag();
};

const updateWindowElement = () => {
    if (draggedWindow === null) return;
    draggedWindow._handleAnimationFrame();
};

const mouseMoveListener = event => {
    if (draggedWindow === null) return;
    event.preventDefault();
    draggedWindow._handleMove(event);

    if (draggedWindow.needRAF) {
        draggedWindow.needRAF = false;
        window.requestAnimationFrame(updateWindowElement);
    }
};

export class ToolWindow extends Component {
    constructor(props) {
        super(props);

        this.state = {
            dragging: false,
            activeSection: 0,
            actionsAreaHasBorder: false
        };

        this._handleDragIconMouseDown = this._handleDragIconMouseDown.bind(this);
        this._handleNavigation = this._handleNavigation.bind(this);
        this._updateStickRegion = throttle(this._updateStickRegion.bind(this), 100);
    }

    componentDidMount() {
        if (windowsNum === 0) {
            window.addEventListener('mouseup', mouseUpListener);
            window.addEventListener('mousemove', mouseMoveListener);
        }

        windowsNum++;

        this.domNode = ReactDOM.findDOMNode(this);
        this.currentTranslateX = 0;
        this.currentTranslateY = 0;
        this.dragStartDiffX = 0;
        this.dragStartDiffY = 0;
        this.dx = 0;
        this.dy = 0;
        this.needRAF = true;
        this.inStickRegionLeft = false;
        this.inStickRegionRight = false;
        this.inStickRegionTop = false;
        this.inStickRegionBottom = false;

        this._updateActionsAreaBorder();
    }

    componentWillUnmount() {
        windowsNum--;

        if (windowsNum === 0) {
            window.removeEventListener('mouseup', mouseUpListener);
            window.removeEventListener('mousemove', mouseMoveListener);
        }

        this.domNode = null;
    }

    componentDidUpdate() {
        this._updateActionsAreaBorder();
    }

    _updateActionsAreaBorder() {
        const haveActionsArea =
            this.props.tool.mainButtons.size > 0 ||
            this.props.tool.secondaryButtons.size > 0;

        let needBorder = false;

        if (haveActionsArea) {
            // Ugly hack
            const actionsAreaEl =
                this.domNode.querySelector('.block-content-actions-area');

            if (actionsAreaEl) {
                const contentAreaEl = actionsAreaEl.previousElementSibling;

                if (contentAreaEl)
                    needBorder = contentAreaEl.scrollHeight > contentAreaEl.clientHeight;
            }
        }

        if (this.state.actionsAreaHasBorder !== needBorder) {
            this.setState({
                actionsAreaHasBorder: needBorder
            });
        }
    }

    _updateStickRegion() {
        const {
            width,
            height,
            containerWidth,
            containerHeight
        } = this;

        const isInStickRegion = {
            left: this.dx < this.props.marginLeft + this.props.stickRegionLeft,
            right: this.dx > containerWidth - width - this.props.marginRight - this.props.stickRegionRight,
            top: this.dy < this.props.marginTop + this.props.stickRegionTop,
            bottom: this.dy > containerHeight - height - this.props.marginBottom - this.props.stickRegionBottom
        };

        if (this.inStickRegionLeft) {
            if (!isInStickRegion.left) this.props.onStickRegionLeave(STICK_REGION_LEFT);
        }
        else {
            if (isInStickRegion.left) this.props.onStickRegionEnter(STICK_REGION_LEFT);
        }

        if (this.inStickRegionRight) {
            if (!isInStickRegion.right) this.props.onStickRegionLeave(STICK_REGION_RIGHT);
        }
        else {
            if (isInStickRegion.right) this.props.onStickRegionEnter(STICK_REGION_RIGHT);
        }

        if (this.inStickRegionTop) {
            if (!isInStickRegion.top) this.props.onStickRegionLeave(STICK_REGION_TOP);
        }
        else {
            if (isInStickRegion.top) this.props.onStickRegionEnter(STICK_REGION_TOP);
        }

        if (this.inStickRegionBottom) {
            if (!isInStickRegion.bottom) this.props.onStickRegionLeave(STICK_REGION_BOTTOM);
        }
        else {
            if (isInStickRegion.bottom) this.props.onStickRegionEnter(STICK_REGION_BOTTOM);
        }

        this.inStickRegionLeft = isInStickRegion.left;
        this.inStickRegionRight = isInStickRegion.right;
        this.inStickRegionTop = isInStickRegion.top;
        this.inStickRegionBottom = isInStickRegion.bottom;
    }

    _handleMove(event) {
        this.dx = event.clientX + this.dragStartDiffX;
        this.dy = event.clientY + this.dragStartDiffY;

        if (this.props.constrainPosition) {
            if (this.dx + this.props.marginRight > this.containerWidthMinusWindowWidth)
                this.dx = this.containerWidthMinusWindowWidth - this.props.marginRight;

            if (this.dx < this.props.marginLeft) this.dx = this.props.marginLeft;

            if (this.dy + this.props.marginBottom > this.containerHeightMinusWindowHeight)
                this.dy = this.containerHeightMinusWindowHeight - this.props.marginBottom;

            if (this.dy < this.props.marginTop) this.dy = this.props.marginTop;
        }

        this._updateStickRegion();
    }

    _handleDragIconMouseDown(event) {
        draggedWindow = this;

        this.width = this.domNode.clientWidth;
        this.height = this.domNode.clientHeight;
        this.container = this.domNode.parentNode;
        this.containerWidth = this.container.clientWidth;
        this.containerHeight = this.container.clientHeight;

        this.containerWidthMinusWindowWidth = this.containerWidth - this.width;
        this.containerHeightMinusWindowHeight = this.containerHeight - this.height;

        this.setState({
            dragging: true
        });

        this.dragStartDiffX = this.currentTranslateX - event.clientX;
        this.dragStartDiffY = this.currentTranslateY - event.clientY;
        this.needRAF = true;

        this.props.onStartDrag();
    }

    _handleStopDrag() {
        draggedWindow = null;

        this.setState({
            dragging: false
        });

        this.props.onStopDrag();
    }

    _handleAnimationFrame() {
        this.needRAF = true;
        const { dx, dy } = this;
        this.currentTranslateX = dx;
        this.currentTranslateY = dy;
        this.domNode.style.transform = `translate(${dx}px, ${dy}px)`;
    }

    _handleNavigation(newActiveSection) {
        this.setState({
            activeSection: newActiveSection
        });
    }

    render() {
        const { tool, toolState } = this.props;

        let navArea = null;
        const sections = tool.sections,
            sectionsNum = sections.size;

        if (sectionsNum > 1) {
            const tabs = sections.map((section, idx) => (
                <Tab key={idx} text={section.name} />
            ));

            navArea = (
                <BlockContentNavigation>
                    <Tabs
                        colorMode="dark"
                        selected={this.state.activeSection}
                        onSelectTab={this._handleNavigation}
                    >
                        {tabs}
                    </Tabs>
                </BlockContentNavigation>
            );
        }

        let actionsArea = null;
        const mainButtons = tool.mainButtons,
            secondaryButtons = tool.secondaryButtons,
            mainButtonsNum = mainButtons.size,
            secondaryButtonsNum = secondaryButtons.size;

        if (mainButtonsNum > 0 || secondaryButtonsNum > 0) {
            let mainActionsRegion = null;
            if (mainButtonsNum > 0) {
                const buttons = mainButtons.map((button, idx) => (
                    <Button
                        key={idx}
                        icon={button.icon}
                        text={button.text}
                        onPress={button.onPress}
                    />
                ));

                mainActionsRegion = (
                    <BlockContentActionsRegion type="main">
                        {buttons}
                    </BlockContentActionsRegion>
                );
            }

            let secondaryButtonsRegion = null;
            if (secondaryButtonsNum > 0) {
                const buttons = secondaryButtons.map((button, idx) => (
                    <Button
                        key={idx}
                        icon={button.icon}
                        text={button.text}
                        onPress={button.onPress}
                    />
                ));

                secondaryButtonsRegion = (
                    <BlockContentActionsRegion type="secondary">
                        {buttons}
                    </BlockContentActionsRegion>
                );
            }

            actionsArea = (
                <BlockContentActions isBordered={this.state.actionsAreaHasBorder}>
                    {secondaryButtonsRegion}
                    {mainActionsRegion}
                </BlockContentActions>
            );
        }

        let titleButtons = List();

        if (tool.undockable) {
            titleButtons = titleButtons.push(new ButtonType({
                icon: 'compress',
                onPress: this.props.onDock
            }));
        }

        if (tool.closable) {
            titleButtons = titleButtons.push(new ButtonType({
                icon: 'times',
                onPress: this.props.onClose
            }));
        }

        const activeSection = sections.get(this.state.activeSection) || null;

        const ContentComponent = activeSection !== null
            ? activeSection.component
            : null;

        const mainRegion = (
            <DraggableWindowRegion>
                <BlockContent>
                    <BlockContentTitle
                        title={tool.title}
                        subtitle={tool.subtitle}
                        isEditable={tool.titleEditable}
                        iconLeft="ellipsis-v"
                        buttons={titleButtons}
                        onLeftIconMouseDown={this._handleDragIconMouseDown}
                    />

                    {navArea}

                    <ContentComponent />

                    {actionsArea}
                </BlockContent>
            </DraggableWindowRegion>
        );

        let sideRegion = null;
        if (toolState.sideRegionIsVisible) {
            const SideRegionContentComponent = activeSection !== null
                ? activeSection.sideRegionComponent
                : null;

            if (SideRegionContentComponent !== null) {
                sideRegion = (
                    <DraggableWindowRegion type="aside">
                        <BlockContent>
                            <SideRegionContentComponent/>
                        </BlockContent>
                    </DraggableWindowRegion>
                );
            }
        }

        return (
            <DraggableWindow
                isDragged={this.state.dragging}
                maxHeight={tool.maxHeight}
                zIndex={toolState.zIndex}
                onFocus={this.props.onFocus}
            >
                {mainRegion}
                {sideRegion}
            </DraggableWindow>
        );
    }
}

ToolWindow.propTypes = {
    tool: PropTypes.instanceOf(ToolType).isRequired,
    toolState: PropTypes.instanceOf(ToolStateType).isRequired,

    constrainPosition: PropTypes.bool,
    marginLeft: PropTypes.number,
    marginRight: PropTypes.number,
    marginTop: PropTypes.number,
    marginBottom: PropTypes.number,
    stickRegionLeft: PropTypes.number,
    stickRegionRight: PropTypes.number,
    stickRegionTop: PropTypes.number,
    stickRegionBottom: PropTypes.number,

    onTitleChange: PropTypes.func,
    onClose: PropTypes.func,
    onDock: PropTypes.func,
    onFocus: PropTypes.func,
    onStartDrag: PropTypes.func,
    onStopDrag: PropTypes.func,
    onStickRegionEnter: PropTypes.func,
    onStickRegionLeave: PropTypes.func
};

ToolWindow.defaultProps = {
    constrainPosition: true,
    marginLeft: 0,
    marginRight: 0,
    marginTop: 0,
    marginBottom: 0,
    stickRegionLeft: 0,
    stickRegionRight: 0,
    stickRegionTop: 0,
    stickRegionBottom: 0,

    onTitleChange: noop,
    onClose: noop,
    onDock: noop,
    onFocus: noop,
    onStartDrag: noop,
    onStopDrag: noop,
    onStickRegionEnter: noop,
    onStickRegionLeave: noop
};

ToolWindow.displayName = 'ToolWindow';