/**
 * @author Dmitriy Bizyaev
 */

'use strict';

import _set from 'lodash.set';
import _forOwn from 'lodash.forown';
import { Record, Map } from 'immutable';
import { NO_VALUE } from '../constants/misc';
import { walkSimpleProps, walkComponentsTree } from '../models/ProjectComponent';
import { getTypeNameByField, getTypeNameByPath, FIELD_KINDS } from './schema';
import { getComponentMeta, propHasDataContest, propUsesDataContexts } from './meta';

const UPPERCASE_LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const LOWERCASE_LETTERS = 'abcdefghijklmnopqrstuvwxyz';
const NUMBERS = '1234567890';
const LETTERS = UPPERCASE_LETTERS + LOWERCASE_LETTERS;
const LETTERS_LEN = LETTERS.length;
const ALL_CHARS = LETTERS + NUMBERS;
const ALL_CHARS_LEN = ALL_CHARS.length;

/**
 *
 * @param {number} [len=12]
 * @return {string}
 */
export const randomName = (len = 12) => {
    let ret = '';

    ret += LETTERS[Math.floor(Math.random() * LETTERS_LEN)];

    for (let i = len - 2; i >= 0; i--)
        ret += ALL_CHARS[Math.floor(Math.random() * ALL_CHARS_LEN)];

    return ret;
};

const attachFragmentToFragment = (fragment, destinationFragment, path = null) => {
    let currentNode = destinationFragment;

    if (path) {
        path.forEach(field => {
            const selection = currentNode.selectionSet.selections.find(
                selection => selection.kind === 'Field' && selection.name.value === field
            );

            if (selection) {
                currentNode = selection;
            }
            else {
                throw new Error('attachFragmentToFragment(): bad path');
            }
        });
    }
    else {
        let fieldSelection;

        while (
            fieldSelection = currentNode.selectionSet
                ? currentNode.selectionSet.selections.find(
                    selection => selection.kind === 'Field'
                )
                : null
        ) {
            currentNode = fieldSelection;
        }
    }

    if (!currentNode.selectionSet) currentNode.selectionSet = {
        kind: 'SelectionSet',
        selections: []
    };

    currentNode.selectionSet.selections.push({
        kind: 'FragmentSpread',
        name: {
            kind: 'Name',
            value: fragment.name.value
        },
        directives: []
    });

    return destinationFragment;
};

/**
 *
 * @param {Object} propValue - Prop value with 'data' source
 * @param {Object} dataContextTree
 * @return {string} - GraphQL type
 */
const resolveGraphQLType = (propValue, dataContextTree) => {
    const context = propValue.sourceData.dataContext.reduce(
        (acc, cur) => acc.children.get(cur),
        dataContextTree
    );

    return context.type;
};

const toGraphQLScalarValue = (value, type) => {
    if (type === 'String') return { kind: 'StringValue', value };
    if (type === 'Int') return { kind: 'IntValue', value: `${value}` };
    if (type === 'Float') return { kind: 'FloatValue', value: `${value}` };
    if (type === 'Boolean') return { kind: 'BooleanValue', value };
    if (type === 'ID') return { kind: 'StringValue', value }; // ???
    throw new Error('');
};

/**
 *
 * @param {Object} propValue - Actually it's Immutable.Record; see models/ProjectComponentProp
 * @param {string} type
 * @param {string} kind
 * @return {Object|NO_VALUE}
 */
const buildGraphQLValue = (propValue, type, kind) => {
    // TODO: Deal with values
    if (propValue.source === 'static') {
        if (propValue.sourceData.ownerPropName) {
            return NO_VALUE;
        }
        else {
            return NO_VALUE;
        }
    }
    else {
        return NO_VALUE;
    }
};

/**
 *
 * @param {string} argName
 * @param {Object} argValue
 * @param {Object} fieldDefinition
 * @return {Object}
 */
const buildGraphQLArgument = (argName, argValue, fieldDefinition) => {
    const value = buildGraphQLValue(
        argValue,
        fieldDefinition.type,
        fieldDefinition.kind
    );

    return value === NO_VALUE ? NO_VALUE : {
        kind: 'Argument',
        name: { kind: 'Name', value: argName },
        value
    };
};

/**
 *
 * @param {Object} propValue - Actually it's Immutable.Record; see models/ProjectComponentProp
 * @param {string} fragmentName
 * @param {DataSchema} schema
 * @param {Object} dataContextTree
 * @return {Object}
 */
const buildGraphQLFragmentForValue = (
    propValue,
    fragmentName,
    schema,
    dataContextTree
) => {
    const onType = resolveGraphQLType(propValue, dataContextTree);

    const ret = {
        kind: 'FragmentDefinition',
        name: {
            kind: 'Name',
            value: fragmentName
        },
        typeCondition: {
            kind: 'NamedType',
            name: {
                kind: 'Name',
                value: onType
            }
        },
        directives: [],
        selectionSet: null
    };

    let currentNode = ret,
        currentType = onType;

    propValue.sourceData.queryPath.forEach(step => {
        const [fieldName, connectionFieldName] = step.field.split('/'),
            currentTypeDefinition = schema.types[currentType],
            currentFieldDefinition = currentTypeDefinition.fields[fieldName];

        if (connectionFieldName) {
            if (currentFieldDefinition.kind !== FIELD_KINDS.CONNECTION) {
                throw new Error(
                    'Got slash field in path, but the field is not a connection'
                );
            }

            const args = [];

            if (step.args) {
                step.args.forEach((argValue, argName) => {
                    const arg = buildGraphQLArgument(
                        argName,
                        argValue,
                        currentTypeDefinition
                            .fields[fieldName]
                            .connectionFields[connectionFieldName]
                    );

                    if (arg !== NO_VALUE) args.push(arg);
                });
            }

            const node = {
                kind: 'Field',
                alias: null,
                name: {
                    kind: 'Name',
                    value: fieldName
                },
                arguments: [],
                directives: [],
                selectionSet: {
                    kind: 'SelectionSet',
                    selections: [{
                        kind: 'Field',
                        alias: null,
                        name: {
                            kind: 'Name',
                            value: connectionFieldName
                        },
                        arguments: args,
                        directives: [],
                        selectionSet: null
                    }]
                }
            };

            currentNode.selectionSet = {
                kind: 'SelectionSet',
                selections: [node]
            };

            currentNode = node.selectionSet.selections[0];
        }
        else if (currentFieldDefinition.kind === FIELD_KINDS.CONNECTION) {
            // TODO: Handle connection arguments

            const node = {
                kind: 'Field',
                alias: null,
                name: {
                    kind: 'Name',
                    value: fieldName
                },
                arguments: [],
                directives: [],
                selectionSet: {
                    kind: 'SelectionSet',
                    selections: [{
                        kind: 'Field',
                        alias: null,
                        name: {
                            kind: 'Name',
                            value: 'edges'
                        },
                        arguments: [],
                        directives: [],
                        selectionSet: {
                            kind: 'SelectionSet',
                            selections: [{
                                kind: 'Field',
                                alias: null,
                                name: {
                                    kind: 'Name',
                                    value: 'node'
                                },
                                arguments: [],
                                directives: [],
                                selectionSet: null
                            }]
                        }
                    }]
                }
            };

            currentNode.selectionSet = {
                kind: 'SelectionSet',
                selections: [node]
            };

            currentNode = node.selectionSet.selections[0].selectionSet.selections[0];
        }
        else {
            const args = [];

            if (step.args) {
                step.args.forEach((argValue, argName) => {
                    const arg = buildGraphQLArgument(
                        argName,
                        argValue,
                        currentTypeDefinition.fields[fieldName]
                    );

                    if (arg !== NO_VALUE) args.push(arg);
                });
            }

            const node = {
                kind: 'Field',
                alias: null,
                name: {
                    kind: 'Name',
                    value: fieldName
                },
                arguments: args,
                directives: [],
                selectionSet: null
            };

            currentNode.selectionSet = {
                kind: 'SelectionSet',
                selections: [node]
            };

            currentNode = node;
        }

        currentType = getTypeNameByField(
            schema,
            step.field,
            currentType
        );
    });

    return ret;
};

const DataContextTreeNode = Record({
    type: '',
    fragment: null,
    children: Map()
});

const getDataContextTreeNode = (dataContextTree, propValue) =>
    dataContextTree.getIn([].concat(
        ...propValue.sourceData.dataContext.map(
            context => ['children', context]
        )
    ));

const pushDataContext = (
    dataContextTree,
    propValue,
    propMeta,
    fragment,
    schema,
    startType = schema.queryTypeName
) => {
    const newDataContextNode = new DataContextTreeNode({
        type: getTypeNameByPath(
            schema,
            propValue.sourceData.queryPath.map(step => step.field),
            startType
        ),

        fragment
    });

    const path = [].concat(
        ...propValue.sourceData.dataContext.map(
            dataContextId => ['children', dataContextId]
        ),

        'children'
    );

    return dataContextTree.updateIn(path, children =>
        children.set(
            propMeta.sourceConfigs.data.pushDataContext,
            newDataContextNode
        )
    );
};

const buildAndAttachFragmentsForDesignerProp = (
    propValue,
    propMeta,
    dataContextTree,
    meta,
    schema
) => {
    if (!propUsesDataContexts(propMeta)) return [];

    const ret = [];

    const visitComponent = component => {
        const fragmentsForComponent = buildGraphQLFragmentsForOwnComponent(
            component,
            schema,
            meta,
            dataContextTree
        );

        fragmentsForComponent.forEach(fragment => {
            ret.push(fragment);
        });
    };

    walkComponentsTree(
        propValue.sourceData.components,
        propValue.sourceData.rootId,
        visitComponent
    );

    return ret;
};

/**
 *
 * @param {Object} component - Actually it's an Immutable.Record; see models/ProjectComponent.js
 * @param {DataSchema} schema
 * @param {Object} meta
 * @param {Object} dataContextTree
 * @return {Object[]}
 */
const buildGraphQLFragmentsForOwnComponent = (
    component,
    schema,
    meta,
    dataContextTree
) => {
    const componentMeta = getComponentMeta(component.name, meta),
        ret = [],
        designerPropsWithComponent = [];

    walkSimpleProps(component, componentMeta, (propValue, propMeta) => {
        if (propValue.source === 'data') {
            if (propValue.sourceData.dataContext.size === 0) return;

            const fragment = buildGraphQLFragmentForValue(
                propValue,
                randomName(),
                schema,
                dataContextTree
            );

            ret.push(fragment);

            const dataContextTreeNode = getDataContextTreeNode(
                dataContextTree,
                propValue
            );

            const parentFragment = dataContextTreeNode.fragment;

            attachFragmentToFragment(fragment, parentFragment);

            if (propHasDataContest(propMeta)) {
                dataContextTree = pushDataContext(
                    dataContextTree,
                    propValue,
                    propMeta,
                    fragment,
                    schema,
                    dataContextTreeNode.type
                );
            }
        }
        else if (propValue.source === 'designer' && propValue.sourceData.rootId > -1) {
            designerPropsWithComponent.push({
                propValue,
                propMeta
            });
        }
    });

    if (designerPropsWithComponent.length > 0) {
        const additionalFragments = designerPropsWithComponent
            .map(({ propValue, propMeta }) => buildAndAttachFragmentsForDesignerProp(
                propValue,
                propMeta,
                dataContextTree,
                meta,
                schema
            ));

        return ret.concat(...additionalFragments);
    }
    else {
        return ret;
    }
};

/**
 *
 * @param {Object} component - Actually it's an Immutable.Record; see models/ProjectComponent.js
 * @param {DataSchema} schema
 * @param {Object} meta
 * @return {Object[]}
 */
const buildGraphQLFragmentsForComponent = (
    component,
    schema,
    meta
) => {
    const componentMeta = getComponentMeta(component.name, meta),
        ret = [],
        designerPropsWithComponent = [];

    let dataContextTree = new DataContextTreeNode({
        type: schema.queryTypeName,
        children: Map()
    });

    walkSimpleProps(component, componentMeta, (propValue, propMeta) => {
        if (propValue.source === 'data') {
            if (propValue.sourceData.dataContext.size > 0) return;

            const fragment = buildGraphQLFragmentForValue(
                propValue,
                randomName(),
                schema,
                dataContextTree
            );

            ret.push(fragment);

            if (propHasDataContest(propMeta)) {
                dataContextTree = pushDataContext(
                    dataContextTree,
                    propValue,
                    propMeta,
                    fragment,
                    schema
                );
            }
        }
        else if (propValue.source === 'designer' && propValue.sourceData.rootId > -1) {
            designerPropsWithComponent.push({
                propValue,
                propMeta
            });
        }
    });

    if (designerPropsWithComponent.length > 0) {
        const additionalFragments = designerPropsWithComponent
            .map(({ propValue, propMeta }) => buildAndAttachFragmentsForDesignerProp(
                propValue,
                propMeta,
                dataContextTree,
                meta,
                schema
            ));

        return ret.concat(...additionalFragments);
    }
    else {
        return ret;
    }
};

export const buildQueryForComponent = (component, schema, meta) => {
    const fragments = buildGraphQLFragmentsForComponent(component, schema, meta);

    if (!fragments.length) return null;

    const rootFragments = fragments.filter(
        fragment => fragment.typeCondition.name.value === schema.queryTypeName
    );

    return {
        kind: 'Document',
        definitions: [
            {
                kind: 'OperationDefinition',
                operation: 'query',
                name: {
                    kind: 'Name',
                    value: randomName()
                },
                variableDefinitions: [],
                directives: [],
                selectionSet: {
                    kind: 'SelectionSet',
                    selections: rootFragments.map(fragment => ({
                        kind: 'FragmentSpread',
                        name: {
                            kind: 'Name',
                            value: fragment.name.value
                        },
                        directives: []
                    }))
                }
            },

            ...fragments
        ]
    };
};

/**
 *
 * @param {Object} propValue
 * @param {Object} data
 * @param {DataSchema} schema
 * @param {string} [rootType]
 * @return {*}
 */
export const extractPropValueFromData = (
    propValue,
    data,
    schema,
    rootType = schema.queryTypeName
) => {
    return propValue.sourceData.queryPath.reduce((acc, queryStep) => {
        const typeDefinition = schema.types[acc.type],
            [fieldName, connectionFieldName] = queryStep.field.split('/'),
            fieldDefinition = typeDefinition.fields[fieldName];

        if (fieldDefinition.kind === FIELD_KINDS.CONNECTION) {
            if (connectionFieldName) {
                return {
                    data: data[fieldName][connectionFieldName],
                    type: fieldDefinition.connectionFields[connectionFieldName].type
                };
            }
            else {
                return {
                    data: data[fieldName].edges.map(edge => edge.node),
                    type: fieldDefinition.type
                }
            }
        }
        else {
            return {
                data: data[fieldName],
                type: fieldDefinition.type
            };
        }
    }, { data, type: rootType }).data;
};

export const mapDataToComponentProps = (component, data, schema, meta) => {
    const componentMeta = getComponentMeta(component.name, meta),
        ret = {};

    walkSimpleProps(component, componentMeta, (propValue, propMeta, path) => {
        if (propValue.source === 'data')
            _set(ret, path, extractPropValueFromData(propValue, data, schema));
    });

    return ret;
};
