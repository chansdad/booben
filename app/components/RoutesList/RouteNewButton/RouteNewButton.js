'use strict';

//noinspection JSUnresolvedVariable
import React, { PureComponent, PropTypes } from 'react';
import { Button } from '@reactackle/reactackle';
import ProjectRoute from '../../../models/ProjectRoute';
import { noop } from '../../../utils/misc';

//noinspection JSUnresolvedVariable
const propTypes = {
  parentRoute: PropTypes.instanceOf(ProjectRoute),
  text: PropTypes.string,
  onPress: PropTypes.func,
};

const defaultProps = {
  parentRoute: null,
  text: '',
  onPress: noop,
};

export class RouteNewButton extends PureComponent {
  constructor(props) {
    super(props);
    this._handlePress = this._handlePress.bind(this);
  }
  
  _handlePress() {
    const { parentRoute } = this.props;
    this.props.onPress({ parentRoute });
  }
  
  render() {
    const { text } = this.props;
    
    return (
      <li className="route-new-button route-new-root-button">
        <Button
          text={text}
          kind="outline-primary"
          onPress={this._handlePress}
        />
      </li>
    );
  }
}

RouteNewButton.propTypes = propTypes;
RouteNewButton.defaultProps = defaultProps;
RouteNewButton.displayName = 'RouteNewButton';
