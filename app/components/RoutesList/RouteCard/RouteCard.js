'use strict';

//noinspection JSUnresolvedVariable
import React, { Component, PropTypes } from 'react';
import { Icon } from '@reactackle/reactackle';
import { noop } from '../../../utils/misc';

export class RouteCard extends Component {
    constructor(props) {
        super(props);

        this.refCallback = this.refCallback.bind(this);
    }

    refCallback(el) {
        if (el) el.addEventListener('dblclick', this.props.onGo);
    }

    render() {
        let className = 'route-card';

        if (this.props.home) className += ' is-home';
        if (this.props.focused) className += ' is-focused';

        let iconIndex = false;
        if (this.props.home) {
            iconIndex = (
                <div className="route-icon-index">
                    <Icon name="home" />
                </div>
            );
        }

        return (
            <li className='route-card-wrapper'>
                <div
                    className={className}
                    tabIndex="1"
                    onClick={this.props.onFocus}
                    ref={this.refCallback}
                >
                    <div className="route-card-content">
                        <div className="route-title-box">
                            <span className="route-title">{this.props.title}</span>
                            {iconIndex}
                        </div>
                        <div className="route-subtitle">{this.props.subtitle}</div>
                    </div>
                </div>

                {this.props.children}
            </li>
        );
    }
}

RouteCard.propTypes = {
    title: PropTypes.string,
    subtitle: PropTypes.string,
    root: PropTypes.bool,
    home: PropTypes.bool,
    focused: PropTypes.bool,
    onFocus: PropTypes.func,
    onGo: PropTypes.func
};

RouteCard.defaultProps = {
    title: '',
    subtitle: '',
    root: false,
    home: false,
    focused: false,
    onFocus: noop,
    onGo: noop
};

RouteCard.displayName = 'RouteCard';