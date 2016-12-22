import React, { PureComponent, PropTypes } from 'react';

import {
    PropsItem,
} from '../../../PropsList/PropsList';

import {
    isPrimitiveGraphQLType,
    FIELD_KINDS,
} from '../../../../utils/schema';

const DEFAULT_VALUE_NON_NULL_PRIMITIVE = {};


/**
 * @param {Object} object
 * @param {any} value
 * @param {Array<string|number>} path
 * @return {Object}
 */
const setObjectValueByPath = (object, value, path) => {
  if (!Array.isArray(object)) {
    return Object.assign({}, object,
      {
        [path[0]]:
                    path.length === 1
                    ? value
                    : setObjectValueByPath(object[path[0]], value, path.slice(1)),
      },
        );
  } else {
    const newObj = [...object];
    const index = path[0] + 1
                ? path[0]
                : newObj.push({}) - 1;

    const currentValue = path.length === 1
        ? value
        : setObjectValueByPath(newObj[index], value, path.slice(1));

    newObj[index] = currentValue;

    return newObj;
  }
};

/**
 * @param {Object} object
 * @param {Array<string|number>} path
 * @return {any}
 */
const getObjectValueByPath = (object, path) =>
    path.length === 1
    ? object[path[0]]
    : getObjectValueByPath(object[path[0]], path.slice(1));

/**
 * @param {Object} object
 * @param {Array<string|number>} path
 * @return {Object}
 */
const removeObjectValueByPath = (object, path) => {
  if (Array.isArray(object)) {
    if (path.length === 1)
      return object.slice(0, path[0]).concat(object.slice(path[0] + 1));
    else {
      return object.slice(0, path[0]).concat([
        removeObjectValueByPath(object[path[0]], path.slice(1)),
      ]).concat(object.slice(path[0] + 1));
    }
  } else if (path.length === 1) {
    const newObj = Object.assign({}, object);
    delete newObj[path[0]];
    return newObj;
  } else {
    return Object.assign({},
        object, {
          [path[0]]:
                removeObjectValueByPath(object[path[0]], path.slice(1)),
        },
    );
  }
};

const parseIntValue = value => {
  const parsedValue = parseInt(value, 10);
  return `${
        Number.isSafeInteger(parsedValue) ? parsedValue : 0}`;
};

const parseFloatValue = value => {
  const parsedValue = parseFloat(value);

  const matchedDecimal = value.match(/\.\d*/);

  const fixBy =
        matchedDecimal
        && matchedDecimal[0]
        && matchedDecimal[0].length - 1;


  return isFinite(parsedValue)
    ?
        value.endsWith('.') && value.match(/\./g).length === 1
        ? `${parsedValue}.`
        : !(parsedValue % 1)
            ? parsedValue.toFixed(fixBy + 1 ? fixBy : 0)
            : `${parsedValue}`
    : '0.0';
};

const getTransformFunction = typeName => (
    {
      Int: parseIntValue,
      Float: parseFloatValue,
    }[typeName]
);


const getDefaultArgFieldValue = (type, kind) => {
  const defaultValue =
        isPrimitiveGraphQLType(
            type,
        ) ? (
                type === 'Boolean'
                ? false
                : type === 'String' || type === 'ID'
                    ? ''
                    : 0
            )
            : {};
  if (kind === FIELD_KINDS.LIST) return [defaultValue];
  else return defaultValue;
};

export class DataWindowQueryArgumentsFieldForm extends PureComponent {
  constructor(props) {
    super(props);
    this.state = this._convertValueAndPropTypeTreeToState(
            props.argField,
            props.argFieldName,
            props.argFieldValue,
            props.types,
        );
    props.setNewArgumentValue(
            this.state.fieldValue,
        );
    this._handleChange = this._handleChange.bind(this);
    this._handleNullSwitch = this._handleNullSwitch.bind(this);
    this._convertObjectToValue = this._convertObjectToValue.bind(this);
    this._handleAdd = this._handleAdd.bind(this);
    this._handleRemove = this._handleRemove.bind(this);
  }

  componentWillReceiveProps(nextProps) {
    const {
            fieldValue,
            propType,
        } = DataWindowQueryArgumentsFieldForm.createValueAndPropTypeTree(
            nextProps.argField,
            nextProps.argFieldName,
            nextProps.argFieldValue,
            nextProps.types,
        );

    this.setState(
      {
        fieldValue: {
          [nextProps.argFieldName]: fieldValue,
        },
        propType,
      },
        );

    nextProps.setNewArgumentValue({
      [nextProps.argFieldName]: fieldValue,
    });
  }

  _convertValueAndPropTypeTreeToState(...args) {
    const {
            fieldValue,
            propType,
        } = DataWindowQueryArgumentsFieldForm.createValueAndPropTypeTree(
            ...args,
        );

    return ({
      fieldValue: {
        [args[1]]: fieldValue,
      },
      propType,
    });
  }

  _convertObjectToValue(obj) {
    return {
      value: (
                typeof obj === 'object' && obj !== null
                ? !Array.isArray(obj)
                    ? Object.keys(obj).reduce(
                            (acc, name) => Object.assign(acc, {
                              [name]:
                                        this._convertObjectToValue(obj[name]),
                            },
                            )

                        , {})
                    : obj.map(this._convertObjectToValue)
                : obj === null
                     ? obj
                     : `${obj}`
            ),

      message: (
                this.props.argumentsBound
                        ? 'Arguments already in use'
                        : void 0
            ),
    };
  }

  static createValueAndPropTypeTree(argField, argFieldName, argFieldConstValue, types) {
    let argFieldValue,
      ofType = void 0;

    const isComposite = argField.kind === FIELD_KINDS.LIST;

    if (typeof argFieldConstValue === 'undefined')
      argFieldValue = {};
    else if (argFieldConstValue === null)
      argFieldValue = null;
    else
            argFieldValue = Object.assign({}, argFieldConstValue);

    if (isComposite && typeof argFieldValue[argFieldName] === 'undefined')
      argFieldValue[argFieldName] = [void 0];

    argFieldValue[argFieldName] =
            typeof argFieldValue[argFieldName] === 'undefined'
            ? null
            : argFieldValue[argFieldName] === DEFAULT_VALUE_NON_NULL_PRIMITIVE
                ? getDefaultArgFieldValue(
                        argField.type,
                        argField.kind,
                    )
                : argFieldValue[argFieldName];

    const subFields =
            !isPrimitiveGraphQLType(argField.type)
            && !isComposite
            && argFieldValue !== null
            ? Object.keys(types[argField.type].fields).reduce((acc, fieldName) => {
              const field = types[argField.type].fields[fieldName];

              const {
                        fieldValue,
                        propType,
                    } = DataWindowQueryArgumentsFieldForm.createValueAndPropTypeTree(
                        field,
                        fieldName,
                        argFieldValue[argFieldName],
                        types,
                    );

              argFieldValue[argFieldName]
                    && (argFieldValue[argFieldName][fieldName] = fieldValue);

              return Object.assign(acc, {
                [fieldName]: propType,
              });
            }
                , {})
            : {};

    if (isComposite) {
      ofType = argFieldValue[argFieldName]
                        .map(value =>
                            DataWindowQueryArgumentsFieldForm
                                .createValueAndPropTypeTree(
                                    Object.assign(
                                        {}, argField, { kind: FIELD_KINDS.SINGLE },
                                    ), argFieldName, { [argFieldName]: value }, types,
                                ),
                );
      argFieldValue[argFieldName] = ofType.map(
                ({ fieldValue }) => fieldValue,
            );
    }

    const notNull =
            !isComposite && typeof argField.nonNullMember === 'boolean'
            ? argField.nonNullMember
            : argField.nonNull;

    return {
      fieldValue:
                 argFieldValue
                && argFieldValue[argFieldName],
      propType: {
        label: argFieldName,
        view:
                      argField.kind === FIELD_KINDS.LIST
                   ? 'array'
                   :
                       isPrimitiveGraphQLType(argField.type)
                       ?
                           argField.type === 'Boolean'
                           ? 'select'
                           : 'input'
                       : 'shape',
        type: argField.type,
        transformValue: getTransformFunction(
                     argField.type,
               ),
        required: !!notNull,
        displayRequired: !!notNull,
        notNull: !!notNull,
        fields: subFields,
        ofType: ofType && ofType[0] && ofType[0].propType,
      },
    };
  }

  _handleChange(value, path) {
    const newValue = setObjectValueByPath(
            this.state.fieldValue,
            value,
            [this.props.argFieldName].concat(path),
        );
    const {
            fieldValue,
            propType,
        } = this._convertValueAndPropTypeTreeToState(
            this.props.argField,
            this.props.argFieldName,
            newValue,
            this.props.types,
        );

    this.setState({ fieldValue, propType });

    this.props.setNewArgumentValue(
            fieldValue,
        );
  }

  _handleAdd(path, index) {
    this._handleChange(void 0, path.concat([index]));
  }

  _handleRemove(path, index) {
    const newValue = removeObjectValueByPath(
            this.state.fieldValue,
            [this.props.argFieldName].concat(path.concat([index])),
        );

    const {
            fieldValue,
            propType,
        } = this._convertValueAndPropTypeTreeToState(
            this.props.argField,
            this.props.argFieldName,
            newValue,
            this.props.types,
        );

    this.setState({ fieldValue, propType });

    this.props.setNewArgumentValue(
            fieldValue,
        );
  }

  _handleNullSwitch(path) {
    const oldValue =
            getObjectValueByPath(
                this.state.fieldValue,
                [this.props.argFieldName].concat(path),
            );
    const newValue = setObjectValueByPath(
            this.state.fieldValue,
            oldValue === null
            ? DEFAULT_VALUE_NON_NULL_PRIMITIVE
            : null,
            [this.props.argFieldName].concat(path),
        );

    const {
            fieldValue,
            propType,
        } = this._convertValueAndPropTypeTreeToState(
            this.props.argField,
            this.props.argFieldName,
            newValue,
            this.props.types,
        );

    this.setState({ fieldValue, propType });

    this.props.setNewArgumentValue(
            fieldValue,
        );
  }

  render() {
    const {
            argFieldName,
        } = this.props;

    const {
            fieldValue,
            propType,
        } = this.state;

    const currentFieldValue = fieldValue[argFieldName];

    return (
      <PropsItem
        key={argFieldName}
        propType={propType}
        onChange={
                    this._handleChange
                }
        onNullSwitch={
                    this._handleNullSwitch
                }
        onAddValue={
                    this._handleAdd
                }
        onDeleteValue={
                    this._handleRemove
                }
        value={
                    this._convertObjectToValue(
                        currentFieldValue,
                    )
                }
      />
    );
  }

}

DataWindowQueryArgumentsFieldForm.propTypes = {
  argField: PropTypes.object,
  argFieldName: PropTypes.string,
  argFieldValue: PropTypes.any,
  setNewArgumentValue: PropTypes.func,
  argumentsBound: PropTypes.bool,
  types: PropTypes.object,
};