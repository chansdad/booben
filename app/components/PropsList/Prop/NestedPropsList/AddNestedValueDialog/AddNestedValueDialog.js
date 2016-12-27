/**
 * @author Dmitriy Bizyaev
 */

'use strict';

//noinspection JSUnresolvedVariable
import React, { PureComponent, PropTypes } from 'react';
import { Input, Button } from '@reactackle/reactackle';
import { noop, returnArg } from '../../../../../utils/misc';

const propTypes = {
  getLocalizedText: PropTypes.func,
  onSave: PropTypes.func,
  onCancel: PropTypes.func,
};

const defaultProps = {
  getLocalizedText: returnArg,
  onSave: noop,
  onCancel: noop,
};

export class AddNestedValueDialog extends PureComponent {
  constructor(props) {
    super(props);
    
    this.state = {
      name: '',
    };
    
    this._handleNameChange = this._handleNameChange.bind(this);
    this._handleSave = this._handleSave.bind(this);
  }
  
  _handleNameChange(newName) {
    this.setState({
      name: newName,
    });
  }
  
  _handleSave() {
    this.props.onSave({ name: this.state.name });
  }
  
  render() {
    const { getLocalizedText, onCancel } = this.props;
    const { name } = this.state;
    
    const saveButtonIsDisabled = !name;
    
    return (
      <div className="prop-tree_field-new">
        <div className="prop-tree_field-new_row field-new_title">
          {getLocalizedText('addValueDialogTitle')}
        </div>
    
        <div className="prop-tree_field-new_row">
          <Input
            stateless
            dense
            label={getLocalizedText('addValueNameInputLabel')}
            value={name}
            onChange={this._handleNameChange}
          />
        </div>
    
        <div className="prop-tree_field-new_row field-new_buttons">
          <Button
            narrow
            text={getLocalizedText('save')}
            disabled={saveButtonIsDisabled}
            onPress={this._handleSave}
          />
      
          <Button
            narrow
            text={getLocalizedText('cancel')}
            onPress={onCancel}
          />
        </div>
      </div>
    );
  }
}

AddNestedValueDialog.propTypes = propTypes;
AddNestedValueDialog.defaultProps = defaultProps;
AddNestedValueDialog.displayName = 'AddNestedValueDialog';
