/* eslint-disable */
'use strict';

// TODO: Delete this file after refactoring

import { PropTypes } from 'react';

import {
    DataWindowQueryLayout,
} from './DataWindowQueryLayout';


export class DataWindowContextLayout extends DataWindowQueryLayout {
  constructor(props) {
    super(props);
    this.state = {
      ...this.state,
      currentPath: [
        { name: 'Data', displayName: 'data' },
        props.contextFieldType,
      ],
    };
  }

  _applyPropData(args = []) {
    const queryPath = this._getCurrentEditingFields(true).concat(
                !this.state.allArgumentsMode
                && this._getSelectedField()
                ? [this._getSelectedField()]
                : [],
            ).map(pathStep => ({
              field: pathStep.name,
            }),
        );

    const stringifiedContext = this.props.context.join(' ');

    const queryArgs = args.reduce((acc, currentArg, num) =>
            Object.keys(currentArg).length
            ? {
              ...acc,
              '': {
                ...acc[''],
                [stringifiedContext]:
                {
                  ...acc[stringifiedContext],
                  [queryPath.slice(0, num + 1)
                            .map(({ field }) => field).join(' ')]:
                                DataWindowQueryLayout
                                    .createSourceDataObject(currentArg),
                },
              },
            }
            : acc
        , {});
    this.props.onUpdateComponentPropValue(
            this.props.linkingPropOfComponentId,
            this.props.linkingPropName,
            this.props.linkingPropPath,
            'data',
      {
        dataContext: this.props.context,
        queryPath,
      },
            queryArgs,
            true,
        );
    this.props.onLinkPropCancel();
  }

    /**
     * @param {Array<Object>} path
     * @return {undefined|Object} - arguments for path's last node
     */
  _getBoundArgumentsByPath(path) {
    const queryArgsMap = this.props.currentComponentWithQueryArgs.queryArgs;
    const stringifiedContext = this.props.context.join(' ');
    const args = queryArgsMap.get(stringifiedContext)
                &&
                queryArgsMap
                  .get(stringifiedContext)
                  .get(path.map(({ name }) => name).join(' '));

    const formattedArgs = args ? args.toJS() : {};

    return args && Object.keys(formattedArgs).reduce((acc, key) =>
            ({
              ...acc,
              [key]:
                    DataWindowContextLayout
                      .extractSourceDataValue(formattedArgs[key]),
            })
        , {});
  }

  get currentSelectionPath() {
    return this.state.currentPath.slice(2);
  }
}

DataWindowContextLayout.propTypes = {
  ...DataWindowQueryLayout.propTypes,
  contextFieldType: PropTypes.object.isRequired,
  context: PropTypes.array.isRequired,
};

DataWindowContextLayout.displayName = 'DataWindowContextLayout';
