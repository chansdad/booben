/**
 * @author Dmitriy Bizyaev
 */

'use strict';

import { Record, List, Map } from 'immutable';
import { isDef } from '../../utils/misc';
import { INVALID_ID } from '../../constants/misc';

export const MutationActionParams = Record({
  mutation: '',
  args: Map(), // Map of JssyValues
  successActions: List(), // List of Actions
  errorActions: List(), // List of Actions
});

export const NavigateActionParams = Record({
  routeId: INVALID_ID,
  routeParams: Map(), // Map of JssyValues
});

export const URLActionParams = Record({
  url: '',
  newWindow: true,
});

export const MethodCallActionParams = Record({
  componentId: INVALID_ID,
  method: '',
  args: List(), // List of JssyValues
});

export const PropChangeActionParams = Record({
  componentId: INVALID_ID,
  propName: '',
  systemPropName: '',
  value: null, // JssyValue
});

export const AJAXActionParams = Record({
  url: null, // JssyValue
  method: 'GET', // HTTP method
  headers: Map(), // Map of string -> string
  body: null, // JssyValue
  mode: 'cors', // cors, no-cors or same-origin
  decodeResponse: 'text', // text, blob, json or arrayBuffer
  successActions: List(), // List of Actions
  errorActions: List(), // List of Actions
});

export const LoadMoreDataActionParams = Record({
  componentId: INVALID_ID,
  pathToDataValue: List(), // For example List(['props', 'propName', 'fieldName'])
  successActions: List(), // List of Actions
  errorActions: List(), // List of Actions
});

const ASYNC_ACTIONS = new Set([
  'mutation',
  'ajax',
  'loadMoreData',
]);

export const isAsyncAction = actionType => ASYNC_ACTIONS.has(actionType);

export const Action = Record({
  type: '',
  params: null,
});

const VALID_PATH_STEPS_BY_ACTION_TYPE = {
  mutation: new Set(['args', 'successActions', 'errorActions']),
  method: new Set(['args']),
  navigate: new Set(['routeParams']),
  prop: new Set(['value']),
  ajax: new Set(['url', 'body', 'successActions', 'errorActions']),
};

Action.isValidPathStep = (step, current) => {
  const validSteps = VALID_PATH_STEPS_BY_ACTION_TYPE[current.type];
  return isDef(validSteps) ? validSteps.has(step) : false;
};

Action.expandPathStep = step => ['params', step];

export default Record({
  actions: List(),
});