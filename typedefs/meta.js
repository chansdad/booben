/**
 * @author Dmitriy Bizyaev
 */

'use strict';

/**
 * @typedef {Object} ComponentMeta - Component metadata (root object in .jssy/meta.json files).
 * @property {string} displayName - Name of component (same as ComponentClass.displayName).
 * @property {string} textKey - Key for the string used as component name in the library.
 * @property {string} [icon] - Icon file name (icon must be placed in .jssy/icons dir).
 * @property {string} descriptionTextKey - Key for the string used for component description.
 * @property {string} kind - Can be "atomic", "container" or "composite".
 * @property {string} [group] - Component group id.
 * @property {Set<string>} tags - Component tags.
 * @property {boolean} [hidden] - If true, this component will not be shown in the library.
 * @property {Object<string, ComponentPropMeta>} props - Description of component's props.
 * @property {ComponentLayout[]} [layouts] - Available layouts for composite components.
 * @property {Object<string, Object<string, string>>} [strings] - String translations. Example: { "string_key": { "en": "...", "ru": "...", ... }, ... }. Can be placed in a separate file (.jssy/strings.json).
 * @property {Object<string, TypeMeta>} [types] - User-defined types. Can be placed in a separate file (.jssy/types.json).
 */

/**
 * @typedef {Object} ComponentLayout
 * @property {string} [textKey] - Key for layout name string.
 * @property {string} [descriptionTextKey] - Key for layout description string.
 * @property {string} [icon] - Icon file name (icon must be placed in .jssy/icons dir).
 * @property {ComponentLayoutRegion[]} regions.
 */

/**
 * @typedef {Object} ComponentLayoutRegion
 * @property {string} textKey - Key for region name string.
 * @property {string} descriptionTextKey - Key for region description string.
 * @property {string} [icon] - Icon file name (icon must be placed in .jssy/icons dir).
 * @property {boolean} defaultEnabled - If true, this region will be enabled by default.
 * @property {string} component - Component name without namespace ("MainRegion", not "Reactackle.MainRegion").
 * @property {Object<string, ProjectComponentProp>} [props] - Component props' values (like in project).
 */

/**
 * @typedef {Object} ComponentPropMeta
 * @property {string} textKey - Key for prop name string.
 * @property {string} descriptionTextKey - Key for prop description string.
 * @property {string} type - Type of the prop. Can be one of the built-in types ("string", "int", "float", "bool", "oneOf", "arrayOf", "shape", "component", "func") or one of user-defined types.
 * @property {Object} [ofType] - For "arrayOf" type only - type of array items.
 * @property {Object<string, ComponentPropMeta>} [fields] - For "shape" type only.
 * @property {OneOfOption[]} [options] - For "oneOf" type only.
 * @property {string[]} source - Available sources for prop's value. Must be a subset of <"static", "data", "const", "designer", "actions">.
 * @property {Object} [sourceConfigs]
 * @property {StaticSourceConfig} [sourceConfigs.static]
 * @property {DataSourceConfig} [sourceConfigs.data]
 * @property {ConstSourceConfig} [sourceConfigs.const]
 * @property {DesignerSourceConfig} [sourceConfigs.designer]
 * @property {ActionsSourceConfig} [sourceConfigs.actions]
 */

/**
 * @typedef {Object} OneOfOption
 * @property {string} textKey
 * @property {*} value
 */

/**
 * @typedef {Object} StaticSourceConfig
 * @property {*} [default] - Default value (for scalar types only).
 * @property {string} [defaultTextKey] - String key of default value (for "string" type only).
 * @property {number} [defaultNum] - Default items num (for "arrayOf" type only).
 * @property {number} [minItems] - Min items num (for "arrayOf" type only).
 * @property {number} [maxItems] - Max items num (for "arrayOf" type only).
 */

// TODO: Define DataSourceConfig & ActionSourceConfig
/**
 * @typedef {Object} DataSourceConfig
 */

/**
 * @typedef {Object} ActionsSourceConfig
 */

/**
 * @typedef {Object} ConstSourceConfig
 * @property {*} [value]
 * @property {string} [jssyConstId] - ID of built-in constant
 */

/**
 * @typedef {Object} DesignerSourceConfigPropDesc
 * @property {string} textKey
 * @property {string} descriptionSourceKey
 * @property {string} type
 */

/**
 * @typedef {Object} DesignerSourceConfig
 * @property {string} [wrapper] - Wrapper component name
 * @property {number} [wrapperLayout] - Layout number cor composite wrapper component
 * @property {Object<string, DesignerSourceConfigPropDesc>} [props]
 */

/**
 * @typedef {Object} TypeMeta - Type definition. All fields have same meanings as in ComponentPropMeta
 * @property {string} type
 * @property {Object} [ofType]
 * @property {Object<string, ComponentPropMeta>} [fields]
 * @property {OneOfOption[]} [options]
 */