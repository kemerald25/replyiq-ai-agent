var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// .wrangler/tmp/bundle-SI07VK/checked-fetch.js
var urls = /* @__PURE__ */ new Set();
function checkURL(request, init) {
  const url = request instanceof URL ? request : new URL(
    (typeof request === "string" ? new Request(request, init) : request).url
  );
  if (url.port && url.port !== "443" && url.protocol === "https:") {
    if (!urls.has(url.toString())) {
      urls.add(url.toString());
      console.warn(
        `WARNING: known issue with \`fetch()\` requests to custom HTTPS ports in published Workers:
 - ${url.toString()} - the custom port will be ignored when the Worker is published using the \`wrangler deploy\` command.
`
      );
    }
  }
}
__name(checkURL, "checkURL");
globalThis.fetch = new Proxy(globalThis.fetch, {
  apply(target, thisArg, argArray) {
    const [request, init] = argArray;
    checkURL(request, init);
    return Reflect.apply(target, thisArg, argArray);
  }
});

// ../../packages/schema/dist/config.js
var DEFAULT_LOCALE = "en-NG";
var DEFAULT_LANGUAGE = "en";
var CURRENT_SCHEMA_VERSION = 1;
var MAX_SECTIONS_PER_DOCUMENT = 20;

// ../../node_modules/zod/v3/external.js
var external_exports = {};
__export(external_exports, {
  BRAND: () => BRAND,
  DIRTY: () => DIRTY,
  EMPTY_PATH: () => EMPTY_PATH,
  INVALID: () => INVALID,
  NEVER: () => NEVER,
  OK: () => OK,
  ParseStatus: () => ParseStatus,
  Schema: () => ZodType,
  ZodAny: () => ZodAny,
  ZodArray: () => ZodArray,
  ZodBigInt: () => ZodBigInt,
  ZodBoolean: () => ZodBoolean,
  ZodBranded: () => ZodBranded,
  ZodCatch: () => ZodCatch,
  ZodDate: () => ZodDate,
  ZodDefault: () => ZodDefault,
  ZodDiscriminatedUnion: () => ZodDiscriminatedUnion,
  ZodEffects: () => ZodEffects,
  ZodEnum: () => ZodEnum,
  ZodError: () => ZodError,
  ZodFirstPartyTypeKind: () => ZodFirstPartyTypeKind,
  ZodFunction: () => ZodFunction,
  ZodIntersection: () => ZodIntersection,
  ZodIssueCode: () => ZodIssueCode,
  ZodLazy: () => ZodLazy,
  ZodLiteral: () => ZodLiteral,
  ZodMap: () => ZodMap,
  ZodNaN: () => ZodNaN,
  ZodNativeEnum: () => ZodNativeEnum,
  ZodNever: () => ZodNever,
  ZodNull: () => ZodNull,
  ZodNullable: () => ZodNullable,
  ZodNumber: () => ZodNumber,
  ZodObject: () => ZodObject,
  ZodOptional: () => ZodOptional,
  ZodParsedType: () => ZodParsedType,
  ZodPipeline: () => ZodPipeline,
  ZodPromise: () => ZodPromise,
  ZodReadonly: () => ZodReadonly,
  ZodRecord: () => ZodRecord,
  ZodSchema: () => ZodType,
  ZodSet: () => ZodSet,
  ZodString: () => ZodString,
  ZodSymbol: () => ZodSymbol,
  ZodTransformer: () => ZodEffects,
  ZodTuple: () => ZodTuple,
  ZodType: () => ZodType,
  ZodUndefined: () => ZodUndefined,
  ZodUnion: () => ZodUnion,
  ZodUnknown: () => ZodUnknown,
  ZodVoid: () => ZodVoid,
  addIssueToContext: () => addIssueToContext,
  any: () => anyType,
  array: () => arrayType,
  bigint: () => bigIntType,
  boolean: () => booleanType,
  coerce: () => coerce,
  custom: () => custom,
  date: () => dateType,
  datetimeRegex: () => datetimeRegex,
  defaultErrorMap: () => en_default,
  discriminatedUnion: () => discriminatedUnionType,
  effect: () => effectsType,
  enum: () => enumType,
  function: () => functionType,
  getErrorMap: () => getErrorMap,
  getParsedType: () => getParsedType,
  instanceof: () => instanceOfType,
  intersection: () => intersectionType,
  isAborted: () => isAborted,
  isAsync: () => isAsync,
  isDirty: () => isDirty,
  isValid: () => isValid,
  late: () => late,
  lazy: () => lazyType,
  literal: () => literalType,
  makeIssue: () => makeIssue,
  map: () => mapType,
  nan: () => nanType,
  nativeEnum: () => nativeEnumType,
  never: () => neverType,
  null: () => nullType,
  nullable: () => nullableType,
  number: () => numberType,
  object: () => objectType,
  objectUtil: () => objectUtil,
  oboolean: () => oboolean,
  onumber: () => onumber,
  optional: () => optionalType,
  ostring: () => ostring,
  pipeline: () => pipelineType,
  preprocess: () => preprocessType,
  promise: () => promiseType,
  quotelessJson: () => quotelessJson,
  record: () => recordType,
  set: () => setType,
  setErrorMap: () => setErrorMap,
  strictObject: () => strictObjectType,
  string: () => stringType,
  symbol: () => symbolType,
  transformer: () => effectsType,
  tuple: () => tupleType,
  undefined: () => undefinedType,
  union: () => unionType,
  unknown: () => unknownType,
  util: () => util,
  void: () => voidType
});

// ../../node_modules/zod/v3/helpers/util.js
var util;
(function(util2) {
  util2.assertEqual = (_) => {
  };
  function assertIs(_arg) {
  }
  __name(assertIs, "assertIs");
  util2.assertIs = assertIs;
  function assertNever2(_x) {
    throw new Error();
  }
  __name(assertNever2, "assertNever");
  util2.assertNever = assertNever2;
  util2.arrayToEnum = (items) => {
    const obj = {};
    for (const item of items) {
      obj[item] = item;
    }
    return obj;
  };
  util2.getValidEnumValues = (obj) => {
    const validKeys = util2.objectKeys(obj).filter((k) => typeof obj[obj[k]] !== "number");
    const filtered = {};
    for (const k of validKeys) {
      filtered[k] = obj[k];
    }
    return util2.objectValues(filtered);
  };
  util2.objectValues = (obj) => {
    return util2.objectKeys(obj).map(function(e) {
      return obj[e];
    });
  };
  util2.objectKeys = typeof Object.keys === "function" ? (obj) => Object.keys(obj) : (object) => {
    const keys = [];
    for (const key in object) {
      if (Object.prototype.hasOwnProperty.call(object, key)) {
        keys.push(key);
      }
    }
    return keys;
  };
  util2.find = (arr, checker) => {
    for (const item of arr) {
      if (checker(item))
        return item;
    }
    return void 0;
  };
  util2.isInteger = typeof Number.isInteger === "function" ? (val) => Number.isInteger(val) : (val) => typeof val === "number" && Number.isFinite(val) && Math.floor(val) === val;
  function joinValues(array, separator = " | ") {
    return array.map((val) => typeof val === "string" ? `'${val}'` : val).join(separator);
  }
  __name(joinValues, "joinValues");
  util2.joinValues = joinValues;
  util2.jsonStringifyReplacer = (_, value) => {
    if (typeof value === "bigint") {
      return value.toString();
    }
    return value;
  };
})(util || (util = {}));
var objectUtil;
(function(objectUtil2) {
  objectUtil2.mergeShapes = (first, second) => {
    return {
      ...first,
      ...second
      // second overwrites first
    };
  };
})(objectUtil || (objectUtil = {}));
var ZodParsedType = util.arrayToEnum([
  "string",
  "nan",
  "number",
  "integer",
  "float",
  "boolean",
  "date",
  "bigint",
  "symbol",
  "function",
  "undefined",
  "null",
  "array",
  "object",
  "unknown",
  "promise",
  "void",
  "never",
  "map",
  "set"
]);
var getParsedType = /* @__PURE__ */ __name((data) => {
  const t = typeof data;
  switch (t) {
    case "undefined":
      return ZodParsedType.undefined;
    case "string":
      return ZodParsedType.string;
    case "number":
      return Number.isNaN(data) ? ZodParsedType.nan : ZodParsedType.number;
    case "boolean":
      return ZodParsedType.boolean;
    case "function":
      return ZodParsedType.function;
    case "bigint":
      return ZodParsedType.bigint;
    case "symbol":
      return ZodParsedType.symbol;
    case "object":
      if (Array.isArray(data)) {
        return ZodParsedType.array;
      }
      if (data === null) {
        return ZodParsedType.null;
      }
      if (data.then && typeof data.then === "function" && data.catch && typeof data.catch === "function") {
        return ZodParsedType.promise;
      }
      if (typeof Map !== "undefined" && data instanceof Map) {
        return ZodParsedType.map;
      }
      if (typeof Set !== "undefined" && data instanceof Set) {
        return ZodParsedType.set;
      }
      if (typeof Date !== "undefined" && data instanceof Date) {
        return ZodParsedType.date;
      }
      return ZodParsedType.object;
    default:
      return ZodParsedType.unknown;
  }
}, "getParsedType");

// ../../node_modules/zod/v3/ZodError.js
var ZodIssueCode = util.arrayToEnum([
  "invalid_type",
  "invalid_literal",
  "custom",
  "invalid_union",
  "invalid_union_discriminator",
  "invalid_enum_value",
  "unrecognized_keys",
  "invalid_arguments",
  "invalid_return_type",
  "invalid_date",
  "invalid_string",
  "too_small",
  "too_big",
  "invalid_intersection_types",
  "not_multiple_of",
  "not_finite"
]);
var quotelessJson = /* @__PURE__ */ __name((obj) => {
  const json = JSON.stringify(obj, null, 2);
  return json.replace(/"([^"]+)":/g, "$1:");
}, "quotelessJson");
var ZodError = class _ZodError extends Error {
  static {
    __name(this, "ZodError");
  }
  get errors() {
    return this.issues;
  }
  constructor(issues) {
    super();
    this.issues = [];
    this.addIssue = (sub) => {
      this.issues = [...this.issues, sub];
    };
    this.addIssues = (subs = []) => {
      this.issues = [...this.issues, ...subs];
    };
    const actualProto = new.target.prototype;
    if (Object.setPrototypeOf) {
      Object.setPrototypeOf(this, actualProto);
    } else {
      this.__proto__ = actualProto;
    }
    this.name = "ZodError";
    this.issues = issues;
  }
  format(_mapper) {
    const mapper = _mapper || function(issue) {
      return issue.message;
    };
    const fieldErrors = { _errors: [] };
    const processError = /* @__PURE__ */ __name((error) => {
      for (const issue of error.issues) {
        if (issue.code === "invalid_union") {
          issue.unionErrors.map(processError);
        } else if (issue.code === "invalid_return_type") {
          processError(issue.returnTypeError);
        } else if (issue.code === "invalid_arguments") {
          processError(issue.argumentsError);
        } else if (issue.path.length === 0) {
          fieldErrors._errors.push(mapper(issue));
        } else {
          let curr = fieldErrors;
          let i = 0;
          while (i < issue.path.length) {
            const el = issue.path[i];
            const terminal = i === issue.path.length - 1;
            if (!terminal) {
              curr[el] = curr[el] || { _errors: [] };
            } else {
              curr[el] = curr[el] || { _errors: [] };
              curr[el]._errors.push(mapper(issue));
            }
            curr = curr[el];
            i++;
          }
        }
      }
    }, "processError");
    processError(this);
    return fieldErrors;
  }
  static assert(value) {
    if (!(value instanceof _ZodError)) {
      throw new Error(`Not a ZodError: ${value}`);
    }
  }
  toString() {
    return this.message;
  }
  get message() {
    return JSON.stringify(this.issues, util.jsonStringifyReplacer, 2);
  }
  get isEmpty() {
    return this.issues.length === 0;
  }
  flatten(mapper = (issue) => issue.message) {
    const fieldErrors = {};
    const formErrors = [];
    for (const sub of this.issues) {
      if (sub.path.length > 0) {
        const firstEl = sub.path[0];
        fieldErrors[firstEl] = fieldErrors[firstEl] || [];
        fieldErrors[firstEl].push(mapper(sub));
      } else {
        formErrors.push(mapper(sub));
      }
    }
    return { formErrors, fieldErrors };
  }
  get formErrors() {
    return this.flatten();
  }
};
ZodError.create = (issues) => {
  const error = new ZodError(issues);
  return error;
};

// ../../node_modules/zod/v3/locales/en.js
var errorMap = /* @__PURE__ */ __name((issue, _ctx) => {
  let message;
  switch (issue.code) {
    case ZodIssueCode.invalid_type:
      if (issue.received === ZodParsedType.undefined) {
        message = "Required";
      } else {
        message = `Expected ${issue.expected}, received ${issue.received}`;
      }
      break;
    case ZodIssueCode.invalid_literal:
      message = `Invalid literal value, expected ${JSON.stringify(issue.expected, util.jsonStringifyReplacer)}`;
      break;
    case ZodIssueCode.unrecognized_keys:
      message = `Unrecognized key(s) in object: ${util.joinValues(issue.keys, ", ")}`;
      break;
    case ZodIssueCode.invalid_union:
      message = `Invalid input`;
      break;
    case ZodIssueCode.invalid_union_discriminator:
      message = `Invalid discriminator value. Expected ${util.joinValues(issue.options)}`;
      break;
    case ZodIssueCode.invalid_enum_value:
      message = `Invalid enum value. Expected ${util.joinValues(issue.options)}, received '${issue.received}'`;
      break;
    case ZodIssueCode.invalid_arguments:
      message = `Invalid function arguments`;
      break;
    case ZodIssueCode.invalid_return_type:
      message = `Invalid function return type`;
      break;
    case ZodIssueCode.invalid_date:
      message = `Invalid date`;
      break;
    case ZodIssueCode.invalid_string:
      if (typeof issue.validation === "object") {
        if ("includes" in issue.validation) {
          message = `Invalid input: must include "${issue.validation.includes}"`;
          if (typeof issue.validation.position === "number") {
            message = `${message} at one or more positions greater than or equal to ${issue.validation.position}`;
          }
        } else if ("startsWith" in issue.validation) {
          message = `Invalid input: must start with "${issue.validation.startsWith}"`;
        } else if ("endsWith" in issue.validation) {
          message = `Invalid input: must end with "${issue.validation.endsWith}"`;
        } else {
          util.assertNever(issue.validation);
        }
      } else if (issue.validation !== "regex") {
        message = `Invalid ${issue.validation}`;
      } else {
        message = "Invalid";
      }
      break;
    case ZodIssueCode.too_small:
      if (issue.type === "array")
        message = `Array must contain ${issue.exact ? "exactly" : issue.inclusive ? `at least` : `more than`} ${issue.minimum} element(s)`;
      else if (issue.type === "string")
        message = `String must contain ${issue.exact ? "exactly" : issue.inclusive ? `at least` : `over`} ${issue.minimum} character(s)`;
      else if (issue.type === "number")
        message = `Number must be ${issue.exact ? `exactly equal to ` : issue.inclusive ? `greater than or equal to ` : `greater than `}${issue.minimum}`;
      else if (issue.type === "bigint")
        message = `Number must be ${issue.exact ? `exactly equal to ` : issue.inclusive ? `greater than or equal to ` : `greater than `}${issue.minimum}`;
      else if (issue.type === "date")
        message = `Date must be ${issue.exact ? `exactly equal to ` : issue.inclusive ? `greater than or equal to ` : `greater than `}${new Date(Number(issue.minimum))}`;
      else
        message = "Invalid input";
      break;
    case ZodIssueCode.too_big:
      if (issue.type === "array")
        message = `Array must contain ${issue.exact ? `exactly` : issue.inclusive ? `at most` : `less than`} ${issue.maximum} element(s)`;
      else if (issue.type === "string")
        message = `String must contain ${issue.exact ? `exactly` : issue.inclusive ? `at most` : `under`} ${issue.maximum} character(s)`;
      else if (issue.type === "number")
        message = `Number must be ${issue.exact ? `exactly` : issue.inclusive ? `less than or equal to` : `less than`} ${issue.maximum}`;
      else if (issue.type === "bigint")
        message = `BigInt must be ${issue.exact ? `exactly` : issue.inclusive ? `less than or equal to` : `less than`} ${issue.maximum}`;
      else if (issue.type === "date")
        message = `Date must be ${issue.exact ? `exactly` : issue.inclusive ? `smaller than or equal to` : `smaller than`} ${new Date(Number(issue.maximum))}`;
      else
        message = "Invalid input";
      break;
    case ZodIssueCode.custom:
      message = `Invalid input`;
      break;
    case ZodIssueCode.invalid_intersection_types:
      message = `Intersection results could not be merged`;
      break;
    case ZodIssueCode.not_multiple_of:
      message = `Number must be a multiple of ${issue.multipleOf}`;
      break;
    case ZodIssueCode.not_finite:
      message = "Number must be finite";
      break;
    default:
      message = _ctx.defaultError;
      util.assertNever(issue);
  }
  return { message };
}, "errorMap");
var en_default = errorMap;

// ../../node_modules/zod/v3/errors.js
var overrideErrorMap = en_default;
function setErrorMap(map) {
  overrideErrorMap = map;
}
__name(setErrorMap, "setErrorMap");
function getErrorMap() {
  return overrideErrorMap;
}
__name(getErrorMap, "getErrorMap");

// ../../node_modules/zod/v3/helpers/parseUtil.js
var makeIssue = /* @__PURE__ */ __name((params) => {
  const { data, path, errorMaps, issueData } = params;
  const fullPath = [...path, ...issueData.path || []];
  const fullIssue = {
    ...issueData,
    path: fullPath
  };
  if (issueData.message !== void 0) {
    return {
      ...issueData,
      path: fullPath,
      message: issueData.message
    };
  }
  let errorMessage = "";
  const maps = errorMaps.filter((m) => !!m).slice().reverse();
  for (const map of maps) {
    errorMessage = map(fullIssue, { data, defaultError: errorMessage }).message;
  }
  return {
    ...issueData,
    path: fullPath,
    message: errorMessage
  };
}, "makeIssue");
var EMPTY_PATH = [];
function addIssueToContext(ctx, issueData) {
  const overrideMap = getErrorMap();
  const issue = makeIssue({
    issueData,
    data: ctx.data,
    path: ctx.path,
    errorMaps: [
      ctx.common.contextualErrorMap,
      // contextual error map is first priority
      ctx.schemaErrorMap,
      // then schema-bound map if available
      overrideMap,
      // then global override map
      overrideMap === en_default ? void 0 : en_default
      // then global default map
    ].filter((x) => !!x)
  });
  ctx.common.issues.push(issue);
}
__name(addIssueToContext, "addIssueToContext");
var ParseStatus = class _ParseStatus {
  static {
    __name(this, "ParseStatus");
  }
  constructor() {
    this.value = "valid";
  }
  dirty() {
    if (this.value === "valid")
      this.value = "dirty";
  }
  abort() {
    if (this.value !== "aborted")
      this.value = "aborted";
  }
  static mergeArray(status, results) {
    const arrayValue = [];
    for (const s of results) {
      if (s.status === "aborted")
        return INVALID;
      if (s.status === "dirty")
        status.dirty();
      arrayValue.push(s.value);
    }
    return { status: status.value, value: arrayValue };
  }
  static async mergeObjectAsync(status, pairs) {
    const syncPairs = [];
    for (const pair of pairs) {
      const key = await pair.key;
      const value = await pair.value;
      syncPairs.push({
        key,
        value
      });
    }
    return _ParseStatus.mergeObjectSync(status, syncPairs);
  }
  static mergeObjectSync(status, pairs) {
    const finalObject = {};
    for (const pair of pairs) {
      const { key, value } = pair;
      if (key.status === "aborted")
        return INVALID;
      if (value.status === "aborted")
        return INVALID;
      if (key.status === "dirty")
        status.dirty();
      if (value.status === "dirty")
        status.dirty();
      if (key.value !== "__proto__" && (typeof value.value !== "undefined" || pair.alwaysSet)) {
        finalObject[key.value] = value.value;
      }
    }
    return { status: status.value, value: finalObject };
  }
};
var INVALID = Object.freeze({
  status: "aborted"
});
var DIRTY = /* @__PURE__ */ __name((value) => ({ status: "dirty", value }), "DIRTY");
var OK = /* @__PURE__ */ __name((value) => ({ status: "valid", value }), "OK");
var isAborted = /* @__PURE__ */ __name((x) => x.status === "aborted", "isAborted");
var isDirty = /* @__PURE__ */ __name((x) => x.status === "dirty", "isDirty");
var isValid = /* @__PURE__ */ __name((x) => x.status === "valid", "isValid");
var isAsync = /* @__PURE__ */ __name((x) => typeof Promise !== "undefined" && x instanceof Promise, "isAsync");

// ../../node_modules/zod/v3/helpers/errorUtil.js
var errorUtil;
(function(errorUtil2) {
  errorUtil2.errToObj = (message) => typeof message === "string" ? { message } : message || {};
  errorUtil2.toString = (message) => typeof message === "string" ? message : message?.message;
})(errorUtil || (errorUtil = {}));

// ../../node_modules/zod/v3/types.js
var ParseInputLazyPath = class {
  static {
    __name(this, "ParseInputLazyPath");
  }
  constructor(parent, value, path, key) {
    this._cachedPath = [];
    this.parent = parent;
    this.data = value;
    this._path = path;
    this._key = key;
  }
  get path() {
    if (!this._cachedPath.length) {
      if (Array.isArray(this._key)) {
        this._cachedPath.push(...this._path, ...this._key);
      } else {
        this._cachedPath.push(...this._path, this._key);
      }
    }
    return this._cachedPath;
  }
};
var handleResult = /* @__PURE__ */ __name((ctx, result) => {
  if (isValid(result)) {
    return { success: true, data: result.value };
  } else {
    if (!ctx.common.issues.length) {
      throw new Error("Validation failed but no issues detected.");
    }
    return {
      success: false,
      get error() {
        if (this._error)
          return this._error;
        const error = new ZodError(ctx.common.issues);
        this._error = error;
        return this._error;
      }
    };
  }
}, "handleResult");
function processCreateParams(params) {
  if (!params)
    return {};
  const { errorMap: errorMap2, invalid_type_error, required_error, description } = params;
  if (errorMap2 && (invalid_type_error || required_error)) {
    throw new Error(`Can't use "invalid_type_error" or "required_error" in conjunction with custom error map.`);
  }
  if (errorMap2)
    return { errorMap: errorMap2, description };
  const customMap = /* @__PURE__ */ __name((iss, ctx) => {
    const { message } = params;
    if (iss.code === "invalid_enum_value") {
      return { message: message ?? ctx.defaultError };
    }
    if (typeof ctx.data === "undefined") {
      return { message: message ?? required_error ?? ctx.defaultError };
    }
    if (iss.code !== "invalid_type")
      return { message: ctx.defaultError };
    return { message: message ?? invalid_type_error ?? ctx.defaultError };
  }, "customMap");
  return { errorMap: customMap, description };
}
__name(processCreateParams, "processCreateParams");
var ZodType = class {
  static {
    __name(this, "ZodType");
  }
  get description() {
    return this._def.description;
  }
  _getType(input) {
    return getParsedType(input.data);
  }
  _getOrReturnCtx(input, ctx) {
    return ctx || {
      common: input.parent.common,
      data: input.data,
      parsedType: getParsedType(input.data),
      schemaErrorMap: this._def.errorMap,
      path: input.path,
      parent: input.parent
    };
  }
  _processInputParams(input) {
    return {
      status: new ParseStatus(),
      ctx: {
        common: input.parent.common,
        data: input.data,
        parsedType: getParsedType(input.data),
        schemaErrorMap: this._def.errorMap,
        path: input.path,
        parent: input.parent
      }
    };
  }
  _parseSync(input) {
    const result = this._parse(input);
    if (isAsync(result)) {
      throw new Error("Synchronous parse encountered promise.");
    }
    return result;
  }
  _parseAsync(input) {
    const result = this._parse(input);
    return Promise.resolve(result);
  }
  parse(data, params) {
    const result = this.safeParse(data, params);
    if (result.success)
      return result.data;
    throw result.error;
  }
  safeParse(data, params) {
    const ctx = {
      common: {
        issues: [],
        async: params?.async ?? false,
        contextualErrorMap: params?.errorMap
      },
      path: params?.path || [],
      schemaErrorMap: this._def.errorMap,
      parent: null,
      data,
      parsedType: getParsedType(data)
    };
    const result = this._parseSync({ data, path: ctx.path, parent: ctx });
    return handleResult(ctx, result);
  }
  "~validate"(data) {
    const ctx = {
      common: {
        issues: [],
        async: !!this["~standard"].async
      },
      path: [],
      schemaErrorMap: this._def.errorMap,
      parent: null,
      data,
      parsedType: getParsedType(data)
    };
    if (!this["~standard"].async) {
      try {
        const result = this._parseSync({ data, path: [], parent: ctx });
        return isValid(result) ? {
          value: result.value
        } : {
          issues: ctx.common.issues
        };
      } catch (err) {
        if (err?.message?.toLowerCase()?.includes("encountered")) {
          this["~standard"].async = true;
        }
        ctx.common = {
          issues: [],
          async: true
        };
      }
    }
    return this._parseAsync({ data, path: [], parent: ctx }).then((result) => isValid(result) ? {
      value: result.value
    } : {
      issues: ctx.common.issues
    });
  }
  async parseAsync(data, params) {
    const result = await this.safeParseAsync(data, params);
    if (result.success)
      return result.data;
    throw result.error;
  }
  async safeParseAsync(data, params) {
    const ctx = {
      common: {
        issues: [],
        contextualErrorMap: params?.errorMap,
        async: true
      },
      path: params?.path || [],
      schemaErrorMap: this._def.errorMap,
      parent: null,
      data,
      parsedType: getParsedType(data)
    };
    const maybeAsyncResult = this._parse({ data, path: ctx.path, parent: ctx });
    const result = await (isAsync(maybeAsyncResult) ? maybeAsyncResult : Promise.resolve(maybeAsyncResult));
    return handleResult(ctx, result);
  }
  refine(check, message) {
    const getIssueProperties = /* @__PURE__ */ __name((val) => {
      if (typeof message === "string" || typeof message === "undefined") {
        return { message };
      } else if (typeof message === "function") {
        return message(val);
      } else {
        return message;
      }
    }, "getIssueProperties");
    return this._refinement((val, ctx) => {
      const result = check(val);
      const setError = /* @__PURE__ */ __name(() => ctx.addIssue({
        code: ZodIssueCode.custom,
        ...getIssueProperties(val)
      }), "setError");
      if (typeof Promise !== "undefined" && result instanceof Promise) {
        return result.then((data) => {
          if (!data) {
            setError();
            return false;
          } else {
            return true;
          }
        });
      }
      if (!result) {
        setError();
        return false;
      } else {
        return true;
      }
    });
  }
  refinement(check, refinementData) {
    return this._refinement((val, ctx) => {
      if (!check(val)) {
        ctx.addIssue(typeof refinementData === "function" ? refinementData(val, ctx) : refinementData);
        return false;
      } else {
        return true;
      }
    });
  }
  _refinement(refinement) {
    return new ZodEffects({
      schema: this,
      typeName: ZodFirstPartyTypeKind.ZodEffects,
      effect: { type: "refinement", refinement }
    });
  }
  superRefine(refinement) {
    return this._refinement(refinement);
  }
  constructor(def) {
    this.spa = this.safeParseAsync;
    this._def = def;
    this.parse = this.parse.bind(this);
    this.safeParse = this.safeParse.bind(this);
    this.parseAsync = this.parseAsync.bind(this);
    this.safeParseAsync = this.safeParseAsync.bind(this);
    this.spa = this.spa.bind(this);
    this.refine = this.refine.bind(this);
    this.refinement = this.refinement.bind(this);
    this.superRefine = this.superRefine.bind(this);
    this.optional = this.optional.bind(this);
    this.nullable = this.nullable.bind(this);
    this.nullish = this.nullish.bind(this);
    this.array = this.array.bind(this);
    this.promise = this.promise.bind(this);
    this.or = this.or.bind(this);
    this.and = this.and.bind(this);
    this.transform = this.transform.bind(this);
    this.brand = this.brand.bind(this);
    this.default = this.default.bind(this);
    this.catch = this.catch.bind(this);
    this.describe = this.describe.bind(this);
    this.pipe = this.pipe.bind(this);
    this.readonly = this.readonly.bind(this);
    this.isNullable = this.isNullable.bind(this);
    this.isOptional = this.isOptional.bind(this);
    this["~standard"] = {
      version: 1,
      vendor: "zod",
      validate: /* @__PURE__ */ __name((data) => this["~validate"](data), "validate")
    };
  }
  optional() {
    return ZodOptional.create(this, this._def);
  }
  nullable() {
    return ZodNullable.create(this, this._def);
  }
  nullish() {
    return this.nullable().optional();
  }
  array() {
    return ZodArray.create(this);
  }
  promise() {
    return ZodPromise.create(this, this._def);
  }
  or(option) {
    return ZodUnion.create([this, option], this._def);
  }
  and(incoming) {
    return ZodIntersection.create(this, incoming, this._def);
  }
  transform(transform) {
    return new ZodEffects({
      ...processCreateParams(this._def),
      schema: this,
      typeName: ZodFirstPartyTypeKind.ZodEffects,
      effect: { type: "transform", transform }
    });
  }
  default(def) {
    const defaultValueFunc = typeof def === "function" ? def : () => def;
    return new ZodDefault({
      ...processCreateParams(this._def),
      innerType: this,
      defaultValue: defaultValueFunc,
      typeName: ZodFirstPartyTypeKind.ZodDefault
    });
  }
  brand() {
    return new ZodBranded({
      typeName: ZodFirstPartyTypeKind.ZodBranded,
      type: this,
      ...processCreateParams(this._def)
    });
  }
  catch(def) {
    const catchValueFunc = typeof def === "function" ? def : () => def;
    return new ZodCatch({
      ...processCreateParams(this._def),
      innerType: this,
      catchValue: catchValueFunc,
      typeName: ZodFirstPartyTypeKind.ZodCatch
    });
  }
  describe(description) {
    const This = this.constructor;
    return new This({
      ...this._def,
      description
    });
  }
  pipe(target) {
    return ZodPipeline.create(this, target);
  }
  readonly() {
    return ZodReadonly.create(this);
  }
  isOptional() {
    return this.safeParse(void 0).success;
  }
  isNullable() {
    return this.safeParse(null).success;
  }
};
var cuidRegex = /^c[^\s-]{8,}$/i;
var cuid2Regex = /^[0-9a-z]+$/;
var ulidRegex = /^[0-9A-HJKMNP-TV-Z]{26}$/i;
var uuidRegex = /^[0-9a-fA-F]{8}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{12}$/i;
var nanoidRegex = /^[a-z0-9_-]{21}$/i;
var jwtRegex = /^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]*$/;
var durationRegex = /^[-+]?P(?!$)(?:(?:[-+]?\d+Y)|(?:[-+]?\d+[.,]\d+Y$))?(?:(?:[-+]?\d+M)|(?:[-+]?\d+[.,]\d+M$))?(?:(?:[-+]?\d+W)|(?:[-+]?\d+[.,]\d+W$))?(?:(?:[-+]?\d+D)|(?:[-+]?\d+[.,]\d+D$))?(?:T(?=[\d+-])(?:(?:[-+]?\d+H)|(?:[-+]?\d+[.,]\d+H$))?(?:(?:[-+]?\d+M)|(?:[-+]?\d+[.,]\d+M$))?(?:[-+]?\d+(?:[.,]\d+)?S)?)??$/;
var emailRegex = /^(?!\.)(?!.*\.\.)([A-Z0-9_'+\-\.]*)[A-Z0-9_+-]@([A-Z0-9][A-Z0-9\-]*\.)+[A-Z]{2,}$/i;
var _emojiRegex = `^(\\p{Extended_Pictographic}|\\p{Emoji_Component})+$`;
var emojiRegex;
var ipv4Regex = /^(?:(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\.){3}(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])$/;
var ipv4CidrRegex = /^(?:(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\.){3}(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\/(3[0-2]|[12]?[0-9])$/;
var ipv6Regex = /^(([0-9a-fA-F]{1,4}:){7,7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:)|fe80:(:[0-9a-fA-F]{0,4}){0,4}%[0-9a-zA-Z]{1,}|::(ffff(:0{1,4}){0,1}:){0,1}((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])|([0-9a-fA-F]{1,4}:){1,4}:((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9]))$/;
var ipv6CidrRegex = /^(([0-9a-fA-F]{1,4}:){7,7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:)|fe80:(:[0-9a-fA-F]{0,4}){0,4}%[0-9a-zA-Z]{1,}|::(ffff(:0{1,4}){0,1}:){0,1}((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])|([0-9a-fA-F]{1,4}:){1,4}:((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9]))\/(12[0-8]|1[01][0-9]|[1-9]?[0-9])$/;
var base64Regex = /^([0-9a-zA-Z+/]{4})*(([0-9a-zA-Z+/]{2}==)|([0-9a-zA-Z+/]{3}=))?$/;
var base64urlRegex = /^([0-9a-zA-Z-_]{4})*(([0-9a-zA-Z-_]{2}(==)?)|([0-9a-zA-Z-_]{3}(=)?))?$/;
var dateRegexSource = `((\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-((0[13578]|1[02])-(0[1-9]|[12]\\d|3[01])|(0[469]|11)-(0[1-9]|[12]\\d|30)|(02)-(0[1-9]|1\\d|2[0-8])))`;
var dateRegex = new RegExp(`^${dateRegexSource}$`);
function timeRegexSource(args) {
  let secondsRegexSource = `[0-5]\\d`;
  if (args.precision) {
    secondsRegexSource = `${secondsRegexSource}\\.\\d{${args.precision}}`;
  } else if (args.precision == null) {
    secondsRegexSource = `${secondsRegexSource}(\\.\\d+)?`;
  }
  const secondsQuantifier = args.precision ? "+" : "?";
  return `([01]\\d|2[0-3]):[0-5]\\d(:${secondsRegexSource})${secondsQuantifier}`;
}
__name(timeRegexSource, "timeRegexSource");
function timeRegex(args) {
  return new RegExp(`^${timeRegexSource(args)}$`);
}
__name(timeRegex, "timeRegex");
function datetimeRegex(args) {
  let regex = `${dateRegexSource}T${timeRegexSource(args)}`;
  const opts = [];
  opts.push(args.local ? `Z?` : `Z`);
  if (args.offset)
    opts.push(`([+-]\\d{2}:?\\d{2})`);
  regex = `${regex}(${opts.join("|")})`;
  return new RegExp(`^${regex}$`);
}
__name(datetimeRegex, "datetimeRegex");
function isValidIP(ip, version) {
  if ((version === "v4" || !version) && ipv4Regex.test(ip)) {
    return true;
  }
  if ((version === "v6" || !version) && ipv6Regex.test(ip)) {
    return true;
  }
  return false;
}
__name(isValidIP, "isValidIP");
function isValidJWT(jwt, alg) {
  if (!jwtRegex.test(jwt))
    return false;
  try {
    const [header] = jwt.split(".");
    if (!header)
      return false;
    const base64 = header.replace(/-/g, "+").replace(/_/g, "/").padEnd(header.length + (4 - header.length % 4) % 4, "=");
    const decoded = JSON.parse(atob(base64));
    if (typeof decoded !== "object" || decoded === null)
      return false;
    if ("typ" in decoded && decoded?.typ !== "JWT")
      return false;
    if (!decoded.alg)
      return false;
    if (alg && decoded.alg !== alg)
      return false;
    return true;
  } catch {
    return false;
  }
}
__name(isValidJWT, "isValidJWT");
function isValidCidr(ip, version) {
  if ((version === "v4" || !version) && ipv4CidrRegex.test(ip)) {
    return true;
  }
  if ((version === "v6" || !version) && ipv6CidrRegex.test(ip)) {
    return true;
  }
  return false;
}
__name(isValidCidr, "isValidCidr");
var ZodString = class _ZodString extends ZodType {
  static {
    __name(this, "ZodString");
  }
  _parse(input) {
    if (this._def.coerce) {
      input.data = String(input.data);
    }
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.string) {
      const ctx2 = this._getOrReturnCtx(input);
      addIssueToContext(ctx2, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.string,
        received: ctx2.parsedType
      });
      return INVALID;
    }
    const status = new ParseStatus();
    let ctx = void 0;
    for (const check of this._def.checks) {
      if (check.kind === "min") {
        if (input.data.length < check.value) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.too_small,
            minimum: check.value,
            type: "string",
            inclusive: true,
            exact: false,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "max") {
        if (input.data.length > check.value) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.too_big,
            maximum: check.value,
            type: "string",
            inclusive: true,
            exact: false,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "length") {
        const tooBig = input.data.length > check.value;
        const tooSmall = input.data.length < check.value;
        if (tooBig || tooSmall) {
          ctx = this._getOrReturnCtx(input, ctx);
          if (tooBig) {
            addIssueToContext(ctx, {
              code: ZodIssueCode.too_big,
              maximum: check.value,
              type: "string",
              inclusive: true,
              exact: true,
              message: check.message
            });
          } else if (tooSmall) {
            addIssueToContext(ctx, {
              code: ZodIssueCode.too_small,
              minimum: check.value,
              type: "string",
              inclusive: true,
              exact: true,
              message: check.message
            });
          }
          status.dirty();
        }
      } else if (check.kind === "email") {
        if (!emailRegex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "email",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "emoji") {
        if (!emojiRegex) {
          emojiRegex = new RegExp(_emojiRegex, "u");
        }
        if (!emojiRegex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "emoji",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "uuid") {
        if (!uuidRegex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "uuid",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "nanoid") {
        if (!nanoidRegex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "nanoid",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "cuid") {
        if (!cuidRegex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "cuid",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "cuid2") {
        if (!cuid2Regex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "cuid2",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "ulid") {
        if (!ulidRegex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "ulid",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "url") {
        try {
          new URL(input.data);
        } catch {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "url",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "regex") {
        check.regex.lastIndex = 0;
        const testResult = check.regex.test(input.data);
        if (!testResult) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "regex",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "trim") {
        input.data = input.data.trim();
      } else if (check.kind === "includes") {
        if (!input.data.includes(check.value, check.position)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.invalid_string,
            validation: { includes: check.value, position: check.position },
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "toLowerCase") {
        input.data = input.data.toLowerCase();
      } else if (check.kind === "toUpperCase") {
        input.data = input.data.toUpperCase();
      } else if (check.kind === "startsWith") {
        if (!input.data.startsWith(check.value)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.invalid_string,
            validation: { startsWith: check.value },
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "endsWith") {
        if (!input.data.endsWith(check.value)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.invalid_string,
            validation: { endsWith: check.value },
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "datetime") {
        const regex = datetimeRegex(check);
        if (!regex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.invalid_string,
            validation: "datetime",
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "date") {
        const regex = dateRegex;
        if (!regex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.invalid_string,
            validation: "date",
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "time") {
        const regex = timeRegex(check);
        if (!regex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.invalid_string,
            validation: "time",
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "duration") {
        if (!durationRegex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "duration",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "ip") {
        if (!isValidIP(input.data, check.version)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "ip",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "jwt") {
        if (!isValidJWT(input.data, check.alg)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "jwt",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "cidr") {
        if (!isValidCidr(input.data, check.version)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "cidr",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "base64") {
        if (!base64Regex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "base64",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "base64url") {
        if (!base64urlRegex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "base64url",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else {
        util.assertNever(check);
      }
    }
    return { status: status.value, value: input.data };
  }
  _regex(regex, validation, message) {
    return this.refinement((data) => regex.test(data), {
      validation,
      code: ZodIssueCode.invalid_string,
      ...errorUtil.errToObj(message)
    });
  }
  _addCheck(check) {
    return new _ZodString({
      ...this._def,
      checks: [...this._def.checks, check]
    });
  }
  email(message) {
    return this._addCheck({ kind: "email", ...errorUtil.errToObj(message) });
  }
  url(message) {
    return this._addCheck({ kind: "url", ...errorUtil.errToObj(message) });
  }
  emoji(message) {
    return this._addCheck({ kind: "emoji", ...errorUtil.errToObj(message) });
  }
  uuid(message) {
    return this._addCheck({ kind: "uuid", ...errorUtil.errToObj(message) });
  }
  nanoid(message) {
    return this._addCheck({ kind: "nanoid", ...errorUtil.errToObj(message) });
  }
  cuid(message) {
    return this._addCheck({ kind: "cuid", ...errorUtil.errToObj(message) });
  }
  cuid2(message) {
    return this._addCheck({ kind: "cuid2", ...errorUtil.errToObj(message) });
  }
  ulid(message) {
    return this._addCheck({ kind: "ulid", ...errorUtil.errToObj(message) });
  }
  base64(message) {
    return this._addCheck({ kind: "base64", ...errorUtil.errToObj(message) });
  }
  base64url(message) {
    return this._addCheck({
      kind: "base64url",
      ...errorUtil.errToObj(message)
    });
  }
  jwt(options) {
    return this._addCheck({ kind: "jwt", ...errorUtil.errToObj(options) });
  }
  ip(options) {
    return this._addCheck({ kind: "ip", ...errorUtil.errToObj(options) });
  }
  cidr(options) {
    return this._addCheck({ kind: "cidr", ...errorUtil.errToObj(options) });
  }
  datetime(options) {
    if (typeof options === "string") {
      return this._addCheck({
        kind: "datetime",
        precision: null,
        offset: false,
        local: false,
        message: options
      });
    }
    return this._addCheck({
      kind: "datetime",
      precision: typeof options?.precision === "undefined" ? null : options?.precision,
      offset: options?.offset ?? false,
      local: options?.local ?? false,
      ...errorUtil.errToObj(options?.message)
    });
  }
  date(message) {
    return this._addCheck({ kind: "date", message });
  }
  time(options) {
    if (typeof options === "string") {
      return this._addCheck({
        kind: "time",
        precision: null,
        message: options
      });
    }
    return this._addCheck({
      kind: "time",
      precision: typeof options?.precision === "undefined" ? null : options?.precision,
      ...errorUtil.errToObj(options?.message)
    });
  }
  duration(message) {
    return this._addCheck({ kind: "duration", ...errorUtil.errToObj(message) });
  }
  regex(regex, message) {
    return this._addCheck({
      kind: "regex",
      regex,
      ...errorUtil.errToObj(message)
    });
  }
  includes(value, options) {
    return this._addCheck({
      kind: "includes",
      value,
      position: options?.position,
      ...errorUtil.errToObj(options?.message)
    });
  }
  startsWith(value, message) {
    return this._addCheck({
      kind: "startsWith",
      value,
      ...errorUtil.errToObj(message)
    });
  }
  endsWith(value, message) {
    return this._addCheck({
      kind: "endsWith",
      value,
      ...errorUtil.errToObj(message)
    });
  }
  min(minLength, message) {
    return this._addCheck({
      kind: "min",
      value: minLength,
      ...errorUtil.errToObj(message)
    });
  }
  max(maxLength, message) {
    return this._addCheck({
      kind: "max",
      value: maxLength,
      ...errorUtil.errToObj(message)
    });
  }
  length(len, message) {
    return this._addCheck({
      kind: "length",
      value: len,
      ...errorUtil.errToObj(message)
    });
  }
  /**
   * Equivalent to `.min(1)`
   */
  nonempty(message) {
    return this.min(1, errorUtil.errToObj(message));
  }
  trim() {
    return new _ZodString({
      ...this._def,
      checks: [...this._def.checks, { kind: "trim" }]
    });
  }
  toLowerCase() {
    return new _ZodString({
      ...this._def,
      checks: [...this._def.checks, { kind: "toLowerCase" }]
    });
  }
  toUpperCase() {
    return new _ZodString({
      ...this._def,
      checks: [...this._def.checks, { kind: "toUpperCase" }]
    });
  }
  get isDatetime() {
    return !!this._def.checks.find((ch) => ch.kind === "datetime");
  }
  get isDate() {
    return !!this._def.checks.find((ch) => ch.kind === "date");
  }
  get isTime() {
    return !!this._def.checks.find((ch) => ch.kind === "time");
  }
  get isDuration() {
    return !!this._def.checks.find((ch) => ch.kind === "duration");
  }
  get isEmail() {
    return !!this._def.checks.find((ch) => ch.kind === "email");
  }
  get isURL() {
    return !!this._def.checks.find((ch) => ch.kind === "url");
  }
  get isEmoji() {
    return !!this._def.checks.find((ch) => ch.kind === "emoji");
  }
  get isUUID() {
    return !!this._def.checks.find((ch) => ch.kind === "uuid");
  }
  get isNANOID() {
    return !!this._def.checks.find((ch) => ch.kind === "nanoid");
  }
  get isCUID() {
    return !!this._def.checks.find((ch) => ch.kind === "cuid");
  }
  get isCUID2() {
    return !!this._def.checks.find((ch) => ch.kind === "cuid2");
  }
  get isULID() {
    return !!this._def.checks.find((ch) => ch.kind === "ulid");
  }
  get isIP() {
    return !!this._def.checks.find((ch) => ch.kind === "ip");
  }
  get isCIDR() {
    return !!this._def.checks.find((ch) => ch.kind === "cidr");
  }
  get isBase64() {
    return !!this._def.checks.find((ch) => ch.kind === "base64");
  }
  get isBase64url() {
    return !!this._def.checks.find((ch) => ch.kind === "base64url");
  }
  get minLength() {
    let min = null;
    for (const ch of this._def.checks) {
      if (ch.kind === "min") {
        if (min === null || ch.value > min)
          min = ch.value;
      }
    }
    return min;
  }
  get maxLength() {
    let max = null;
    for (const ch of this._def.checks) {
      if (ch.kind === "max") {
        if (max === null || ch.value < max)
          max = ch.value;
      }
    }
    return max;
  }
};
ZodString.create = (params) => {
  return new ZodString({
    checks: [],
    typeName: ZodFirstPartyTypeKind.ZodString,
    coerce: params?.coerce ?? false,
    ...processCreateParams(params)
  });
};
function floatSafeRemainder(val, step) {
  const valDecCount = (val.toString().split(".")[1] || "").length;
  const stepDecCount = (step.toString().split(".")[1] || "").length;
  const decCount = valDecCount > stepDecCount ? valDecCount : stepDecCount;
  const valInt = Number.parseInt(val.toFixed(decCount).replace(".", ""));
  const stepInt = Number.parseInt(step.toFixed(decCount).replace(".", ""));
  return valInt % stepInt / 10 ** decCount;
}
__name(floatSafeRemainder, "floatSafeRemainder");
var ZodNumber = class _ZodNumber extends ZodType {
  static {
    __name(this, "ZodNumber");
  }
  constructor() {
    super(...arguments);
    this.min = this.gte;
    this.max = this.lte;
    this.step = this.multipleOf;
  }
  _parse(input) {
    if (this._def.coerce) {
      input.data = Number(input.data);
    }
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.number) {
      const ctx2 = this._getOrReturnCtx(input);
      addIssueToContext(ctx2, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.number,
        received: ctx2.parsedType
      });
      return INVALID;
    }
    let ctx = void 0;
    const status = new ParseStatus();
    for (const check of this._def.checks) {
      if (check.kind === "int") {
        if (!util.isInteger(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.invalid_type,
            expected: "integer",
            received: "float",
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "min") {
        const tooSmall = check.inclusive ? input.data < check.value : input.data <= check.value;
        if (tooSmall) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.too_small,
            minimum: check.value,
            type: "number",
            inclusive: check.inclusive,
            exact: false,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "max") {
        const tooBig = check.inclusive ? input.data > check.value : input.data >= check.value;
        if (tooBig) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.too_big,
            maximum: check.value,
            type: "number",
            inclusive: check.inclusive,
            exact: false,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "multipleOf") {
        if (floatSafeRemainder(input.data, check.value) !== 0) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.not_multiple_of,
            multipleOf: check.value,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "finite") {
        if (!Number.isFinite(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.not_finite,
            message: check.message
          });
          status.dirty();
        }
      } else {
        util.assertNever(check);
      }
    }
    return { status: status.value, value: input.data };
  }
  gte(value, message) {
    return this.setLimit("min", value, true, errorUtil.toString(message));
  }
  gt(value, message) {
    return this.setLimit("min", value, false, errorUtil.toString(message));
  }
  lte(value, message) {
    return this.setLimit("max", value, true, errorUtil.toString(message));
  }
  lt(value, message) {
    return this.setLimit("max", value, false, errorUtil.toString(message));
  }
  setLimit(kind, value, inclusive, message) {
    return new _ZodNumber({
      ...this._def,
      checks: [
        ...this._def.checks,
        {
          kind,
          value,
          inclusive,
          message: errorUtil.toString(message)
        }
      ]
    });
  }
  _addCheck(check) {
    return new _ZodNumber({
      ...this._def,
      checks: [...this._def.checks, check]
    });
  }
  int(message) {
    return this._addCheck({
      kind: "int",
      message: errorUtil.toString(message)
    });
  }
  positive(message) {
    return this._addCheck({
      kind: "min",
      value: 0,
      inclusive: false,
      message: errorUtil.toString(message)
    });
  }
  negative(message) {
    return this._addCheck({
      kind: "max",
      value: 0,
      inclusive: false,
      message: errorUtil.toString(message)
    });
  }
  nonpositive(message) {
    return this._addCheck({
      kind: "max",
      value: 0,
      inclusive: true,
      message: errorUtil.toString(message)
    });
  }
  nonnegative(message) {
    return this._addCheck({
      kind: "min",
      value: 0,
      inclusive: true,
      message: errorUtil.toString(message)
    });
  }
  multipleOf(value, message) {
    return this._addCheck({
      kind: "multipleOf",
      value,
      message: errorUtil.toString(message)
    });
  }
  finite(message) {
    return this._addCheck({
      kind: "finite",
      message: errorUtil.toString(message)
    });
  }
  safe(message) {
    return this._addCheck({
      kind: "min",
      inclusive: true,
      value: Number.MIN_SAFE_INTEGER,
      message: errorUtil.toString(message)
    })._addCheck({
      kind: "max",
      inclusive: true,
      value: Number.MAX_SAFE_INTEGER,
      message: errorUtil.toString(message)
    });
  }
  get minValue() {
    let min = null;
    for (const ch of this._def.checks) {
      if (ch.kind === "min") {
        if (min === null || ch.value > min)
          min = ch.value;
      }
    }
    return min;
  }
  get maxValue() {
    let max = null;
    for (const ch of this._def.checks) {
      if (ch.kind === "max") {
        if (max === null || ch.value < max)
          max = ch.value;
      }
    }
    return max;
  }
  get isInt() {
    return !!this._def.checks.find((ch) => ch.kind === "int" || ch.kind === "multipleOf" && util.isInteger(ch.value));
  }
  get isFinite() {
    let max = null;
    let min = null;
    for (const ch of this._def.checks) {
      if (ch.kind === "finite" || ch.kind === "int" || ch.kind === "multipleOf") {
        return true;
      } else if (ch.kind === "min") {
        if (min === null || ch.value > min)
          min = ch.value;
      } else if (ch.kind === "max") {
        if (max === null || ch.value < max)
          max = ch.value;
      }
    }
    return Number.isFinite(min) && Number.isFinite(max);
  }
};
ZodNumber.create = (params) => {
  return new ZodNumber({
    checks: [],
    typeName: ZodFirstPartyTypeKind.ZodNumber,
    coerce: params?.coerce || false,
    ...processCreateParams(params)
  });
};
var ZodBigInt = class _ZodBigInt extends ZodType {
  static {
    __name(this, "ZodBigInt");
  }
  constructor() {
    super(...arguments);
    this.min = this.gte;
    this.max = this.lte;
  }
  _parse(input) {
    if (this._def.coerce) {
      try {
        input.data = BigInt(input.data);
      } catch {
        return this._getInvalidInput(input);
      }
    }
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.bigint) {
      return this._getInvalidInput(input);
    }
    let ctx = void 0;
    const status = new ParseStatus();
    for (const check of this._def.checks) {
      if (check.kind === "min") {
        const tooSmall = check.inclusive ? input.data < check.value : input.data <= check.value;
        if (tooSmall) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.too_small,
            type: "bigint",
            minimum: check.value,
            inclusive: check.inclusive,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "max") {
        const tooBig = check.inclusive ? input.data > check.value : input.data >= check.value;
        if (tooBig) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.too_big,
            type: "bigint",
            maximum: check.value,
            inclusive: check.inclusive,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "multipleOf") {
        if (input.data % check.value !== BigInt(0)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.not_multiple_of,
            multipleOf: check.value,
            message: check.message
          });
          status.dirty();
        }
      } else {
        util.assertNever(check);
      }
    }
    return { status: status.value, value: input.data };
  }
  _getInvalidInput(input) {
    const ctx = this._getOrReturnCtx(input);
    addIssueToContext(ctx, {
      code: ZodIssueCode.invalid_type,
      expected: ZodParsedType.bigint,
      received: ctx.parsedType
    });
    return INVALID;
  }
  gte(value, message) {
    return this.setLimit("min", value, true, errorUtil.toString(message));
  }
  gt(value, message) {
    return this.setLimit("min", value, false, errorUtil.toString(message));
  }
  lte(value, message) {
    return this.setLimit("max", value, true, errorUtil.toString(message));
  }
  lt(value, message) {
    return this.setLimit("max", value, false, errorUtil.toString(message));
  }
  setLimit(kind, value, inclusive, message) {
    return new _ZodBigInt({
      ...this._def,
      checks: [
        ...this._def.checks,
        {
          kind,
          value,
          inclusive,
          message: errorUtil.toString(message)
        }
      ]
    });
  }
  _addCheck(check) {
    return new _ZodBigInt({
      ...this._def,
      checks: [...this._def.checks, check]
    });
  }
  positive(message) {
    return this._addCheck({
      kind: "min",
      value: BigInt(0),
      inclusive: false,
      message: errorUtil.toString(message)
    });
  }
  negative(message) {
    return this._addCheck({
      kind: "max",
      value: BigInt(0),
      inclusive: false,
      message: errorUtil.toString(message)
    });
  }
  nonpositive(message) {
    return this._addCheck({
      kind: "max",
      value: BigInt(0),
      inclusive: true,
      message: errorUtil.toString(message)
    });
  }
  nonnegative(message) {
    return this._addCheck({
      kind: "min",
      value: BigInt(0),
      inclusive: true,
      message: errorUtil.toString(message)
    });
  }
  multipleOf(value, message) {
    return this._addCheck({
      kind: "multipleOf",
      value,
      message: errorUtil.toString(message)
    });
  }
  get minValue() {
    let min = null;
    for (const ch of this._def.checks) {
      if (ch.kind === "min") {
        if (min === null || ch.value > min)
          min = ch.value;
      }
    }
    return min;
  }
  get maxValue() {
    let max = null;
    for (const ch of this._def.checks) {
      if (ch.kind === "max") {
        if (max === null || ch.value < max)
          max = ch.value;
      }
    }
    return max;
  }
};
ZodBigInt.create = (params) => {
  return new ZodBigInt({
    checks: [],
    typeName: ZodFirstPartyTypeKind.ZodBigInt,
    coerce: params?.coerce ?? false,
    ...processCreateParams(params)
  });
};
var ZodBoolean = class extends ZodType {
  static {
    __name(this, "ZodBoolean");
  }
  _parse(input) {
    if (this._def.coerce) {
      input.data = Boolean(input.data);
    }
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.boolean) {
      const ctx = this._getOrReturnCtx(input);
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.boolean,
        received: ctx.parsedType
      });
      return INVALID;
    }
    return OK(input.data);
  }
};
ZodBoolean.create = (params) => {
  return new ZodBoolean({
    typeName: ZodFirstPartyTypeKind.ZodBoolean,
    coerce: params?.coerce || false,
    ...processCreateParams(params)
  });
};
var ZodDate = class _ZodDate extends ZodType {
  static {
    __name(this, "ZodDate");
  }
  _parse(input) {
    if (this._def.coerce) {
      input.data = new Date(input.data);
    }
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.date) {
      const ctx2 = this._getOrReturnCtx(input);
      addIssueToContext(ctx2, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.date,
        received: ctx2.parsedType
      });
      return INVALID;
    }
    if (Number.isNaN(input.data.getTime())) {
      const ctx2 = this._getOrReturnCtx(input);
      addIssueToContext(ctx2, {
        code: ZodIssueCode.invalid_date
      });
      return INVALID;
    }
    const status = new ParseStatus();
    let ctx = void 0;
    for (const check of this._def.checks) {
      if (check.kind === "min") {
        if (input.data.getTime() < check.value) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.too_small,
            message: check.message,
            inclusive: true,
            exact: false,
            minimum: check.value,
            type: "date"
          });
          status.dirty();
        }
      } else if (check.kind === "max") {
        if (input.data.getTime() > check.value) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.too_big,
            message: check.message,
            inclusive: true,
            exact: false,
            maximum: check.value,
            type: "date"
          });
          status.dirty();
        }
      } else {
        util.assertNever(check);
      }
    }
    return {
      status: status.value,
      value: new Date(input.data.getTime())
    };
  }
  _addCheck(check) {
    return new _ZodDate({
      ...this._def,
      checks: [...this._def.checks, check]
    });
  }
  min(minDate, message) {
    return this._addCheck({
      kind: "min",
      value: minDate.getTime(),
      message: errorUtil.toString(message)
    });
  }
  max(maxDate, message) {
    return this._addCheck({
      kind: "max",
      value: maxDate.getTime(),
      message: errorUtil.toString(message)
    });
  }
  get minDate() {
    let min = null;
    for (const ch of this._def.checks) {
      if (ch.kind === "min") {
        if (min === null || ch.value > min)
          min = ch.value;
      }
    }
    return min != null ? new Date(min) : null;
  }
  get maxDate() {
    let max = null;
    for (const ch of this._def.checks) {
      if (ch.kind === "max") {
        if (max === null || ch.value < max)
          max = ch.value;
      }
    }
    return max != null ? new Date(max) : null;
  }
};
ZodDate.create = (params) => {
  return new ZodDate({
    checks: [],
    coerce: params?.coerce || false,
    typeName: ZodFirstPartyTypeKind.ZodDate,
    ...processCreateParams(params)
  });
};
var ZodSymbol = class extends ZodType {
  static {
    __name(this, "ZodSymbol");
  }
  _parse(input) {
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.symbol) {
      const ctx = this._getOrReturnCtx(input);
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.symbol,
        received: ctx.parsedType
      });
      return INVALID;
    }
    return OK(input.data);
  }
};
ZodSymbol.create = (params) => {
  return new ZodSymbol({
    typeName: ZodFirstPartyTypeKind.ZodSymbol,
    ...processCreateParams(params)
  });
};
var ZodUndefined = class extends ZodType {
  static {
    __name(this, "ZodUndefined");
  }
  _parse(input) {
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.undefined) {
      const ctx = this._getOrReturnCtx(input);
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.undefined,
        received: ctx.parsedType
      });
      return INVALID;
    }
    return OK(input.data);
  }
};
ZodUndefined.create = (params) => {
  return new ZodUndefined({
    typeName: ZodFirstPartyTypeKind.ZodUndefined,
    ...processCreateParams(params)
  });
};
var ZodNull = class extends ZodType {
  static {
    __name(this, "ZodNull");
  }
  _parse(input) {
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.null) {
      const ctx = this._getOrReturnCtx(input);
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.null,
        received: ctx.parsedType
      });
      return INVALID;
    }
    return OK(input.data);
  }
};
ZodNull.create = (params) => {
  return new ZodNull({
    typeName: ZodFirstPartyTypeKind.ZodNull,
    ...processCreateParams(params)
  });
};
var ZodAny = class extends ZodType {
  static {
    __name(this, "ZodAny");
  }
  constructor() {
    super(...arguments);
    this._any = true;
  }
  _parse(input) {
    return OK(input.data);
  }
};
ZodAny.create = (params) => {
  return new ZodAny({
    typeName: ZodFirstPartyTypeKind.ZodAny,
    ...processCreateParams(params)
  });
};
var ZodUnknown = class extends ZodType {
  static {
    __name(this, "ZodUnknown");
  }
  constructor() {
    super(...arguments);
    this._unknown = true;
  }
  _parse(input) {
    return OK(input.data);
  }
};
ZodUnknown.create = (params) => {
  return new ZodUnknown({
    typeName: ZodFirstPartyTypeKind.ZodUnknown,
    ...processCreateParams(params)
  });
};
var ZodNever = class extends ZodType {
  static {
    __name(this, "ZodNever");
  }
  _parse(input) {
    const ctx = this._getOrReturnCtx(input);
    addIssueToContext(ctx, {
      code: ZodIssueCode.invalid_type,
      expected: ZodParsedType.never,
      received: ctx.parsedType
    });
    return INVALID;
  }
};
ZodNever.create = (params) => {
  return new ZodNever({
    typeName: ZodFirstPartyTypeKind.ZodNever,
    ...processCreateParams(params)
  });
};
var ZodVoid = class extends ZodType {
  static {
    __name(this, "ZodVoid");
  }
  _parse(input) {
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.undefined) {
      const ctx = this._getOrReturnCtx(input);
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.void,
        received: ctx.parsedType
      });
      return INVALID;
    }
    return OK(input.data);
  }
};
ZodVoid.create = (params) => {
  return new ZodVoid({
    typeName: ZodFirstPartyTypeKind.ZodVoid,
    ...processCreateParams(params)
  });
};
var ZodArray = class _ZodArray extends ZodType {
  static {
    __name(this, "ZodArray");
  }
  _parse(input) {
    const { ctx, status } = this._processInputParams(input);
    const def = this._def;
    if (ctx.parsedType !== ZodParsedType.array) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.array,
        received: ctx.parsedType
      });
      return INVALID;
    }
    if (def.exactLength !== null) {
      const tooBig = ctx.data.length > def.exactLength.value;
      const tooSmall = ctx.data.length < def.exactLength.value;
      if (tooBig || tooSmall) {
        addIssueToContext(ctx, {
          code: tooBig ? ZodIssueCode.too_big : ZodIssueCode.too_small,
          minimum: tooSmall ? def.exactLength.value : void 0,
          maximum: tooBig ? def.exactLength.value : void 0,
          type: "array",
          inclusive: true,
          exact: true,
          message: def.exactLength.message
        });
        status.dirty();
      }
    }
    if (def.minLength !== null) {
      if (ctx.data.length < def.minLength.value) {
        addIssueToContext(ctx, {
          code: ZodIssueCode.too_small,
          minimum: def.minLength.value,
          type: "array",
          inclusive: true,
          exact: false,
          message: def.minLength.message
        });
        status.dirty();
      }
    }
    if (def.maxLength !== null) {
      if (ctx.data.length > def.maxLength.value) {
        addIssueToContext(ctx, {
          code: ZodIssueCode.too_big,
          maximum: def.maxLength.value,
          type: "array",
          inclusive: true,
          exact: false,
          message: def.maxLength.message
        });
        status.dirty();
      }
    }
    if (ctx.common.async) {
      return Promise.all([...ctx.data].map((item, i) => {
        return def.type._parseAsync(new ParseInputLazyPath(ctx, item, ctx.path, i));
      })).then((result2) => {
        return ParseStatus.mergeArray(status, result2);
      });
    }
    const result = [...ctx.data].map((item, i) => {
      return def.type._parseSync(new ParseInputLazyPath(ctx, item, ctx.path, i));
    });
    return ParseStatus.mergeArray(status, result);
  }
  get element() {
    return this._def.type;
  }
  min(minLength, message) {
    return new _ZodArray({
      ...this._def,
      minLength: { value: minLength, message: errorUtil.toString(message) }
    });
  }
  max(maxLength, message) {
    return new _ZodArray({
      ...this._def,
      maxLength: { value: maxLength, message: errorUtil.toString(message) }
    });
  }
  length(len, message) {
    return new _ZodArray({
      ...this._def,
      exactLength: { value: len, message: errorUtil.toString(message) }
    });
  }
  nonempty(message) {
    return this.min(1, message);
  }
};
ZodArray.create = (schema, params) => {
  return new ZodArray({
    type: schema,
    minLength: null,
    maxLength: null,
    exactLength: null,
    typeName: ZodFirstPartyTypeKind.ZodArray,
    ...processCreateParams(params)
  });
};
function deepPartialify(schema) {
  if (schema instanceof ZodObject) {
    const newShape = {};
    for (const key in schema.shape) {
      const fieldSchema = schema.shape[key];
      newShape[key] = ZodOptional.create(deepPartialify(fieldSchema));
    }
    return new ZodObject({
      ...schema._def,
      shape: /* @__PURE__ */ __name(() => newShape, "shape")
    });
  } else if (schema instanceof ZodArray) {
    return new ZodArray({
      ...schema._def,
      type: deepPartialify(schema.element)
    });
  } else if (schema instanceof ZodOptional) {
    return ZodOptional.create(deepPartialify(schema.unwrap()));
  } else if (schema instanceof ZodNullable) {
    return ZodNullable.create(deepPartialify(schema.unwrap()));
  } else if (schema instanceof ZodTuple) {
    return ZodTuple.create(schema.items.map((item) => deepPartialify(item)));
  } else {
    return schema;
  }
}
__name(deepPartialify, "deepPartialify");
var ZodObject = class _ZodObject extends ZodType {
  static {
    __name(this, "ZodObject");
  }
  constructor() {
    super(...arguments);
    this._cached = null;
    this.nonstrict = this.passthrough;
    this.augment = this.extend;
  }
  _getCached() {
    if (this._cached !== null)
      return this._cached;
    const shape = this._def.shape();
    const keys = util.objectKeys(shape);
    this._cached = { shape, keys };
    return this._cached;
  }
  _parse(input) {
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.object) {
      const ctx2 = this._getOrReturnCtx(input);
      addIssueToContext(ctx2, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.object,
        received: ctx2.parsedType
      });
      return INVALID;
    }
    const { status, ctx } = this._processInputParams(input);
    const { shape, keys: shapeKeys } = this._getCached();
    const extraKeys = [];
    if (!(this._def.catchall instanceof ZodNever && this._def.unknownKeys === "strip")) {
      for (const key in ctx.data) {
        if (!shapeKeys.includes(key)) {
          extraKeys.push(key);
        }
      }
    }
    const pairs = [];
    for (const key of shapeKeys) {
      const keyValidator = shape[key];
      const value = ctx.data[key];
      pairs.push({
        key: { status: "valid", value: key },
        value: keyValidator._parse(new ParseInputLazyPath(ctx, value, ctx.path, key)),
        alwaysSet: key in ctx.data
      });
    }
    if (this._def.catchall instanceof ZodNever) {
      const unknownKeys = this._def.unknownKeys;
      if (unknownKeys === "passthrough") {
        for (const key of extraKeys) {
          pairs.push({
            key: { status: "valid", value: key },
            value: { status: "valid", value: ctx.data[key] }
          });
        }
      } else if (unknownKeys === "strict") {
        if (extraKeys.length > 0) {
          addIssueToContext(ctx, {
            code: ZodIssueCode.unrecognized_keys,
            keys: extraKeys
          });
          status.dirty();
        }
      } else if (unknownKeys === "strip") {
      } else {
        throw new Error(`Internal ZodObject error: invalid unknownKeys value.`);
      }
    } else {
      const catchall = this._def.catchall;
      for (const key of extraKeys) {
        const value = ctx.data[key];
        pairs.push({
          key: { status: "valid", value: key },
          value: catchall._parse(
            new ParseInputLazyPath(ctx, value, ctx.path, key)
            //, ctx.child(key), value, getParsedType(value)
          ),
          alwaysSet: key in ctx.data
        });
      }
    }
    if (ctx.common.async) {
      return Promise.resolve().then(async () => {
        const syncPairs = [];
        for (const pair of pairs) {
          const key = await pair.key;
          const value = await pair.value;
          syncPairs.push({
            key,
            value,
            alwaysSet: pair.alwaysSet
          });
        }
        return syncPairs;
      }).then((syncPairs) => {
        return ParseStatus.mergeObjectSync(status, syncPairs);
      });
    } else {
      return ParseStatus.mergeObjectSync(status, pairs);
    }
  }
  get shape() {
    return this._def.shape();
  }
  strict(message) {
    errorUtil.errToObj;
    return new _ZodObject({
      ...this._def,
      unknownKeys: "strict",
      ...message !== void 0 ? {
        errorMap: /* @__PURE__ */ __name((issue, ctx) => {
          const defaultError = this._def.errorMap?.(issue, ctx).message ?? ctx.defaultError;
          if (issue.code === "unrecognized_keys")
            return {
              message: errorUtil.errToObj(message).message ?? defaultError
            };
          return {
            message: defaultError
          };
        }, "errorMap")
      } : {}
    });
  }
  strip() {
    return new _ZodObject({
      ...this._def,
      unknownKeys: "strip"
    });
  }
  passthrough() {
    return new _ZodObject({
      ...this._def,
      unknownKeys: "passthrough"
    });
  }
  // const AugmentFactory =
  //   <Def extends ZodObjectDef>(def: Def) =>
  //   <Augmentation extends ZodRawShape>(
  //     augmentation: Augmentation
  //   ): ZodObject<
  //     extendShape<ReturnType<Def["shape"]>, Augmentation>,
  //     Def["unknownKeys"],
  //     Def["catchall"]
  //   > => {
  //     return new ZodObject({
  //       ...def,
  //       shape: () => ({
  //         ...def.shape(),
  //         ...augmentation,
  //       }),
  //     }) as any;
  //   };
  extend(augmentation) {
    return new _ZodObject({
      ...this._def,
      shape: /* @__PURE__ */ __name(() => ({
        ...this._def.shape(),
        ...augmentation
      }), "shape")
    });
  }
  /**
   * Prior to zod@1.0.12 there was a bug in the
   * inferred type of merged objects. Please
   * upgrade if you are experiencing issues.
   */
  merge(merging) {
    const merged = new _ZodObject({
      unknownKeys: merging._def.unknownKeys,
      catchall: merging._def.catchall,
      shape: /* @__PURE__ */ __name(() => ({
        ...this._def.shape(),
        ...merging._def.shape()
      }), "shape"),
      typeName: ZodFirstPartyTypeKind.ZodObject
    });
    return merged;
  }
  // merge<
  //   Incoming extends AnyZodObject,
  //   Augmentation extends Incoming["shape"],
  //   NewOutput extends {
  //     [k in keyof Augmentation | keyof Output]: k extends keyof Augmentation
  //       ? Augmentation[k]["_output"]
  //       : k extends keyof Output
  //       ? Output[k]
  //       : never;
  //   },
  //   NewInput extends {
  //     [k in keyof Augmentation | keyof Input]: k extends keyof Augmentation
  //       ? Augmentation[k]["_input"]
  //       : k extends keyof Input
  //       ? Input[k]
  //       : never;
  //   }
  // >(
  //   merging: Incoming
  // ): ZodObject<
  //   extendShape<T, ReturnType<Incoming["_def"]["shape"]>>,
  //   Incoming["_def"]["unknownKeys"],
  //   Incoming["_def"]["catchall"],
  //   NewOutput,
  //   NewInput
  // > {
  //   const merged: any = new ZodObject({
  //     unknownKeys: merging._def.unknownKeys,
  //     catchall: merging._def.catchall,
  //     shape: () =>
  //       objectUtil.mergeShapes(this._def.shape(), merging._def.shape()),
  //     typeName: ZodFirstPartyTypeKind.ZodObject,
  //   }) as any;
  //   return merged;
  // }
  setKey(key, schema) {
    return this.augment({ [key]: schema });
  }
  // merge<Incoming extends AnyZodObject>(
  //   merging: Incoming
  // ): //ZodObject<T & Incoming["_shape"], UnknownKeys, Catchall> = (merging) => {
  // ZodObject<
  //   extendShape<T, ReturnType<Incoming["_def"]["shape"]>>,
  //   Incoming["_def"]["unknownKeys"],
  //   Incoming["_def"]["catchall"]
  // > {
  //   // const mergedShape = objectUtil.mergeShapes(
  //   //   this._def.shape(),
  //   //   merging._def.shape()
  //   // );
  //   const merged: any = new ZodObject({
  //     unknownKeys: merging._def.unknownKeys,
  //     catchall: merging._def.catchall,
  //     shape: () =>
  //       objectUtil.mergeShapes(this._def.shape(), merging._def.shape()),
  //     typeName: ZodFirstPartyTypeKind.ZodObject,
  //   }) as any;
  //   return merged;
  // }
  catchall(index) {
    return new _ZodObject({
      ...this._def,
      catchall: index
    });
  }
  pick(mask) {
    const shape = {};
    for (const key of util.objectKeys(mask)) {
      if (mask[key] && this.shape[key]) {
        shape[key] = this.shape[key];
      }
    }
    return new _ZodObject({
      ...this._def,
      shape: /* @__PURE__ */ __name(() => shape, "shape")
    });
  }
  omit(mask) {
    const shape = {};
    for (const key of util.objectKeys(this.shape)) {
      if (!mask[key]) {
        shape[key] = this.shape[key];
      }
    }
    return new _ZodObject({
      ...this._def,
      shape: /* @__PURE__ */ __name(() => shape, "shape")
    });
  }
  /**
   * @deprecated
   */
  deepPartial() {
    return deepPartialify(this);
  }
  partial(mask) {
    const newShape = {};
    for (const key of util.objectKeys(this.shape)) {
      const fieldSchema = this.shape[key];
      if (mask && !mask[key]) {
        newShape[key] = fieldSchema;
      } else {
        newShape[key] = fieldSchema.optional();
      }
    }
    return new _ZodObject({
      ...this._def,
      shape: /* @__PURE__ */ __name(() => newShape, "shape")
    });
  }
  required(mask) {
    const newShape = {};
    for (const key of util.objectKeys(this.shape)) {
      if (mask && !mask[key]) {
        newShape[key] = this.shape[key];
      } else {
        const fieldSchema = this.shape[key];
        let newField = fieldSchema;
        while (newField instanceof ZodOptional) {
          newField = newField._def.innerType;
        }
        newShape[key] = newField;
      }
    }
    return new _ZodObject({
      ...this._def,
      shape: /* @__PURE__ */ __name(() => newShape, "shape")
    });
  }
  keyof() {
    return createZodEnum(util.objectKeys(this.shape));
  }
};
ZodObject.create = (shape, params) => {
  return new ZodObject({
    shape: /* @__PURE__ */ __name(() => shape, "shape"),
    unknownKeys: "strip",
    catchall: ZodNever.create(),
    typeName: ZodFirstPartyTypeKind.ZodObject,
    ...processCreateParams(params)
  });
};
ZodObject.strictCreate = (shape, params) => {
  return new ZodObject({
    shape: /* @__PURE__ */ __name(() => shape, "shape"),
    unknownKeys: "strict",
    catchall: ZodNever.create(),
    typeName: ZodFirstPartyTypeKind.ZodObject,
    ...processCreateParams(params)
  });
};
ZodObject.lazycreate = (shape, params) => {
  return new ZodObject({
    shape,
    unknownKeys: "strip",
    catchall: ZodNever.create(),
    typeName: ZodFirstPartyTypeKind.ZodObject,
    ...processCreateParams(params)
  });
};
var ZodUnion = class extends ZodType {
  static {
    __name(this, "ZodUnion");
  }
  _parse(input) {
    const { ctx } = this._processInputParams(input);
    const options = this._def.options;
    function handleResults(results) {
      for (const result of results) {
        if (result.result.status === "valid") {
          return result.result;
        }
      }
      for (const result of results) {
        if (result.result.status === "dirty") {
          ctx.common.issues.push(...result.ctx.common.issues);
          return result.result;
        }
      }
      const unionErrors = results.map((result) => new ZodError(result.ctx.common.issues));
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_union,
        unionErrors
      });
      return INVALID;
    }
    __name(handleResults, "handleResults");
    if (ctx.common.async) {
      return Promise.all(options.map(async (option) => {
        const childCtx = {
          ...ctx,
          common: {
            ...ctx.common,
            issues: []
          },
          parent: null
        };
        return {
          result: await option._parseAsync({
            data: ctx.data,
            path: ctx.path,
            parent: childCtx
          }),
          ctx: childCtx
        };
      })).then(handleResults);
    } else {
      let dirty = void 0;
      const issues = [];
      for (const option of options) {
        const childCtx = {
          ...ctx,
          common: {
            ...ctx.common,
            issues: []
          },
          parent: null
        };
        const result = option._parseSync({
          data: ctx.data,
          path: ctx.path,
          parent: childCtx
        });
        if (result.status === "valid") {
          return result;
        } else if (result.status === "dirty" && !dirty) {
          dirty = { result, ctx: childCtx };
        }
        if (childCtx.common.issues.length) {
          issues.push(childCtx.common.issues);
        }
      }
      if (dirty) {
        ctx.common.issues.push(...dirty.ctx.common.issues);
        return dirty.result;
      }
      const unionErrors = issues.map((issues2) => new ZodError(issues2));
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_union,
        unionErrors
      });
      return INVALID;
    }
  }
  get options() {
    return this._def.options;
  }
};
ZodUnion.create = (types, params) => {
  return new ZodUnion({
    options: types,
    typeName: ZodFirstPartyTypeKind.ZodUnion,
    ...processCreateParams(params)
  });
};
var getDiscriminator = /* @__PURE__ */ __name((type) => {
  if (type instanceof ZodLazy) {
    return getDiscriminator(type.schema);
  } else if (type instanceof ZodEffects) {
    return getDiscriminator(type.innerType());
  } else if (type instanceof ZodLiteral) {
    return [type.value];
  } else if (type instanceof ZodEnum) {
    return type.options;
  } else if (type instanceof ZodNativeEnum) {
    return util.objectValues(type.enum);
  } else if (type instanceof ZodDefault) {
    return getDiscriminator(type._def.innerType);
  } else if (type instanceof ZodUndefined) {
    return [void 0];
  } else if (type instanceof ZodNull) {
    return [null];
  } else if (type instanceof ZodOptional) {
    return [void 0, ...getDiscriminator(type.unwrap())];
  } else if (type instanceof ZodNullable) {
    return [null, ...getDiscriminator(type.unwrap())];
  } else if (type instanceof ZodBranded) {
    return getDiscriminator(type.unwrap());
  } else if (type instanceof ZodReadonly) {
    return getDiscriminator(type.unwrap());
  } else if (type instanceof ZodCatch) {
    return getDiscriminator(type._def.innerType);
  } else {
    return [];
  }
}, "getDiscriminator");
var ZodDiscriminatedUnion = class _ZodDiscriminatedUnion extends ZodType {
  static {
    __name(this, "ZodDiscriminatedUnion");
  }
  _parse(input) {
    const { ctx } = this._processInputParams(input);
    if (ctx.parsedType !== ZodParsedType.object) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.object,
        received: ctx.parsedType
      });
      return INVALID;
    }
    const discriminator = this.discriminator;
    const discriminatorValue = ctx.data[discriminator];
    const option = this.optionsMap.get(discriminatorValue);
    if (!option) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_union_discriminator,
        options: Array.from(this.optionsMap.keys()),
        path: [discriminator]
      });
      return INVALID;
    }
    if (ctx.common.async) {
      return option._parseAsync({
        data: ctx.data,
        path: ctx.path,
        parent: ctx
      });
    } else {
      return option._parseSync({
        data: ctx.data,
        path: ctx.path,
        parent: ctx
      });
    }
  }
  get discriminator() {
    return this._def.discriminator;
  }
  get options() {
    return this._def.options;
  }
  get optionsMap() {
    return this._def.optionsMap;
  }
  /**
   * The constructor of the discriminated union schema. Its behaviour is very similar to that of the normal z.union() constructor.
   * However, it only allows a union of objects, all of which need to share a discriminator property. This property must
   * have a different value for each object in the union.
   * @param discriminator the name of the discriminator property
   * @param types an array of object schemas
   * @param params
   */
  static create(discriminator, options, params) {
    const optionsMap = /* @__PURE__ */ new Map();
    for (const type of options) {
      const discriminatorValues = getDiscriminator(type.shape[discriminator]);
      if (!discriminatorValues.length) {
        throw new Error(`A discriminator value for key \`${discriminator}\` could not be extracted from all schema options`);
      }
      for (const value of discriminatorValues) {
        if (optionsMap.has(value)) {
          throw new Error(`Discriminator property ${String(discriminator)} has duplicate value ${String(value)}`);
        }
        optionsMap.set(value, type);
      }
    }
    return new _ZodDiscriminatedUnion({
      typeName: ZodFirstPartyTypeKind.ZodDiscriminatedUnion,
      discriminator,
      options,
      optionsMap,
      ...processCreateParams(params)
    });
  }
};
function mergeValues(a, b) {
  const aType = getParsedType(a);
  const bType = getParsedType(b);
  if (a === b) {
    return { valid: true, data: a };
  } else if (aType === ZodParsedType.object && bType === ZodParsedType.object) {
    const bKeys = util.objectKeys(b);
    const sharedKeys = util.objectKeys(a).filter((key) => bKeys.indexOf(key) !== -1);
    const newObj = { ...a, ...b };
    for (const key of sharedKeys) {
      const sharedValue = mergeValues(a[key], b[key]);
      if (!sharedValue.valid) {
        return { valid: false };
      }
      newObj[key] = sharedValue.data;
    }
    return { valid: true, data: newObj };
  } else if (aType === ZodParsedType.array && bType === ZodParsedType.array) {
    if (a.length !== b.length) {
      return { valid: false };
    }
    const newArray = [];
    for (let index = 0; index < a.length; index++) {
      const itemA = a[index];
      const itemB = b[index];
      const sharedValue = mergeValues(itemA, itemB);
      if (!sharedValue.valid) {
        return { valid: false };
      }
      newArray.push(sharedValue.data);
    }
    return { valid: true, data: newArray };
  } else if (aType === ZodParsedType.date && bType === ZodParsedType.date && +a === +b) {
    return { valid: true, data: a };
  } else {
    return { valid: false };
  }
}
__name(mergeValues, "mergeValues");
var ZodIntersection = class extends ZodType {
  static {
    __name(this, "ZodIntersection");
  }
  _parse(input) {
    const { status, ctx } = this._processInputParams(input);
    const handleParsed = /* @__PURE__ */ __name((parsedLeft, parsedRight) => {
      if (isAborted(parsedLeft) || isAborted(parsedRight)) {
        return INVALID;
      }
      const merged = mergeValues(parsedLeft.value, parsedRight.value);
      if (!merged.valid) {
        addIssueToContext(ctx, {
          code: ZodIssueCode.invalid_intersection_types
        });
        return INVALID;
      }
      if (isDirty(parsedLeft) || isDirty(parsedRight)) {
        status.dirty();
      }
      return { status: status.value, value: merged.data };
    }, "handleParsed");
    if (ctx.common.async) {
      return Promise.all([
        this._def.left._parseAsync({
          data: ctx.data,
          path: ctx.path,
          parent: ctx
        }),
        this._def.right._parseAsync({
          data: ctx.data,
          path: ctx.path,
          parent: ctx
        })
      ]).then(([left, right]) => handleParsed(left, right));
    } else {
      return handleParsed(this._def.left._parseSync({
        data: ctx.data,
        path: ctx.path,
        parent: ctx
      }), this._def.right._parseSync({
        data: ctx.data,
        path: ctx.path,
        parent: ctx
      }));
    }
  }
};
ZodIntersection.create = (left, right, params) => {
  return new ZodIntersection({
    left,
    right,
    typeName: ZodFirstPartyTypeKind.ZodIntersection,
    ...processCreateParams(params)
  });
};
var ZodTuple = class _ZodTuple extends ZodType {
  static {
    __name(this, "ZodTuple");
  }
  _parse(input) {
    const { status, ctx } = this._processInputParams(input);
    if (ctx.parsedType !== ZodParsedType.array) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.array,
        received: ctx.parsedType
      });
      return INVALID;
    }
    if (ctx.data.length < this._def.items.length) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.too_small,
        minimum: this._def.items.length,
        inclusive: true,
        exact: false,
        type: "array"
      });
      return INVALID;
    }
    const rest = this._def.rest;
    if (!rest && ctx.data.length > this._def.items.length) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.too_big,
        maximum: this._def.items.length,
        inclusive: true,
        exact: false,
        type: "array"
      });
      status.dirty();
    }
    const items = [...ctx.data].map((item, itemIndex) => {
      const schema = this._def.items[itemIndex] || this._def.rest;
      if (!schema)
        return null;
      return schema._parse(new ParseInputLazyPath(ctx, item, ctx.path, itemIndex));
    }).filter((x) => !!x);
    if (ctx.common.async) {
      return Promise.all(items).then((results) => {
        return ParseStatus.mergeArray(status, results);
      });
    } else {
      return ParseStatus.mergeArray(status, items);
    }
  }
  get items() {
    return this._def.items;
  }
  rest(rest) {
    return new _ZodTuple({
      ...this._def,
      rest
    });
  }
};
ZodTuple.create = (schemas, params) => {
  if (!Array.isArray(schemas)) {
    throw new Error("You must pass an array of schemas to z.tuple([ ... ])");
  }
  return new ZodTuple({
    items: schemas,
    typeName: ZodFirstPartyTypeKind.ZodTuple,
    rest: null,
    ...processCreateParams(params)
  });
};
var ZodRecord = class _ZodRecord extends ZodType {
  static {
    __name(this, "ZodRecord");
  }
  get keySchema() {
    return this._def.keyType;
  }
  get valueSchema() {
    return this._def.valueType;
  }
  _parse(input) {
    const { status, ctx } = this._processInputParams(input);
    if (ctx.parsedType !== ZodParsedType.object) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.object,
        received: ctx.parsedType
      });
      return INVALID;
    }
    const pairs = [];
    const keyType = this._def.keyType;
    const valueType = this._def.valueType;
    for (const key in ctx.data) {
      pairs.push({
        key: keyType._parse(new ParseInputLazyPath(ctx, key, ctx.path, key)),
        value: valueType._parse(new ParseInputLazyPath(ctx, ctx.data[key], ctx.path, key)),
        alwaysSet: key in ctx.data
      });
    }
    if (ctx.common.async) {
      return ParseStatus.mergeObjectAsync(status, pairs);
    } else {
      return ParseStatus.mergeObjectSync(status, pairs);
    }
  }
  get element() {
    return this._def.valueType;
  }
  static create(first, second, third) {
    if (second instanceof ZodType) {
      return new _ZodRecord({
        keyType: first,
        valueType: second,
        typeName: ZodFirstPartyTypeKind.ZodRecord,
        ...processCreateParams(third)
      });
    }
    return new _ZodRecord({
      keyType: ZodString.create(),
      valueType: first,
      typeName: ZodFirstPartyTypeKind.ZodRecord,
      ...processCreateParams(second)
    });
  }
};
var ZodMap = class extends ZodType {
  static {
    __name(this, "ZodMap");
  }
  get keySchema() {
    return this._def.keyType;
  }
  get valueSchema() {
    return this._def.valueType;
  }
  _parse(input) {
    const { status, ctx } = this._processInputParams(input);
    if (ctx.parsedType !== ZodParsedType.map) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.map,
        received: ctx.parsedType
      });
      return INVALID;
    }
    const keyType = this._def.keyType;
    const valueType = this._def.valueType;
    const pairs = [...ctx.data.entries()].map(([key, value], index) => {
      return {
        key: keyType._parse(new ParseInputLazyPath(ctx, key, ctx.path, [index, "key"])),
        value: valueType._parse(new ParseInputLazyPath(ctx, value, ctx.path, [index, "value"]))
      };
    });
    if (ctx.common.async) {
      const finalMap = /* @__PURE__ */ new Map();
      return Promise.resolve().then(async () => {
        for (const pair of pairs) {
          const key = await pair.key;
          const value = await pair.value;
          if (key.status === "aborted" || value.status === "aborted") {
            return INVALID;
          }
          if (key.status === "dirty" || value.status === "dirty") {
            status.dirty();
          }
          finalMap.set(key.value, value.value);
        }
        return { status: status.value, value: finalMap };
      });
    } else {
      const finalMap = /* @__PURE__ */ new Map();
      for (const pair of pairs) {
        const key = pair.key;
        const value = pair.value;
        if (key.status === "aborted" || value.status === "aborted") {
          return INVALID;
        }
        if (key.status === "dirty" || value.status === "dirty") {
          status.dirty();
        }
        finalMap.set(key.value, value.value);
      }
      return { status: status.value, value: finalMap };
    }
  }
};
ZodMap.create = (keyType, valueType, params) => {
  return new ZodMap({
    valueType,
    keyType,
    typeName: ZodFirstPartyTypeKind.ZodMap,
    ...processCreateParams(params)
  });
};
var ZodSet = class _ZodSet extends ZodType {
  static {
    __name(this, "ZodSet");
  }
  _parse(input) {
    const { status, ctx } = this._processInputParams(input);
    if (ctx.parsedType !== ZodParsedType.set) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.set,
        received: ctx.parsedType
      });
      return INVALID;
    }
    const def = this._def;
    if (def.minSize !== null) {
      if (ctx.data.size < def.minSize.value) {
        addIssueToContext(ctx, {
          code: ZodIssueCode.too_small,
          minimum: def.minSize.value,
          type: "set",
          inclusive: true,
          exact: false,
          message: def.minSize.message
        });
        status.dirty();
      }
    }
    if (def.maxSize !== null) {
      if (ctx.data.size > def.maxSize.value) {
        addIssueToContext(ctx, {
          code: ZodIssueCode.too_big,
          maximum: def.maxSize.value,
          type: "set",
          inclusive: true,
          exact: false,
          message: def.maxSize.message
        });
        status.dirty();
      }
    }
    const valueType = this._def.valueType;
    function finalizeSet(elements2) {
      const parsedSet = /* @__PURE__ */ new Set();
      for (const element of elements2) {
        if (element.status === "aborted")
          return INVALID;
        if (element.status === "dirty")
          status.dirty();
        parsedSet.add(element.value);
      }
      return { status: status.value, value: parsedSet };
    }
    __name(finalizeSet, "finalizeSet");
    const elements = [...ctx.data.values()].map((item, i) => valueType._parse(new ParseInputLazyPath(ctx, item, ctx.path, i)));
    if (ctx.common.async) {
      return Promise.all(elements).then((elements2) => finalizeSet(elements2));
    } else {
      return finalizeSet(elements);
    }
  }
  min(minSize, message) {
    return new _ZodSet({
      ...this._def,
      minSize: { value: minSize, message: errorUtil.toString(message) }
    });
  }
  max(maxSize, message) {
    return new _ZodSet({
      ...this._def,
      maxSize: { value: maxSize, message: errorUtil.toString(message) }
    });
  }
  size(size, message) {
    return this.min(size, message).max(size, message);
  }
  nonempty(message) {
    return this.min(1, message);
  }
};
ZodSet.create = (valueType, params) => {
  return new ZodSet({
    valueType,
    minSize: null,
    maxSize: null,
    typeName: ZodFirstPartyTypeKind.ZodSet,
    ...processCreateParams(params)
  });
};
var ZodFunction = class _ZodFunction extends ZodType {
  static {
    __name(this, "ZodFunction");
  }
  constructor() {
    super(...arguments);
    this.validate = this.implement;
  }
  _parse(input) {
    const { ctx } = this._processInputParams(input);
    if (ctx.parsedType !== ZodParsedType.function) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.function,
        received: ctx.parsedType
      });
      return INVALID;
    }
    function makeArgsIssue(args, error) {
      return makeIssue({
        data: args,
        path: ctx.path,
        errorMaps: [ctx.common.contextualErrorMap, ctx.schemaErrorMap, getErrorMap(), en_default].filter((x) => !!x),
        issueData: {
          code: ZodIssueCode.invalid_arguments,
          argumentsError: error
        }
      });
    }
    __name(makeArgsIssue, "makeArgsIssue");
    function makeReturnsIssue(returns, error) {
      return makeIssue({
        data: returns,
        path: ctx.path,
        errorMaps: [ctx.common.contextualErrorMap, ctx.schemaErrorMap, getErrorMap(), en_default].filter((x) => !!x),
        issueData: {
          code: ZodIssueCode.invalid_return_type,
          returnTypeError: error
        }
      });
    }
    __name(makeReturnsIssue, "makeReturnsIssue");
    const params = { errorMap: ctx.common.contextualErrorMap };
    const fn = ctx.data;
    if (this._def.returns instanceof ZodPromise) {
      const me = this;
      return OK(async function(...args) {
        const error = new ZodError([]);
        const parsedArgs = await me._def.args.parseAsync(args, params).catch((e) => {
          error.addIssue(makeArgsIssue(args, e));
          throw error;
        });
        const result = await Reflect.apply(fn, this, parsedArgs);
        const parsedReturns = await me._def.returns._def.type.parseAsync(result, params).catch((e) => {
          error.addIssue(makeReturnsIssue(result, e));
          throw error;
        });
        return parsedReturns;
      });
    } else {
      const me = this;
      return OK(function(...args) {
        const parsedArgs = me._def.args.safeParse(args, params);
        if (!parsedArgs.success) {
          throw new ZodError([makeArgsIssue(args, parsedArgs.error)]);
        }
        const result = Reflect.apply(fn, this, parsedArgs.data);
        const parsedReturns = me._def.returns.safeParse(result, params);
        if (!parsedReturns.success) {
          throw new ZodError([makeReturnsIssue(result, parsedReturns.error)]);
        }
        return parsedReturns.data;
      });
    }
  }
  parameters() {
    return this._def.args;
  }
  returnType() {
    return this._def.returns;
  }
  args(...items) {
    return new _ZodFunction({
      ...this._def,
      args: ZodTuple.create(items).rest(ZodUnknown.create())
    });
  }
  returns(returnType) {
    return new _ZodFunction({
      ...this._def,
      returns: returnType
    });
  }
  implement(func) {
    const validatedFunc = this.parse(func);
    return validatedFunc;
  }
  strictImplement(func) {
    const validatedFunc = this.parse(func);
    return validatedFunc;
  }
  static create(args, returns, params) {
    return new _ZodFunction({
      args: args ? args : ZodTuple.create([]).rest(ZodUnknown.create()),
      returns: returns || ZodUnknown.create(),
      typeName: ZodFirstPartyTypeKind.ZodFunction,
      ...processCreateParams(params)
    });
  }
};
var ZodLazy = class extends ZodType {
  static {
    __name(this, "ZodLazy");
  }
  get schema() {
    return this._def.getter();
  }
  _parse(input) {
    const { ctx } = this._processInputParams(input);
    const lazySchema = this._def.getter();
    return lazySchema._parse({ data: ctx.data, path: ctx.path, parent: ctx });
  }
};
ZodLazy.create = (getter, params) => {
  return new ZodLazy({
    getter,
    typeName: ZodFirstPartyTypeKind.ZodLazy,
    ...processCreateParams(params)
  });
};
var ZodLiteral = class extends ZodType {
  static {
    __name(this, "ZodLiteral");
  }
  _parse(input) {
    if (input.data !== this._def.value) {
      const ctx = this._getOrReturnCtx(input);
      addIssueToContext(ctx, {
        received: ctx.data,
        code: ZodIssueCode.invalid_literal,
        expected: this._def.value
      });
      return INVALID;
    }
    return { status: "valid", value: input.data };
  }
  get value() {
    return this._def.value;
  }
};
ZodLiteral.create = (value, params) => {
  return new ZodLiteral({
    value,
    typeName: ZodFirstPartyTypeKind.ZodLiteral,
    ...processCreateParams(params)
  });
};
function createZodEnum(values, params) {
  return new ZodEnum({
    values,
    typeName: ZodFirstPartyTypeKind.ZodEnum,
    ...processCreateParams(params)
  });
}
__name(createZodEnum, "createZodEnum");
var ZodEnum = class _ZodEnum extends ZodType {
  static {
    __name(this, "ZodEnum");
  }
  _parse(input) {
    if (typeof input.data !== "string") {
      const ctx = this._getOrReturnCtx(input);
      const expectedValues = this._def.values;
      addIssueToContext(ctx, {
        expected: util.joinValues(expectedValues),
        received: ctx.parsedType,
        code: ZodIssueCode.invalid_type
      });
      return INVALID;
    }
    if (!this._cache) {
      this._cache = new Set(this._def.values);
    }
    if (!this._cache.has(input.data)) {
      const ctx = this._getOrReturnCtx(input);
      const expectedValues = this._def.values;
      addIssueToContext(ctx, {
        received: ctx.data,
        code: ZodIssueCode.invalid_enum_value,
        options: expectedValues
      });
      return INVALID;
    }
    return OK(input.data);
  }
  get options() {
    return this._def.values;
  }
  get enum() {
    const enumValues = {};
    for (const val of this._def.values) {
      enumValues[val] = val;
    }
    return enumValues;
  }
  get Values() {
    const enumValues = {};
    for (const val of this._def.values) {
      enumValues[val] = val;
    }
    return enumValues;
  }
  get Enum() {
    const enumValues = {};
    for (const val of this._def.values) {
      enumValues[val] = val;
    }
    return enumValues;
  }
  extract(values, newDef = this._def) {
    return _ZodEnum.create(values, {
      ...this._def,
      ...newDef
    });
  }
  exclude(values, newDef = this._def) {
    return _ZodEnum.create(this.options.filter((opt) => !values.includes(opt)), {
      ...this._def,
      ...newDef
    });
  }
};
ZodEnum.create = createZodEnum;
var ZodNativeEnum = class extends ZodType {
  static {
    __name(this, "ZodNativeEnum");
  }
  _parse(input) {
    const nativeEnumValues = util.getValidEnumValues(this._def.values);
    const ctx = this._getOrReturnCtx(input);
    if (ctx.parsedType !== ZodParsedType.string && ctx.parsedType !== ZodParsedType.number) {
      const expectedValues = util.objectValues(nativeEnumValues);
      addIssueToContext(ctx, {
        expected: util.joinValues(expectedValues),
        received: ctx.parsedType,
        code: ZodIssueCode.invalid_type
      });
      return INVALID;
    }
    if (!this._cache) {
      this._cache = new Set(util.getValidEnumValues(this._def.values));
    }
    if (!this._cache.has(input.data)) {
      const expectedValues = util.objectValues(nativeEnumValues);
      addIssueToContext(ctx, {
        received: ctx.data,
        code: ZodIssueCode.invalid_enum_value,
        options: expectedValues
      });
      return INVALID;
    }
    return OK(input.data);
  }
  get enum() {
    return this._def.values;
  }
};
ZodNativeEnum.create = (values, params) => {
  return new ZodNativeEnum({
    values,
    typeName: ZodFirstPartyTypeKind.ZodNativeEnum,
    ...processCreateParams(params)
  });
};
var ZodPromise = class extends ZodType {
  static {
    __name(this, "ZodPromise");
  }
  unwrap() {
    return this._def.type;
  }
  _parse(input) {
    const { ctx } = this._processInputParams(input);
    if (ctx.parsedType !== ZodParsedType.promise && ctx.common.async === false) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.promise,
        received: ctx.parsedType
      });
      return INVALID;
    }
    const promisified = ctx.parsedType === ZodParsedType.promise ? ctx.data : Promise.resolve(ctx.data);
    return OK(promisified.then((data) => {
      return this._def.type.parseAsync(data, {
        path: ctx.path,
        errorMap: ctx.common.contextualErrorMap
      });
    }));
  }
};
ZodPromise.create = (schema, params) => {
  return new ZodPromise({
    type: schema,
    typeName: ZodFirstPartyTypeKind.ZodPromise,
    ...processCreateParams(params)
  });
};
var ZodEffects = class extends ZodType {
  static {
    __name(this, "ZodEffects");
  }
  innerType() {
    return this._def.schema;
  }
  sourceType() {
    return this._def.schema._def.typeName === ZodFirstPartyTypeKind.ZodEffects ? this._def.schema.sourceType() : this._def.schema;
  }
  _parse(input) {
    const { status, ctx } = this._processInputParams(input);
    const effect = this._def.effect || null;
    const checkCtx = {
      addIssue: /* @__PURE__ */ __name((arg) => {
        addIssueToContext(ctx, arg);
        if (arg.fatal) {
          status.abort();
        } else {
          status.dirty();
        }
      }, "addIssue"),
      get path() {
        return ctx.path;
      }
    };
    checkCtx.addIssue = checkCtx.addIssue.bind(checkCtx);
    if (effect.type === "preprocess") {
      const processed = effect.transform(ctx.data, checkCtx);
      if (ctx.common.async) {
        return Promise.resolve(processed).then(async (processed2) => {
          if (status.value === "aborted")
            return INVALID;
          const result = await this._def.schema._parseAsync({
            data: processed2,
            path: ctx.path,
            parent: ctx
          });
          if (result.status === "aborted")
            return INVALID;
          if (result.status === "dirty")
            return DIRTY(result.value);
          if (status.value === "dirty")
            return DIRTY(result.value);
          return result;
        });
      } else {
        if (status.value === "aborted")
          return INVALID;
        const result = this._def.schema._parseSync({
          data: processed,
          path: ctx.path,
          parent: ctx
        });
        if (result.status === "aborted")
          return INVALID;
        if (result.status === "dirty")
          return DIRTY(result.value);
        if (status.value === "dirty")
          return DIRTY(result.value);
        return result;
      }
    }
    if (effect.type === "refinement") {
      const executeRefinement = /* @__PURE__ */ __name((acc) => {
        const result = effect.refinement(acc, checkCtx);
        if (ctx.common.async) {
          return Promise.resolve(result);
        }
        if (result instanceof Promise) {
          throw new Error("Async refinement encountered during synchronous parse operation. Use .parseAsync instead.");
        }
        return acc;
      }, "executeRefinement");
      if (ctx.common.async === false) {
        const inner = this._def.schema._parseSync({
          data: ctx.data,
          path: ctx.path,
          parent: ctx
        });
        if (inner.status === "aborted")
          return INVALID;
        if (inner.status === "dirty")
          status.dirty();
        executeRefinement(inner.value);
        return { status: status.value, value: inner.value };
      } else {
        return this._def.schema._parseAsync({ data: ctx.data, path: ctx.path, parent: ctx }).then((inner) => {
          if (inner.status === "aborted")
            return INVALID;
          if (inner.status === "dirty")
            status.dirty();
          return executeRefinement(inner.value).then(() => {
            return { status: status.value, value: inner.value };
          });
        });
      }
    }
    if (effect.type === "transform") {
      if (ctx.common.async === false) {
        const base = this._def.schema._parseSync({
          data: ctx.data,
          path: ctx.path,
          parent: ctx
        });
        if (!isValid(base))
          return INVALID;
        const result = effect.transform(base.value, checkCtx);
        if (result instanceof Promise) {
          throw new Error(`Asynchronous transform encountered during synchronous parse operation. Use .parseAsync instead.`);
        }
        return { status: status.value, value: result };
      } else {
        return this._def.schema._parseAsync({ data: ctx.data, path: ctx.path, parent: ctx }).then((base) => {
          if (!isValid(base))
            return INVALID;
          return Promise.resolve(effect.transform(base.value, checkCtx)).then((result) => ({
            status: status.value,
            value: result
          }));
        });
      }
    }
    util.assertNever(effect);
  }
};
ZodEffects.create = (schema, effect, params) => {
  return new ZodEffects({
    schema,
    typeName: ZodFirstPartyTypeKind.ZodEffects,
    effect,
    ...processCreateParams(params)
  });
};
ZodEffects.createWithPreprocess = (preprocess, schema, params) => {
  return new ZodEffects({
    schema,
    effect: { type: "preprocess", transform: preprocess },
    typeName: ZodFirstPartyTypeKind.ZodEffects,
    ...processCreateParams(params)
  });
};
var ZodOptional = class extends ZodType {
  static {
    __name(this, "ZodOptional");
  }
  _parse(input) {
    const parsedType = this._getType(input);
    if (parsedType === ZodParsedType.undefined) {
      return OK(void 0);
    }
    return this._def.innerType._parse(input);
  }
  unwrap() {
    return this._def.innerType;
  }
};
ZodOptional.create = (type, params) => {
  return new ZodOptional({
    innerType: type,
    typeName: ZodFirstPartyTypeKind.ZodOptional,
    ...processCreateParams(params)
  });
};
var ZodNullable = class extends ZodType {
  static {
    __name(this, "ZodNullable");
  }
  _parse(input) {
    const parsedType = this._getType(input);
    if (parsedType === ZodParsedType.null) {
      return OK(null);
    }
    return this._def.innerType._parse(input);
  }
  unwrap() {
    return this._def.innerType;
  }
};
ZodNullable.create = (type, params) => {
  return new ZodNullable({
    innerType: type,
    typeName: ZodFirstPartyTypeKind.ZodNullable,
    ...processCreateParams(params)
  });
};
var ZodDefault = class extends ZodType {
  static {
    __name(this, "ZodDefault");
  }
  _parse(input) {
    const { ctx } = this._processInputParams(input);
    let data = ctx.data;
    if (ctx.parsedType === ZodParsedType.undefined) {
      data = this._def.defaultValue();
    }
    return this._def.innerType._parse({
      data,
      path: ctx.path,
      parent: ctx
    });
  }
  removeDefault() {
    return this._def.innerType;
  }
};
ZodDefault.create = (type, params) => {
  return new ZodDefault({
    innerType: type,
    typeName: ZodFirstPartyTypeKind.ZodDefault,
    defaultValue: typeof params.default === "function" ? params.default : () => params.default,
    ...processCreateParams(params)
  });
};
var ZodCatch = class extends ZodType {
  static {
    __name(this, "ZodCatch");
  }
  _parse(input) {
    const { ctx } = this._processInputParams(input);
    const newCtx = {
      ...ctx,
      common: {
        ...ctx.common,
        issues: []
      }
    };
    const result = this._def.innerType._parse({
      data: newCtx.data,
      path: newCtx.path,
      parent: {
        ...newCtx
      }
    });
    if (isAsync(result)) {
      return result.then((result2) => {
        return {
          status: "valid",
          value: result2.status === "valid" ? result2.value : this._def.catchValue({
            get error() {
              return new ZodError(newCtx.common.issues);
            },
            input: newCtx.data
          })
        };
      });
    } else {
      return {
        status: "valid",
        value: result.status === "valid" ? result.value : this._def.catchValue({
          get error() {
            return new ZodError(newCtx.common.issues);
          },
          input: newCtx.data
        })
      };
    }
  }
  removeCatch() {
    return this._def.innerType;
  }
};
ZodCatch.create = (type, params) => {
  return new ZodCatch({
    innerType: type,
    typeName: ZodFirstPartyTypeKind.ZodCatch,
    catchValue: typeof params.catch === "function" ? params.catch : () => params.catch,
    ...processCreateParams(params)
  });
};
var ZodNaN = class extends ZodType {
  static {
    __name(this, "ZodNaN");
  }
  _parse(input) {
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.nan) {
      const ctx = this._getOrReturnCtx(input);
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.nan,
        received: ctx.parsedType
      });
      return INVALID;
    }
    return { status: "valid", value: input.data };
  }
};
ZodNaN.create = (params) => {
  return new ZodNaN({
    typeName: ZodFirstPartyTypeKind.ZodNaN,
    ...processCreateParams(params)
  });
};
var BRAND = /* @__PURE__ */ Symbol("zod_brand");
var ZodBranded = class extends ZodType {
  static {
    __name(this, "ZodBranded");
  }
  _parse(input) {
    const { ctx } = this._processInputParams(input);
    const data = ctx.data;
    return this._def.type._parse({
      data,
      path: ctx.path,
      parent: ctx
    });
  }
  unwrap() {
    return this._def.type;
  }
};
var ZodPipeline = class _ZodPipeline extends ZodType {
  static {
    __name(this, "ZodPipeline");
  }
  _parse(input) {
    const { status, ctx } = this._processInputParams(input);
    if (ctx.common.async) {
      const handleAsync = /* @__PURE__ */ __name(async () => {
        const inResult = await this._def.in._parseAsync({
          data: ctx.data,
          path: ctx.path,
          parent: ctx
        });
        if (inResult.status === "aborted")
          return INVALID;
        if (inResult.status === "dirty") {
          status.dirty();
          return DIRTY(inResult.value);
        } else {
          return this._def.out._parseAsync({
            data: inResult.value,
            path: ctx.path,
            parent: ctx
          });
        }
      }, "handleAsync");
      return handleAsync();
    } else {
      const inResult = this._def.in._parseSync({
        data: ctx.data,
        path: ctx.path,
        parent: ctx
      });
      if (inResult.status === "aborted")
        return INVALID;
      if (inResult.status === "dirty") {
        status.dirty();
        return {
          status: "dirty",
          value: inResult.value
        };
      } else {
        return this._def.out._parseSync({
          data: inResult.value,
          path: ctx.path,
          parent: ctx
        });
      }
    }
  }
  static create(a, b) {
    return new _ZodPipeline({
      in: a,
      out: b,
      typeName: ZodFirstPartyTypeKind.ZodPipeline
    });
  }
};
var ZodReadonly = class extends ZodType {
  static {
    __name(this, "ZodReadonly");
  }
  _parse(input) {
    const result = this._def.innerType._parse(input);
    const freeze = /* @__PURE__ */ __name((data) => {
      if (isValid(data)) {
        data.value = Object.freeze(data.value);
      }
      return data;
    }, "freeze");
    return isAsync(result) ? result.then((data) => freeze(data)) : freeze(result);
  }
  unwrap() {
    return this._def.innerType;
  }
};
ZodReadonly.create = (type, params) => {
  return new ZodReadonly({
    innerType: type,
    typeName: ZodFirstPartyTypeKind.ZodReadonly,
    ...processCreateParams(params)
  });
};
function cleanParams(params, data) {
  const p = typeof params === "function" ? params(data) : typeof params === "string" ? { message: params } : params;
  const p2 = typeof p === "string" ? { message: p } : p;
  return p2;
}
__name(cleanParams, "cleanParams");
function custom(check, _params = {}, fatal) {
  if (check)
    return ZodAny.create().superRefine((data, ctx) => {
      const r = check(data);
      if (r instanceof Promise) {
        return r.then((r2) => {
          if (!r2) {
            const params = cleanParams(_params, data);
            const _fatal = params.fatal ?? fatal ?? true;
            ctx.addIssue({ code: "custom", ...params, fatal: _fatal });
          }
        });
      }
      if (!r) {
        const params = cleanParams(_params, data);
        const _fatal = params.fatal ?? fatal ?? true;
        ctx.addIssue({ code: "custom", ...params, fatal: _fatal });
      }
      return;
    });
  return ZodAny.create();
}
__name(custom, "custom");
var late = {
  object: ZodObject.lazycreate
};
var ZodFirstPartyTypeKind;
(function(ZodFirstPartyTypeKind2) {
  ZodFirstPartyTypeKind2["ZodString"] = "ZodString";
  ZodFirstPartyTypeKind2["ZodNumber"] = "ZodNumber";
  ZodFirstPartyTypeKind2["ZodNaN"] = "ZodNaN";
  ZodFirstPartyTypeKind2["ZodBigInt"] = "ZodBigInt";
  ZodFirstPartyTypeKind2["ZodBoolean"] = "ZodBoolean";
  ZodFirstPartyTypeKind2["ZodDate"] = "ZodDate";
  ZodFirstPartyTypeKind2["ZodSymbol"] = "ZodSymbol";
  ZodFirstPartyTypeKind2["ZodUndefined"] = "ZodUndefined";
  ZodFirstPartyTypeKind2["ZodNull"] = "ZodNull";
  ZodFirstPartyTypeKind2["ZodAny"] = "ZodAny";
  ZodFirstPartyTypeKind2["ZodUnknown"] = "ZodUnknown";
  ZodFirstPartyTypeKind2["ZodNever"] = "ZodNever";
  ZodFirstPartyTypeKind2["ZodVoid"] = "ZodVoid";
  ZodFirstPartyTypeKind2["ZodArray"] = "ZodArray";
  ZodFirstPartyTypeKind2["ZodObject"] = "ZodObject";
  ZodFirstPartyTypeKind2["ZodUnion"] = "ZodUnion";
  ZodFirstPartyTypeKind2["ZodDiscriminatedUnion"] = "ZodDiscriminatedUnion";
  ZodFirstPartyTypeKind2["ZodIntersection"] = "ZodIntersection";
  ZodFirstPartyTypeKind2["ZodTuple"] = "ZodTuple";
  ZodFirstPartyTypeKind2["ZodRecord"] = "ZodRecord";
  ZodFirstPartyTypeKind2["ZodMap"] = "ZodMap";
  ZodFirstPartyTypeKind2["ZodSet"] = "ZodSet";
  ZodFirstPartyTypeKind2["ZodFunction"] = "ZodFunction";
  ZodFirstPartyTypeKind2["ZodLazy"] = "ZodLazy";
  ZodFirstPartyTypeKind2["ZodLiteral"] = "ZodLiteral";
  ZodFirstPartyTypeKind2["ZodEnum"] = "ZodEnum";
  ZodFirstPartyTypeKind2["ZodEffects"] = "ZodEffects";
  ZodFirstPartyTypeKind2["ZodNativeEnum"] = "ZodNativeEnum";
  ZodFirstPartyTypeKind2["ZodOptional"] = "ZodOptional";
  ZodFirstPartyTypeKind2["ZodNullable"] = "ZodNullable";
  ZodFirstPartyTypeKind2["ZodDefault"] = "ZodDefault";
  ZodFirstPartyTypeKind2["ZodCatch"] = "ZodCatch";
  ZodFirstPartyTypeKind2["ZodPromise"] = "ZodPromise";
  ZodFirstPartyTypeKind2["ZodBranded"] = "ZodBranded";
  ZodFirstPartyTypeKind2["ZodPipeline"] = "ZodPipeline";
  ZodFirstPartyTypeKind2["ZodReadonly"] = "ZodReadonly";
})(ZodFirstPartyTypeKind || (ZodFirstPartyTypeKind = {}));
var instanceOfType = /* @__PURE__ */ __name((cls, params = {
  message: `Input not instance of ${cls.name}`
}) => custom((data) => data instanceof cls, params), "instanceOfType");
var stringType = ZodString.create;
var numberType = ZodNumber.create;
var nanType = ZodNaN.create;
var bigIntType = ZodBigInt.create;
var booleanType = ZodBoolean.create;
var dateType = ZodDate.create;
var symbolType = ZodSymbol.create;
var undefinedType = ZodUndefined.create;
var nullType = ZodNull.create;
var anyType = ZodAny.create;
var unknownType = ZodUnknown.create;
var neverType = ZodNever.create;
var voidType = ZodVoid.create;
var arrayType = ZodArray.create;
var objectType = ZodObject.create;
var strictObjectType = ZodObject.strictCreate;
var unionType = ZodUnion.create;
var discriminatedUnionType = ZodDiscriminatedUnion.create;
var intersectionType = ZodIntersection.create;
var tupleType = ZodTuple.create;
var recordType = ZodRecord.create;
var mapType = ZodMap.create;
var setType = ZodSet.create;
var functionType = ZodFunction.create;
var lazyType = ZodLazy.create;
var literalType = ZodLiteral.create;
var enumType = ZodEnum.create;
var nativeEnumType = ZodNativeEnum.create;
var promiseType = ZodPromise.create;
var effectsType = ZodEffects.create;
var optionalType = ZodOptional.create;
var nullableType = ZodNullable.create;
var preprocessType = ZodEffects.createWithPreprocess;
var pipelineType = ZodPipeline.create;
var ostring = /* @__PURE__ */ __name(() => stringType().optional(), "ostring");
var onumber = /* @__PURE__ */ __name(() => numberType().optional(), "onumber");
var oboolean = /* @__PURE__ */ __name(() => booleanType().optional(), "oboolean");
var coerce = {
  string: /* @__PURE__ */ __name(((arg) => ZodString.create({ ...arg, coerce: true })), "string"),
  number: /* @__PURE__ */ __name(((arg) => ZodNumber.create({ ...arg, coerce: true })), "number"),
  boolean: /* @__PURE__ */ __name(((arg) => ZodBoolean.create({
    ...arg,
    coerce: true
  })), "boolean"),
  bigint: /* @__PURE__ */ __name(((arg) => ZodBigInt.create({ ...arg, coerce: true })), "bigint"),
  date: /* @__PURE__ */ __name(((arg) => ZodDate.create({ ...arg, coerce: true })), "date")
};
var NEVER = INVALID;

// ../../packages/schema/dist/common/text-safety.js
var TAG_LIKE_PATTERN = /<[a-zA-Z/!]/;
var CONTROL_CHARS_PATTERN = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F]/;
var BIDI_OVERRIDE_PATTERN = /[\u202A-\u202E\u2066-\u2069]/;
function validateSafeText(value, options) {
  if (options.minLength !== void 0 && value.length < options.minLength) {
    return {
      valid: false,
      error: `Text must be at least ${options.minLength} characters (received ${value.length})`
    };
  }
  if (value.length > options.maxLength) {
    return {
      valid: false,
      error: `Text must not exceed ${options.maxLength} characters (received ${value.length})`
    };
  }
  if (TAG_LIKE_PATTERN.test(value)) {
    return {
      valid: false,
      error: "HTML tags or tag-like patterns (<tag, </tag, <!) are not permitted in plain text"
    };
  }
  if (CONTROL_CHARS_PATTERN.test(value)) {
    return {
      valid: false,
      error: "Control characters are not permitted"
    };
  }
  if (BIDI_OVERRIDE_PATTERN.test(value)) {
    return {
      valid: false,
      error: "Bidirectional override characters are not permitted"
    };
  }
  if (!options.allowMultiline && /[\r\n]/.test(value)) {
    return {
      valid: false,
      error: "Multiline text (newlines) is not permitted in this field"
    };
  }
  return { valid: true };
}
__name(validateSafeText, "validateSafeText");
function safeTextSchema(options) {
  let base = external_exports.string().trim();
  if (options.minLength !== void 0) {
    base = base.min(options.minLength);
  }
  base = base.max(options.maxLength);
  return base.refine((val) => {
    const res = validateSafeText(val, options);
    return res.valid;
  }, (val) => {
    const res = validateSafeText(val, options);
    return {
      message: res.valid ? "Invalid text" : res.error
    };
  });
}
__name(safeTextSchema, "safeTextSchema");

// ../../packages/schema/dist/common/asset.js
var ASSET_ID_REGEX = /^asset_[a-zA-Z0-9_-]{4,64}$/;
var AssetIdSchema = external_exports.string().trim().regex(ASSET_ID_REGEX, "Images must be referenced by Asset ID ('asset_<identifier>'), never by arbitrary URL");
var ImageAssetSchema = external_exports.object({
  assetId: AssetIdSchema,
  alt: safeTextSchema({ minLength: 1, maxLength: 120, allowMultiline: false }),
  caption: safeTextSchema({ minLength: 1, maxLength: 160, allowMultiline: false }).optional()
});

// ../../packages/schema/dist/common/urls.js
function validateSafeUrl(url) {
  const trimmed = url.trim();
  const lower = trimmed.toLowerCase();
  if (lower.startsWith("javascript:") || lower.startsWith("data:") || lower.startsWith("vbscript:")) {
    return {
      valid: false,
      error: "Dangerous URL schemes (javascript:, data:) are strictly forbidden"
    };
  }
  if (lower.startsWith("http://")) {
    return {
      valid: false,
      error: "Insecure http:// links are forbidden. Only https:// or wa.me links are allowed"
    };
  }
  if (trimmed.startsWith("https://") || trimmed.startsWith("wa.me/")) {
    try {
      const parsed = new URL(trimmed.startsWith("wa.me/") ? `https://${trimmed}` : trimmed);
      return { valid: true, normalized: parsed.toString() };
    } catch {
      return { valid: false, error: "Malformed URL" };
    }
  }
  return {
    valid: false,
    error: "URL must begin with https:// or wa.me/"
  };
}
__name(validateSafeUrl, "validateSafeUrl");
var SafeUrlSchema = external_exports.string().trim().min(5).max(500).refine((url) => validateSafeUrl(url).valid, (url) => {
  const res = validateSafeUrl(url);
  return { message: res.valid ? "Invalid URL" : res.error };
});

// ../../packages/schema/dist/common/phone.js
function normalizePhone(raw2) {
  if (typeof raw2 !== "string") {
    return { valid: false, error: "Phone number must be a string" };
  }
  const trimmed = raw2.trim();
  if (!trimmed) {
    return { valid: false, error: "Phone number cannot be empty" };
  }
  const hasLeadingPlus = trimmed.startsWith("+");
  let cleaned = trimmed.replace(/[\s\-().]/g, "");
  if (cleaned.startsWith("+2340") && cleaned.length === 15) {
    cleaned = "+234" + cleaned.slice(5);
  } else if (cleaned.startsWith("2340") && cleaned.length === 14) {
    cleaned = "234" + cleaned.slice(4);
  }
  if (/^0\d{10}$/.test(cleaned)) {
    return { valid: true, e164: `+234${cleaned.slice(1)}` };
  }
  if (/^234\d{10}$/.test(cleaned)) {
    return { valid: true, e164: `+${cleaned}` };
  }
  if (/^\+234\d{10}$/.test(cleaned)) {
    return { valid: true, e164: cleaned };
  }
  const internationalCandidate = hasLeadingPlus ? cleaned : `+${cleaned}`;
  if (/^\+[1-9]\d{6,14}$/.test(internationalCandidate)) {
    return { valid: true, e164: internationalCandidate };
  }
  return {
    valid: false,
    error: `Invalid phone number format: "${raw2}". Must be a valid Nigerian number (e.g. 0803..., +234803...) or international E.164 number.`
  };
}
__name(normalizePhone, "normalizePhone");
function normalizePhoneOrThrow(raw2) {
  const result = normalizePhone(raw2);
  if (!result.valid) {
    throw new Error(result.error);
  }
  return result.e164;
}
__name(normalizePhoneOrThrow, "normalizePhoneOrThrow");
function buildWhatsAppLink(phone, defaultMessage) {
  const normalized = normalizePhoneOrThrow(phone);
  const digitsOnly = normalized.replace(/^\+/, "");
  if (!defaultMessage || !defaultMessage.trim()) {
    return `https://wa.me/${digitsOnly}`;
  }
  return `https://wa.me/${digitsOnly}?text=${encodeURIComponent(defaultMessage.trim())}`;
}
__name(buildWhatsAppLink, "buildWhatsAppLink");
var PhoneNumberSchema = external_exports.string().trim().transform((val, ctx) => {
  const result = normalizePhone(val);
  if (!result.valid) {
    ctx.addIssue({
      code: external_exports.ZodIssueCode.custom,
      message: result.error
    });
    return external_exports.NEVER;
  }
  return result.e164;
});

// ../../packages/schema/dist/common/slug.js
var RESERVED_SLUGS = /* @__PURE__ */ new Set([
  "admin",
  "api",
  "app",
  "assets",
  "auth",
  "billing",
  "blog",
  "cdn",
  "console",
  "dashboard",
  "docs",
  "ftp",
  "help",
  "login",
  "mail",
  "ns1",
  "ns2",
  "onboard",
  "partners",
  "portal",
  "preview",
  "privacy",
  "replyiq",
  "root",
  "signup",
  "smtp",
  "status",
  "support",
  "terms",
  "www"
]);
var MIN_SLUG_LENGTH = 3;
var MAX_SLUG_LENGTH = 30;
function validateSubdomainSlug(slug) {
  if (typeof slug !== "string") {
    return { valid: false, error: "Subdomain slug must be a string" };
  }
  const trimmed = slug.trim().toLowerCase();
  if (trimmed.length < MIN_SLUG_LENGTH) {
    return {
      valid: false,
      error: `Subdomain slug must be at least ${MIN_SLUG_LENGTH} characters long`
    };
  }
  if (trimmed.length > MAX_SLUG_LENGTH) {
    return {
      valid: false,
      error: `Subdomain slug must not exceed ${MAX_SLUG_LENGTH} characters`
    };
  }
  if (trimmed.startsWith("-") || trimmed.endsWith("-")) {
    return {
      valid: false,
      error: "Subdomain slug cannot begin or end with a hyphen"
    };
  }
  if (trimmed.includes("--")) {
    return {
      valid: false,
      error: "Subdomain slug cannot contain consecutive hyphens ('--')"
    };
  }
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(trimmed)) {
    return {
      valid: false,
      error: "Subdomain slug can only contain lowercase letters, digits, and single hyphens"
    };
  }
  if (RESERVED_SLUGS.has(trimmed)) {
    return {
      valid: false,
      error: `"${trimmed}" is a reserved system name and cannot be used as a subdomain`
    };
  }
  return { valid: true, slug: trimmed };
}
__name(validateSubdomainSlug, "validateSubdomainSlug");
var SubdomainSlugSchema = external_exports.string().trim().toLowerCase().min(MIN_SLUG_LENGTH).max(MAX_SLUG_LENGTH).refine((slug) => validateSubdomainSlug(slug).valid, (slug) => {
  const res = validateSubdomainSlug(slug);
  return { message: res.valid ? "Invalid slug" : res.error };
});

// ../../packages/schema/dist/theme/index.js
var FONT_ALLOWLIST = [
  "system-sans",
  "inter",
  "outfit",
  "plus-jakarta-sans",
  "dm-sans",
  "playfair-display",
  "roboto"
];
var PALETTE_PRESETS = [
  "lagos-emerald",
  "sunset-amber",
  "slate-minimal",
  "ocean-indigo",
  "terracotta",
  "royal-gold"
];
var ColorHexSchema = external_exports.string().trim().regex(/^#[0-9a-fA-F]{6}$/, "Color token must be a 6-character hex string (e.g. #10B981)");
var PaletteTokensSchema = external_exports.object({
  primary: ColorHexSchema,
  secondary: ColorHexSchema,
  background: ColorHexSchema,
  surface: ColorHexSchema,
  text: ColorHexSchema,
  muted: ColorHexSchema
});
var PRESET_PALETTES = {
  "lagos-emerald": {
    primary: "#059669",
    secondary: "#10b981",
    background: "#f9fafb",
    surface: "#ffffff",
    text: "#111827",
    muted: "#6b7280"
  },
  "sunset-amber": {
    primary: "#d97706",
    secondary: "#f59e0b",
    background: "#fffbeb",
    surface: "#ffffff",
    text: "#1f2937",
    muted: "#78716c"
  },
  "slate-minimal": {
    primary: "#0f172a",
    secondary: "#334155",
    background: "#ffffff",
    surface: "#f8fafc",
    text: "#0f172a",
    muted: "#64748b"
  },
  "ocean-indigo": {
    primary: "#2563eb",
    secondary: "#4f46e5",
    background: "#f8fafc",
    surface: "#ffffff",
    text: "#0f172a",
    muted: "#64748b"
  },
  terracotta: {
    primary: "#c2410c",
    secondary: "#ea580c",
    background: "#fff7ed",
    surface: "#ffffff",
    text: "#1c1917",
    muted: "#78716c"
  },
  "royal-gold": {
    primary: "#b45309",
    secondary: "#d97706",
    background: "#18181b",
    surface: "#27272a",
    text: "#fafafa",
    muted: "#a1a1aa"
  }
};
var ThemeSchema = external_exports.object({
  palette: external_exports.enum(PALETTE_PRESETS).default("lagos-emerald"),
  tokens: PaletteTokensSchema.optional(),
  font: external_exports.enum(FONT_ALLOWLIST).default("system-sans"),
  mode: external_exports.enum(["light", "dark"]).default("light")
});

// ../../packages/schema/dist/sections/registry.js
var SectionIdSchema = external_exports.string().trim().min(1).max(64).regex(/^[a-zA-Z0-9_-]+$/, "ID must contain only alphanumeric characters, dashes, or underscores");
var HeroSectionSchema = external_exports.object({
  id: SectionIdSchema,
  type: external_exports.literal("hero"),
  heading: safeTextSchema({ minLength: 1, maxLength: 100, allowMultiline: false }),
  subheading: safeTextSchema({ minLength: 1, maxLength: 250, allowMultiline: true }).optional(),
  cta: external_exports.object({
    label: safeTextSchema({ minLength: 1, maxLength: 40, allowMultiline: false }),
    url: SafeUrlSchema
  }).optional(),
  image: ImageAssetSchema.optional()
});
var AboutSectionSchema = external_exports.object({
  id: SectionIdSchema,
  type: external_exports.literal("about"),
  title: safeTextSchema({ minLength: 1, maxLength: 100, allowMultiline: false }),
  content: safeTextSchema({ minLength: 1, maxLength: 1200, allowMultiline: true }),
  image: ImageAssetSchema.optional()
});
var ServiceItemSchema = external_exports.object({
  id: SectionIdSchema,
  name: safeTextSchema({ minLength: 1, maxLength: 80, allowMultiline: false }),
  description: safeTextSchema({ minLength: 1, maxLength: 300, allowMultiline: true }).optional(),
  price: external_exports.number().int("Price must be an integer in naira").nonnegative("Price cannot be negative").optional(),
  currency: external_exports.string().regex(/^[A-Z]{3}$/, "Currency must be a 3-letter ISO code").default("NGN"),
  priceLabel: safeTextSchema({ minLength: 1, maxLength: 30, allowMultiline: false }).optional(),
  image: ImageAssetSchema.optional()
});
var ServicesSectionSchema = external_exports.object({
  id: SectionIdSchema,
  type: external_exports.literal("services"),
  title: safeTextSchema({ minLength: 1, maxLength: 100, allowMultiline: false }),
  subtitle: safeTextSchema({ minLength: 1, maxLength: 250, allowMultiline: true }).optional(),
  items: external_exports.array(ServiceItemSchema).min(1, "Services section must have at least 1 item").max(12, "Services section cannot exceed 12 items")
});
var GallerySectionSchema = external_exports.object({
  id: SectionIdSchema,
  type: external_exports.literal("gallery"),
  title: safeTextSchema({ minLength: 1, maxLength: 100, allowMultiline: false }),
  description: safeTextSchema({ minLength: 1, maxLength: 250, allowMultiline: true }).optional(),
  images: external_exports.array(ImageAssetSchema).min(1, "Gallery must contain at least 1 image").max(12, "Gallery cannot exceed 12 images")
});
var TestimonialItemSchema = external_exports.object({
  id: SectionIdSchema,
  quote: safeTextSchema({ minLength: 1, maxLength: 400, allowMultiline: true }),
  author: safeTextSchema({ minLength: 1, maxLength: 60, allowMultiline: false }),
  roleOrLocation: safeTextSchema({ minLength: 1, maxLength: 60, allowMultiline: false }).optional(),
  avatar: ImageAssetSchema.optional()
});
var TestimonialsSectionSchema = external_exports.object({
  id: SectionIdSchema,
  type: external_exports.literal("testimonials"),
  title: safeTextSchema({ minLength: 1, maxLength: 100, allowMultiline: false }),
  items: external_exports.array(TestimonialItemSchema).min(1, "Testimonials must contain at least 1 item").max(8, "Testimonials cannot exceed 8 items")
});
var FaqItemSchema = external_exports.object({
  id: SectionIdSchema,
  question: safeTextSchema({ minLength: 1, maxLength: 150, allowMultiline: false }),
  answer: safeTextSchema({ minLength: 1, maxLength: 600, allowMultiline: true })
});
var FaqSectionSchema = external_exports.object({
  id: SectionIdSchema,
  type: external_exports.literal("faq"),
  title: safeTextSchema({ minLength: 1, maxLength: 100, allowMultiline: false }),
  items: external_exports.array(FaqItemSchema).min(1, "FAQ section must contain at least 1 item").max(10, "FAQ section cannot exceed 10 items")
});
var SocialPlatformSchema = external_exports.enum([
  "instagram",
  "twitter",
  "facebook",
  "tiktok",
  "linkedin",
  "youtube"
]);
var SocialLinkSchema = external_exports.object({
  platform: SocialPlatformSchema,
  url: SafeUrlSchema
});
var ContactSectionSchema = external_exports.object({
  id: SectionIdSchema,
  type: external_exports.literal("contact"),
  title: safeTextSchema({ minLength: 1, maxLength: 100, allowMultiline: false }),
  description: safeTextSchema({ minLength: 1, maxLength: 250, allowMultiline: true }).optional(),
  whatsappNumber: PhoneNumberSchema.optional(),
  email: external_exports.string().trim().email("Invalid email address").max(100).optional(),
  address: safeTextSchema({ minLength: 1, maxLength: 200, allowMultiline: true }).optional(),
  socialLinks: external_exports.array(SocialLinkSchema).max(6, "Cannot exceed 6 social links").optional()
});
var FooterLinkSchema = external_exports.object({
  label: safeTextSchema({ minLength: 1, maxLength: 40, allowMultiline: false }),
  url: SafeUrlSchema
});
var FooterSectionSchema = external_exports.object({
  id: SectionIdSchema,
  type: external_exports.literal("footer"),
  copyrightText: safeTextSchema({ minLength: 1, maxLength: 120, allowMultiline: false }).optional(),
  links: external_exports.array(FooterLinkSchema).max(6, "Cannot exceed 6 footer links").optional()
});
var SectionSchema = external_exports.discriminatedUnion("type", [
  HeroSectionSchema,
  AboutSectionSchema,
  ServicesSectionSchema,
  GallerySectionSchema,
  TestimonialsSectionSchema,
  FaqSectionSchema,
  ContactSectionSchema,
  FooterSectionSchema
]);

// ../../packages/schema/dist/document.js
var SiteMetadataSchema = external_exports.object({
  title: safeTextSchema({ minLength: 1, maxLength: 70, allowMultiline: false }),
  description: safeTextSchema({ minLength: 1, maxLength: 160, allowMultiline: false }),
  language: external_exports.string().trim().regex(/^[a-z]{2}(-[A-Z]{2})?$/, "Language must be standard ISO code (e.g. 'en', 'yo', 'ig', 'ha')").default(DEFAULT_LANGUAGE),
  locale: external_exports.string().trim().regex(/^[a-z]{2}-[A-Z]{2}$/, "Locale must be in language-REGION format (e.g. 'en-NG')").default(DEFAULT_LOCALE)
});
var SiteContactSchema = external_exports.object({
  whatsappNumber: PhoneNumberSchema,
  defaultMessage: safeTextSchema({ minLength: 1, maxLength: 200, allowMultiline: true }).optional()
});
var REGISTERED_TEMPLATES = ["portfolio"];
var TemplateIdSchema = external_exports.enum(REGISTERED_TEMPLATES).default("portfolio");
var SiteDocumentSchema = external_exports.object({
  schemaVersion: external_exports.literal(CURRENT_SCHEMA_VERSION),
  subdomain: SubdomainSlugSchema,
  template: TemplateIdSchema,
  metadata: SiteMetadataSchema,
  theme: ThemeSchema,
  contact: SiteContactSchema,
  sections: external_exports.array(SectionSchema).max(MAX_SECTIONS_PER_DOCUMENT, `Site cannot contain more than ${MAX_SECTIONS_PER_DOCUMENT} sections`)
}).superRefine((doc, ctx) => {
  const seenIds = /* @__PURE__ */ new Set();
  doc.sections.forEach((section, index) => {
    if (seenIds.has(section.id)) {
      ctx.addIssue({
        code: external_exports.ZodIssueCode.custom,
        path: ["sections", index, "id"],
        message: `Duplicate section ID "${section.id}". Every section must have a unique ID`
      });
    }
    seenIds.add(section.id);
  });
});
function validateSiteDocument(raw2) {
  const result = SiteDocumentSchema.safeParse(raw2);
  if (!result.success) {
    const errors = result.error.issues.map((i) => {
      const pathStr = i.path.length > 0 ? `[${i.path.join(".")}] ` : "";
      return `${pathStr}${i.message}`;
    });
    return { valid: false, errors };
  }
  return { valid: true, document: result.data };
}
__name(validateSiteDocument, "validateSiteDocument");

// ../../packages/schema/dist/operations/types.js
var SetMetadataOperationSchema = external_exports.object({
  op: external_exports.literal("set_metadata"),
  metadata: SiteMetadataSchema.partial()
});
var UpdateThemeOperationSchema = external_exports.object({
  op: external_exports.literal("update_theme"),
  theme: ThemeSchema.partial()
});
var UpdateContactOperationSchema = external_exports.object({
  op: external_exports.literal("update_contact"),
  contact: SiteContactSchema.partial()
});
var AddSectionOperationSchema = external_exports.object({
  op: external_exports.literal("add_section"),
  section: SectionSchema.or(external_exports.lazy(() => SectionSchema.and(external_exports.object({
    id: SectionIdSchema.optional()
  })))),
  index: external_exports.number().int().nonnegative().optional()
});
var RemoveSectionOperationSchema = external_exports.object({
  op: external_exports.literal("remove_section"),
  sectionId: SectionIdSchema
});
var UpdateSectionOperationSchema = external_exports.object({
  op: external_exports.literal("update_section"),
  sectionId: SectionIdSchema,
  updates: external_exports.record(external_exports.unknown())
});
var ReorderSectionsOperationSchema = external_exports.object({
  op: external_exports.literal("reorder_sections"),
  sectionIds: external_exports.array(SectionIdSchema)
});
var OperationSchema = external_exports.discriminatedUnion("op", [
  SetMetadataOperationSchema,
  UpdateThemeOperationSchema,
  UpdateContactOperationSchema,
  AddSectionOperationSchema,
  RemoveSectionOperationSchema,
  UpdateSectionOperationSchema,
  ReorderSectionsOperationSchema
]);

// ../../packages/schema/dist/migrations/index.js
var MigrationRunner = class {
  static {
    __name(this, "MigrationRunner");
  }
  migrations = /* @__PURE__ */ new Map();
  constructor(initialMigrations = []) {
    for (const m of initialMigrations) {
      this.register(m);
    }
  }
  /**
   * Registers a migration step.
   */
  register(migration) {
    if (migration.toVersion !== migration.fromVersion + 1) {
      throw new Error(`Invalid migration: must transition to fromVersion + 1 (from ${migration.fromVersion} to ${migration.toVersion})`);
    }
    this.migrations.set(migration.fromVersion, migration);
  }
  /**
   * Migrates a raw document to the target schema version.
   */
  migrate(rawDoc, targetVersion = CURRENT_SCHEMA_VERSION) {
    if (typeof rawDoc !== "object" || rawDoc === null || Array.isArray(rawDoc)) {
      return { success: false, error: "Document to migrate must be a valid non-null object" };
    }
    const working = { ...rawDoc };
    const versionsTraversed = [];
    let currentVersion = typeof working["schemaVersion"] === "number" ? working["schemaVersion"] : 0;
    versionsTraversed.push(currentVersion);
    if (currentVersion > targetVersion) {
      return {
        success: false,
        error: `Cannot downgrade document from version ${currentVersion} to ${targetVersion}`
      };
    }
    while (currentVersion < targetVersion) {
      const migration = this.migrations.get(currentVersion);
      if (!migration) {
        return {
          success: false,
          error: `No migration path found from version ${currentVersion} to ${currentVersion + 1}`
        };
      }
      try {
        const transformed = migration.migrate(working);
        transformed["schemaVersion"] = migration.toVersion;
        Object.assign(working, transformed);
        currentVersion = migration.toVersion;
        versionsTraversed.push(currentVersion);
      } catch (err) {
        return {
          success: false,
          error: `Migration from v${currentVersion} to v${migration.toVersion} failed: ${err instanceof Error ? err.message : String(err)}`
        };
      }
    }
    const validation = SiteDocumentSchema.safeParse(working);
    if (!validation.success) {
      const issues = validation.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
      return {
        success: false,
        error: `Document migrated to v${targetVersion} but failed schema validation: ${issues}`
      };
    }
    return {
      success: true,
      document: validation.data,
      versionsTraversed
    };
  }
};
var defaultMigrationRunner = new MigrationRunner([]);

// ../../packages/templates/dist/engine/html.js
var SafeHtml = class {
  static {
    __name(this, "SafeHtml");
  }
  value;
  constructor(value) {
    this.value = value;
  }
  toString() {
    return this.value;
  }
};
function raw(content) {
  return new SafeHtml(content);
}
__name(raw, "raw");
function escapeHtml(value) {
  if (value === null || value === void 0) {
    return "";
  }
  const str = String(value);
  return str.replace(/[&<>"']/g, (char) => {
    switch (char) {
      case "&":
        return "&amp;";
      case "<":
        return "&lt;";
      case ">":
        return "&gt;";
      case '"':
        return "&quot;";
      case "'":
        return "&#39;";
      default:
        return char;
    }
  });
}
__name(escapeHtml, "escapeHtml");
function escapeAttr(value) {
  if (value === null || value === void 0) {
    return "";
  }
  return escapeHtml(String(value));
}
__name(escapeAttr, "escapeAttr");
function safeHref(url) {
  if (typeof url !== "string") {
    return "#";
  }
  const trimmed = url.trim();
  if (/^#[a-zA-Z0-9_-]+$/.test(trimmed)) {
    return trimmed;
  }
  const lower = trimmed.toLowerCase();
  if (lower.startsWith("javascript:") || lower.startsWith("data:") || lower.startsWith("vbscript:") || lower.startsWith("http://")) {
    return "#";
  }
  if (trimmed.startsWith("https://") || trimmed.startsWith("wa.me/")) {
    return escapeHtml(trimmed);
  }
  return "#";
}
__name(safeHref, "safeHref");
function html(strings, ...values) {
  let result = "";
  for (let i = 0; i < strings.length; i++) {
    result += strings[i];
    if (i < values.length) {
      const val = values[i];
      if (val === null || val === void 0 || val === false) {
        continue;
      }
      if (val instanceof SafeHtml) {
        result += val.value;
      } else if (Array.isArray(val)) {
        for (const item of val) {
          if (item === null || item === void 0 || item === false) {
            continue;
          }
          if (item instanceof SafeHtml) {
            result += item.value;
          } else {
            result += escapeHtml(item);
          }
        }
      } else {
        result += escapeHtml(val);
      }
    }
  }
  return new SafeHtml(result);
}
__name(html, "html");

// ../../packages/templates/dist/engine/theme.js
var HEX_REGEX = /^#[0-9a-fA-F]{6}$/;
var DARK_PRESET_PALETTES = {
  "lagos-emerald": {
    primary: "#10b981",
    secondary: "#34d399",
    background: "#091712",
    surface: "#11261e",
    text: "#f9fafb",
    muted: "#9ca3af"
  },
  "sunset-amber": {
    primary: "#f59e0b",
    secondary: "#fbbf24",
    background: "#18140c",
    surface: "#282012",
    text: "#fef3c7",
    muted: "#a8a29e"
  },
  "slate-minimal": {
    primary: "#38bdf8",
    secondary: "#818cf8",
    background: "#0f172a",
    surface: "#1e293b",
    text: "#f8fafc",
    muted: "#94a3b8"
  },
  "ocean-indigo": {
    primary: "#60a5fa",
    secondary: "#818cf8",
    background: "#0b1329",
    surface: "#162044",
    text: "#f8fafc",
    muted: "#94a3b8"
  },
  terracotta: {
    primary: "#fb923c",
    secondary: "#ea580c",
    background: "#1c1411",
    surface: "#2c1f1a",
    text: "#ffedd5",
    muted: "#a8a29e"
  },
  "royal-gold": {
    primary: "#f59e0b",
    secondary: "#fbbf24",
    background: "#18181b",
    surface: "#27272a",
    text: "#fafafa",
    muted: "#a1a1aa"
  }
};
var FONT_FAMILIES = {
  "system-sans": `-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif`,
  inter: `'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`,
  outfit: `'Outfit', -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`,
  "plus-jakarta-sans": `'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`,
  "dm-sans": `'DM Sans', -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`,
  "playfair-display": `'Playfair Display', Georgia, "Times New Roman", serif`,
  roboto: `'Roboto', -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`
};
var GOOGLE_FONT_NAMES = {
  "system-sans": null,
  inter: "Inter:wght@400;500;600;700",
  outfit: "Outfit:wght@400;500;600;700",
  "plus-jakarta-sans": "Plus+Jakarta+Sans:wght@400;500;600;700",
  "dm-sans": "DM+Sans:wght@400;500;700",
  "playfair-display": "Playfair+Display:wght@400;600;700",
  roboto: "Roboto:wght@400;500;700"
};
function sanitizeColor(candidate, fallback) {
  if (typeof candidate === "string" && HEX_REGEX.test(candidate.trim())) {
    return candidate.trim();
  }
  return fallback;
}
__name(sanitizeColor, "sanitizeColor");
function resolveTheme(theme) {
  const mode = theme?.mode === "dark" ? "dark" : "light";
  const isDark = mode === "dark";
  const presetKey = theme?.palette && theme.palette in PRESET_PALETTES ? theme.palette : "lagos-emerald";
  const basePreset = isDark ? DARK_PRESET_PALETTES[presetKey] : PRESET_PALETTES[presetKey];
  const custom2 = theme?.tokens;
  const tokens = {
    primary: sanitizeColor(custom2?.primary, basePreset.primary),
    secondary: sanitizeColor(custom2?.secondary, basePreset.secondary),
    background: sanitizeColor(custom2?.background, basePreset.background),
    surface: sanitizeColor(custom2?.surface, basePreset.surface),
    text: sanitizeColor(custom2?.text, basePreset.text),
    muted: sanitizeColor(custom2?.muted, basePreset.muted)
  };
  const font = theme?.font && FONT_ALLOWLIST.includes(theme.font) ? theme.font : "system-sans";
  const fontFamily = FONT_FAMILIES[font];
  let fontLinkTag = "";
  const googleFontParam = GOOGLE_FONT_NAMES[font];
  if (googleFontParam) {
    fontLinkTag = `<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=${googleFontParam}&display=swap">`;
  }
  const cssVariables = `
    --color-primary: ${tokens.primary};
    --color-secondary: ${tokens.secondary};
    --color-background: ${tokens.background};
    --color-surface: ${tokens.surface};
    --color-text: ${tokens.text};
    --color-muted: ${tokens.muted};
    --font-family: ${fontFamily};
  `;
  return {
    tokens,
    font,
    fontFamily,
    fontLinkTag,
    isDark,
    cssVariables
  };
}
__name(resolveTheme, "resolveTheme");

// ../../packages/templates/dist/engine/asset.js
function renderImage(options) {
  const { asset, resolver, isAboveFold = false, className = "", defaultWidth = 600, defaultHeight = 400 } = options;
  if (asset && asset.assetId) {
    const resolved = resolver(asset.assetId);
    if (resolved && resolved.url) {
      const loading = isAboveFold ? "eager" : "lazy";
      return html`<img
        src="${resolved.url}"
        ${resolved.srcset ? html`srcset="${resolved.srcset}" ` : ""}width="${resolved.width || defaultWidth}"
        height="${resolved.height || defaultHeight}"
        alt="${asset.alt}"
        loading="${loading}"
        decoding="async"
        ${className ? html`class="${className}" ` : ""}
      />`;
    }
  }
  const altText = asset?.alt || "Image placeholder";
  const classNames = ["asset-placeholder", className].filter(Boolean).join(" ");
  return html`<div class="${classNames}" role="img" aria-label="${altText}">
    <svg
      viewBox="0 0 24 24"
      width="32"
      height="32"
      fill="none"
      stroke="currentColor"
      stroke-width="1.5"
      aria-hidden="true"
    >
      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
      <circle cx="8.5" cy="8.5" r="1.5" />
      <polyline points="21 15 16 10 5 21" />
    </svg>
  </div>`;
}
__name(renderImage, "renderImage");

// ../../packages/templates/dist/sections/hero.js
function renderHero(section, ctx) {
  const imageHtml = section.image ? renderImage({
    asset: section.image,
    resolver: ctx.assetResolver,
    isAboveFold: true,
    className: "hero-img"
  }) : "";
  const ctaHtml = section.cta && section.cta.label ? html`<div class="hero-actions">
          <a
            href="${safeHref(section.cta.url)}"
            class="btn btn-primary btn-cta"
            rel="noopener noreferrer"
          >
            ${section.cta.label}
          </a>
        </div>` : "";
  return html`<section id="${escapeAttr(section.id)}" class="section section-hero">
    <div class="container hero-container">
      <div class="hero-content">
        <h1 class="hero-heading">${section.heading}</h1>
        ${section.subheading ? html`<p class="hero-subheading">${section.subheading}</p>` : ""}
        ${ctaHtml}
      </div>
      ${section.image ? html`<div class="hero-media">${imageHtml}</div>` : ""}
    </div>
  </section>`;
}
__name(renderHero, "renderHero");

// ../../packages/templates/dist/sections/about.js
function renderAbout(section, ctx) {
  const imageHtml = section.image ? renderImage({
    asset: section.image,
    resolver: ctx.assetResolver,
    isAboveFold: false,
    className: "about-img"
  }) : "";
  return html`<section id="${escapeAttr(section.id)}" class="section section-about">
    <div class="container about-container">
      <div class="about-content">
        <h2 class="section-title">${section.title}</h2>
        <div class="about-text">
          <p>${section.content}</p>
        </div>
      </div>
      ${section.image ? html`<div class="about-media">${imageHtml}</div>` : ""}
    </div>
  </section>`;
}
__name(renderAbout, "renderAbout");

// ../../packages/templates/dist/engine/formatters.js
function formatIntegerWithCommas(value) {
  const isNegative = value < 0;
  const absValue = Math.abs(Math.round(value));
  const formatted = absValue.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return isNegative ? `-${formatted}` : formatted;
}
__name(formatIntegerWithCommas, "formatIntegerWithCommas");
function formatPrice(price, currency = "NGN", label) {
  const numberStr = formatIntegerWithCommas(price);
  const currencyStr = currency === "NGN" ? `\u20A6${numberStr}` : `${currency} ${numberStr}`;
  if (label && label.trim().length > 0) {
    return `${label.trim()} ${currencyStr}`;
  }
  return currencyStr;
}
__name(formatPrice, "formatPrice");

// ../../packages/templates/dist/sections/services.js
function renderServiceItem(item, ctx) {
  const imageHtml = item.image ? renderImage({
    asset: item.image,
    resolver: ctx.assetResolver,
    isAboveFold: false,
    className: "service-item-img"
  }) : "";
  const priceHtml = item.price !== void 0 ? html`<div class="service-price">
          ${formatPrice(item.price, item.currency || "NGN", item.priceLabel)}
        </div>` : "";
  return html`<article id="${escapeAttr(item.id)}" class="service-card card">
    ${item.image ? html`<div class="service-media">${imageHtml}</div>` : ""}
    <div class="service-card-body">
      <h3 class="service-name">${item.name}</h3>
      ${item.description ? html`<p class="service-desc">${item.description}</p>` : ""} ${priceHtml}
    </div>
  </article>`;
}
__name(renderServiceItem, "renderServiceItem");
function renderServices(section, ctx) {
  const itemsHtml = section.items.map((item) => renderServiceItem(item, ctx));
  return html`<section id="${escapeAttr(section.id)}" class="section section-services">
    <div class="container">
      <div class="section-header">
        <h2 class="section-title">${section.title}</h2>
        ${section.subtitle ? html`<p class="section-subtitle">${section.subtitle}</p>` : ""}
      </div>
      <div class="services-grid grid">${itemsHtml}</div>
    </div>
  </section>`;
}
__name(renderServices, "renderServices");

// ../../packages/templates/dist/sections/gallery.js
function renderGallery(section, ctx) {
  const imagesHtml = section.images.map((image) => html`<figure class="gallery-item">
        ${renderImage({
    asset: image,
    resolver: ctx.assetResolver,
    isAboveFold: false,
    className: "gallery-img"
  })}
        ${image.caption ? html`<figcaption class="gallery-caption">${image.caption}</figcaption>` : ""}
      </figure>`);
  return html`<section id="${escapeAttr(section.id)}" class="section section-gallery">
    <div class="container">
      <div class="section-header">
        <h2 class="section-title">${section.title}</h2>
        ${section.description ? html`<p class="section-subtitle">${section.description}</p>` : ""}
      </div>
      <div class="gallery-grid grid">${imagesHtml}</div>
    </div>
  </section>`;
}
__name(renderGallery, "renderGallery");

// ../../packages/templates/dist/sections/testimonials.js
function renderTestimonialCard(item, ctx) {
  const avatarHtml = item.avatar ? renderImage({
    asset: item.avatar,
    resolver: ctx.assetResolver,
    isAboveFold: false,
    className: "testimonial-avatar",
    defaultWidth: 80,
    defaultHeight: 80
  }) : "";
  return html`<blockquote id="${escapeAttr(item.id)}" class="testimonial-card card">
    <p class="testimonial-quote">“${item.quote}”</p>
    <footer class="testimonial-footer">
      ${item.avatar ? html`<div class="testimonial-media">${avatarHtml}</div>` : ""}
      <div class="testimonial-meta">
        <cite class="testimonial-author">${item.author}</cite>
        ${item.roleOrLocation ? html`<span class="testimonial-role">${item.roleOrLocation}</span>` : ""}
      </div>
    </footer>
  </blockquote>`;
}
__name(renderTestimonialCard, "renderTestimonialCard");
function renderTestimonials(section, ctx) {
  const itemsHtml = section.items.map((item) => renderTestimonialCard(item, ctx));
  return html`<section id="${escapeAttr(section.id)}" class="section section-testimonials">
    <div class="container">
      <div class="section-header">
        <h2 class="section-title">${section.title}</h2>
      </div>
      <div class="testimonials-grid grid">${itemsHtml}</div>
    </div>
  </section>`;
}
__name(renderTestimonials, "renderTestimonials");

// ../../packages/templates/dist/sections/faq.js
function renderFaq(section, _ctx) {
  const itemsHtml = section.items.map((item) => html`<details id="${escapeAttr(item.id)}" class="faq-item card">
        <summary class="faq-question">
          <span>${item.question}</span>
          <span class="faq-chevron" aria-hidden="true">▾</span>
        </summary>
        <div class="faq-answer">
          <p>${item.answer}</p>
        </div>
      </details>`);
  return html`<section id="${escapeAttr(section.id)}" class="section section-faq">
    <div class="container container-narrow">
      <div class="section-header">
        <h2 class="section-title">${section.title}</h2>
      </div>
      <div class="faq-list">${itemsHtml}</div>
    </div>
  </section>`;
}
__name(renderFaq, "renderFaq");

// ../../packages/templates/dist/sections/contact.js
function renderContact(section, _ctx) {
  const whatsappHtml = section.whatsappNumber ? html`<div class="contact-method card">
        <h3 class="contact-method-title">WhatsApp</h3>
        <p class="contact-method-value">
          <a
            href="${safeHref(buildWhatsAppLink(section.whatsappNumber, "Hello! I am contacting you from your website."))}"
            class="contact-link"
            target="_blank"
            rel="noopener noreferrer"
          >
            Chat with us on WhatsApp (${section.whatsappNumber})
          </a>
        </p>
      </div>` : "";
  const emailHtml = section.email ? html`<div class="contact-method card">
        <h3 class="contact-method-title">Email</h3>
        <p class="contact-method-value">
          <a href="${escapeAttr(`mailto:${section.email}`)}" class="contact-link">
            ${section.email}
          </a>
        </p>
      </div>` : "";
  const addressHtml = section.address ? html`<div class="contact-method card">
        <h3 class="contact-method-title">Location</h3>
        <address class="contact-address">${section.address}</address>
      </div>` : "";
  const socialLinksHtml = section.socialLinks && section.socialLinks.length > 0 ? html`<div class="contact-socials">
          <h3 class="contact-socials-title">Follow Us</h3>
          <ul class="social-links-list">
            ${section.socialLinks.map((s) => html`<li>
                  <a
                    href="${safeHref(s.url)}"
                    class="social-link"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    ${s.platform}
                  </a>
                </li>`)}
          </ul>
        </div>` : "";
  return html`<section id="${escapeAttr(section.id)}" class="section section-contact">
    <div class="container container-narrow">
      <div class="section-header">
        <h2 class="section-title">${section.title}</h2>
        ${section.description ? html`<p class="section-subtitle">${section.description}</p>` : ""}
      </div>
      <div class="contact-grid">${whatsappHtml} ${emailHtml} ${addressHtml}</div>
      ${socialLinksHtml}
    </div>
  </section>`;
}
__name(renderContact, "renderContact");

// ../../packages/templates/dist/sections/footer.js
function renderFooter(section, ctx) {
  const linksHtml = section.links && section.links.length > 0 ? html`<ul class="footer-links">
          ${section.links.map((link) => html`<li>
                <a
                  href="${safeHref(link.url)}"
                  class="footer-link"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  ${link.label}
                </a>
              </li>`)}
        </ul>` : "";
  const brandingHtml = ctx.showBranding ? html`<div class="footer-branding">
        <a
          href="https://replyiq.cv"
          target="_blank"
          rel="noopener noreferrer"
          class="branding-link"
        >
          Built with <strong>ReplyIQ</strong>
        </a>
      </div>` : "";
  return html`<footer id="${escapeAttr(section.id)}" class="site-footer">
    <div class="container footer-container">
      ${section.copyrightText ? html`<p class="footer-copyright">${section.copyrightText}</p>` : ""}
      ${linksHtml} ${brandingHtml}
    </div>
  </footer>`;
}
__name(renderFooter, "renderFooter");

// ../../packages/templates/dist/sections/registry.js
function assertNever(value) {
  throw new Error(`Unhandled section type: ${JSON.stringify(value)}`);
}
__name(assertNever, "assertNever");
function renderSection(section, ctx) {
  switch (section.type) {
    case "hero":
      return renderHero(section, ctx);
    case "about":
      return renderAbout(section, ctx);
    case "services":
      return renderServices(section, ctx);
    case "gallery":
      return renderGallery(section, ctx);
    case "testimonials":
      return renderTestimonials(section, ctx);
    case "faq":
      return renderFaq(section, ctx);
    case "contact":
      return renderContact(section, ctx);
    case "footer":
      return renderFooter(section, ctx);
    default:
      return assertNever(section);
  }
}
__name(renderSection, "renderSection");

// ../../packages/templates/dist/templates/portfolio/layout.js
function getSectionNavLabel(section) {
  switch (section.type) {
    case "hero":
      return null;
    // Hero doesn't need a nav link
    case "about":
      return section.title || "About";
    case "services":
      return section.title || "Services";
    case "gallery":
      return section.title || "Gallery";
    case "testimonials":
      return section.title || "Testimonials";
    case "faq":
      return section.title || "FAQ";
    case "contact":
      return section.title || "Contact";
    case "footer":
      return null;
    default:
      return null;
  }
}
__name(getSectionNavLabel, "getSectionNavLabel");
var WHATSAPP_SVG_ICON = `<svg class="whatsapp-icon" viewBox="0 0 24 24" width="28" height="28" fill="currentColor" aria-hidden="true"><path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/></svg>`;
function renderPortfolioLayout(doc, ctx) {
  const hasHero = doc.sections.some((s) => s.type === "hero");
  const navItems = doc.sections.map((section) => {
    const label = getSectionNavLabel(section);
    if (!label)
      return null;
    return html`<a href="#${escapeAttr(section.id)}" class="nav-link">${label}</a>`;
  }).filter(Boolean);
  const navHtml = navItems.length > 0 ? html`<nav class="site-nav" aria-label="Site Navigation">${navItems}</nav>` : "";
  const logoHtml = hasHero ? html`<span class="site-logo">${doc.metadata.title}</span>` : html`<h1 class="site-logo">${doc.metadata.title}</h1>`;
  const renderedSections = doc.sections.map((section) => renderSection(section, ctx));
  const whatsappUrl = buildWhatsAppLink(doc.contact.whatsappNumber, doc.contact.defaultMessage);
  const floatingWhatsappHtml = html`<a
    href="${safeHref(whatsappUrl)}"
    class="floating-whatsapp"
    target="_blank"
    rel="noopener noreferrer"
    aria-label="Chat with ${doc.metadata.title} on WhatsApp"
  >
    ${raw(WHATSAPP_SVG_ICON)}
  </a>`;
  return html`
    <!-- Skip to main content link for keyboard & screen reader accessibility -->
    <a href="#main-content" class="skip-link">Skip to main content</a>

    ${ctx.mode === "preview" ? html`<div class="preview-ribbon" role="status">
            Preview Mode &mdash; Site Not Published
          </div>` : ""}

    <header class="site-header">
      <div class="container header-container">${logoHtml} ${navHtml}</div>
    </header>

    <main id="main-content">${renderedSections}</main>

    ${floatingWhatsappHtml}
  `;
}
__name(renderPortfolioLayout, "renderPortfolioLayout");

// ../../packages/templates/dist/templates/portfolio/styles.js
function getPortfolioStyles() {
  return `
    *, *::before, *::after {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    html {
      font-family: var(--font-family);
      line-height: 1.5;
      -webkit-text-size-adjust: 100%;
      scroll-behavior: smooth;
    }

    body {
      background-color: var(--color-background);
      color: var(--color-text);
      font-size: 1rem;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      /* Bottom padding so floating WhatsApp button never obscures footer content */
      padding-bottom: 5.5rem;
    }

    @media (prefers-reduced-motion: reduce) {
      *, *::before, *::after {
        animation-duration: 0.01ms !important;
        animation-iteration-count: 1 !important;
        transition-duration: 0.01ms !important;
        scroll-behavior: auto !important;
      }
    }

    /* Accessibility: Skip Link */
    .skip-link {
      position: absolute;
      top: -100px;
      left: 1rem;
      background: var(--color-primary);
      color: #ffffff;
      padding: 0.75rem 1.25rem;
      z-index: 9999;
      font-weight: 600;
      border-radius: 4px;
      text-decoration: none;
      transition: top 0.2s ease;
    }
    .skip-link:focus {
      top: 1rem;
      outline: 3px solid var(--color-text);
      outline-offset: 2px;
    }

    /* Focus Visible Styles */
    :focus-visible {
      outline: 2px solid var(--color-primary);
      outline-offset: 3px;
    }

    /* Layout Containers */
    .container {
      width: 100%;
      max-width: 1120px;
      margin-left: auto;
      margin-right: auto;
      padding-left: 1rem;
      padding-right: 1rem;
    }
    .container-narrow {
      max-width: 768px;
    }

    /* Preview Ribbon */
    .preview-ribbon {
      background: #f59e0b;
      color: #000000;
      text-align: center;
      padding: 0.35rem 1rem;
      font-size: 0.75rem;
      font-weight: 700;
      letter-spacing: 0.05em;
      text-transform: uppercase;
      position: sticky;
      top: 0;
      z-index: 1000;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    }

    /* Navigation Header */
    .site-header {
      background: var(--color-surface);
      border-bottom: 1px solid rgba(128, 128, 128, 0.2);
      padding: 1rem 0;
      position: sticky;
      top: 0;
      z-index: 100;
    }
    .header-container {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 1rem;
    }
    .site-logo {
      font-size: 1.25rem;
      font-weight: 700;
      color: var(--color-text);
      text-decoration: none;
    }
    .site-nav {
      display: flex;
      gap: 0.75rem;
      overflow-x: auto;
      white-space: nowrap;
      padding-bottom: 0.25rem;
      -webkit-overflow-scrolling: touch;
    }
    .nav-link {
      color: var(--color-muted);
      text-decoration: none;
      font-size: 0.875rem;
      font-weight: 500;
      padding: 0.25rem 0.5rem;
      border-radius: 4px;
      transition: color 0.15s ease;
    }
    .nav-link:hover, .nav-link:focus-visible {
      color: var(--color-primary);
    }

    /* Section Base */
    .section {
      padding: 3rem 0;
    }
    .section-header {
      text-align: center;
      margin-bottom: 2rem;
    }
    .section-title {
      font-size: 1.875rem;
      font-weight: 700;
      color: var(--color-text);
      margin-bottom: 0.5rem;
      letter-spacing: -0.02em;
    }
    .section-subtitle {
      color: var(--color-muted);
      font-size: 1rem;
      max-width: 600px;
      margin: 0 auto;
    }

    /* Cards & Grids */
    .card {
      background: var(--color-surface);
      border: 1px solid rgba(128, 128, 128, 0.18);
      border-radius: 12px;
      padding: 1.25rem;
      overflow: hidden;
      box-shadow: 0 1px 3px rgba(0,0,0,0.05);
    }
    .grid {
      display: grid;
      gap: 1.25rem;
      grid-template-columns: 1fr;
    }
    @media (min-width: 640px) {
      .grid {
        grid-template-columns: repeat(2, 1fr);
      }
    }
    @media (min-width: 1024px) {
      .services-grid {
        grid-template-columns: repeat(3, 1fr);
      }
      .gallery-grid {
        grid-template-columns: repeat(3, 1fr);
      }
    }

    /* Buttons */
    .btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      padding: 0.75rem 1.5rem;
      font-size: 1rem;
      font-weight: 600;
      border-radius: 8px;
      text-decoration: none;
      cursor: pointer;
      border: none;
      transition: opacity 0.15s ease, transform 0.15s ease;
    }
    .btn:hover {
      opacity: 0.92;
      transform: translateY(-1px);
    }
    .btn-primary {
      background-color: var(--color-primary);
      color: #ffffff;
    }

    /* Hero Section */
    .section-hero {
      padding: 4rem 0 3rem;
      background: linear-gradient(180deg, var(--color-surface) 0%, var(--color-background) 100%);
    }
    .hero-container {
      display: flex;
      flex-direction: column;
      gap: 2rem;
      align-items: center;
      text-align: center;
    }
    .hero-content {
      max-width: 720px;
    }
    .hero-heading {
      font-size: 2.25rem;
      font-weight: 800;
      line-height: 1.2;
      letter-spacing: -0.03em;
      color: var(--color-text);
      margin-bottom: 1rem;
    }
    .hero-subheading {
      font-size: 1.125rem;
      color: var(--color-muted);
      margin-bottom: 1.5rem;
      line-height: 1.6;
    }
    .hero-actions {
      display: flex;
      justify-content: center;
      gap: 1rem;
    }
    .hero-media {
      width: 100%;
      max-width: 540px;
      border-radius: 16px;
      overflow: hidden;
      box-shadow: 0 10px 25px rgba(0,0,0,0.1);
    }
    .hero-img {
      width: 100%;
      height: auto;
      display: block;
      object-fit: cover;
    }
    @media (min-width: 768px) {
      .hero-heading {
        font-size: 3rem;
      }
    }

    /* About Section */
    .about-container {
      display: flex;
      flex-direction: column;
      gap: 2rem;
    }
    .about-content {
      line-height: 1.7;
    }
    .about-text p {
      margin-bottom: 1rem;
      color: var(--color-text);
      white-space: pre-line;
    }
    .about-media {
      max-width: 500px;
      border-radius: 12px;
      overflow: hidden;
    }
    .about-img {
      width: 100%;
      height: auto;
      display: block;
    }
    @media (min-width: 768px) {
      .about-container {
        flex-direction: row;
        align-items: center;
      }
      .about-content {
        flex: 1;
      }
      .about-media {
        flex: 1;
      }
    }

    /* Services Section */
    .service-card {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }
    .service-media {
      margin: -1.25rem -1.25rem 0.75rem -1.25rem;
      overflow: hidden;
      aspect-ratio: 16/9;
    }
    .service-item-img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      display: block;
    }
    .service-name {
      font-size: 1.25rem;
      font-weight: 600;
      color: var(--color-text);
      margin-bottom: 0.25rem;
    }
    .service-desc {
      color: var(--color-muted);
      font-size: 0.875rem;
      flex: 1;
      line-height: 1.5;
    }
    .service-price {
      margin-top: 0.75rem;
      font-size: 1.125rem;
      font-weight: 700;
      color: var(--color-primary);
    }

    /* Gallery Section */
    .gallery-item {
      position: relative;
      border-radius: 10px;
      overflow: hidden;
      aspect-ratio: 4/3;
      background: var(--color-surface);
      border: 1px solid rgba(128, 128, 128, 0.15);
    }
    .gallery-img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      display: block;
      transition: transform 0.2s ease;
    }
    .gallery-item:hover .gallery-img {
      transform: scale(1.03);
    }
    .gallery-caption {
      position: absolute;
      bottom: 0;
      left: 0;
      right: 0;
      background: rgba(0, 0, 0, 0.75);
      color: #ffffff;
      padding: 0.4rem 0.75rem;
      font-size: 0.75rem;
      text-align: center;
    }

    /* Testimonials Section */
    .testimonial-card {
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      gap: 1rem;
    }
    .testimonial-quote {
      font-size: 1rem;
      font-style: italic;
      color: var(--color-text);
      line-height: 1.6;
    }
    .testimonial-footer {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      margin-top: auto;
    }
    .testimonial-media {
      width: 44px;
      height: 44px;
      border-radius: 50%;
      overflow: hidden;
      flex-shrink: 0;
    }
    .testimonial-avatar {
      width: 100%;
      height: 100%;
      object-fit: cover;
      display: block;
    }
    .testimonial-author {
      font-weight: 600;
      font-style: normal;
      color: var(--color-text);
      display: block;
      font-size: 0.875rem;
    }
    .testimonial-role {
      font-size: 0.75rem;
      color: var(--color-muted);
      display: block;
    }

    /* FAQ Section */
    .faq-list {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }
    .faq-item {
      padding: 0;
      border: 1px solid rgba(128, 128, 128, 0.2);
    }
    .faq-question {
      padding: 1rem 1.25rem;
      font-weight: 600;
      color: var(--color-text);
      cursor: pointer;
      display: flex;
      justify-content: space-between;
      align-items: center;
      user-select: none;
      list-style: none;
    }
    .faq-question::-webkit-details-marker {
      display: none;
    }
    .faq-chevron {
      font-size: 0.875rem;
      color: var(--color-muted);
      transition: transform 0.2s ease;
    }
    details[open] .faq-chevron {
      transform: rotate(180deg);
    }
    .faq-answer {
      padding: 0 1.25rem 1.25rem;
      color: var(--color-muted);
      line-height: 1.6;
      font-size: 0.9375rem;
    }

    /* Contact Section */
    .contact-grid {
      display: grid;
      gap: 1rem;
      grid-template-columns: 1fr;
      margin-bottom: 1.5rem;
    }
    .contact-method-title {
      font-size: 0.875rem;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--color-muted);
      margin-bottom: 0.35rem;
    }
    .contact-method-value, .contact-address {
      font-style: normal;
      font-size: 1rem;
      color: var(--color-text);
    }
    .contact-link {
      color: var(--color-primary);
      text-decoration: underline;
      font-weight: 500;
    }
    .contact-socials {
      text-align: center;
      margin-top: 1.5rem;
    }
    .contact-socials-title {
      font-size: 0.875rem;
      color: var(--color-muted);
      margin-bottom: 0.75rem;
    }
    .social-links-list {
      list-style: none;
      display: flex;
      justify-content: center;
      gap: 0.75rem;
      flex-wrap: wrap;
    }
    .social-link {
      display: inline-block;
      padding: 0.4rem 0.85rem;
      background: var(--color-surface);
      border: 1px solid rgba(128, 128, 128, 0.2);
      border-radius: 20px;
      color: var(--color-text);
      text-decoration: none;
      font-size: 0.8125rem;
      font-weight: 500;
      text-transform: capitalize;
    }
    .social-link:hover {
      border-color: var(--color-primary);
      color: var(--color-primary);
    }

    /* Footer Section */
    .site-footer {
      background: var(--color-surface);
      border-top: 1px solid rgba(128, 128, 128, 0.2);
      padding: 2rem 0;
      margin-top: auto;
      font-size: 0.875rem;
      color: var(--color-muted);
    }
    .footer-container {
      display: flex;
      flex-direction: column;
      gap: 1rem;
      align-items: center;
      text-align: center;
    }
    .footer-links {
      list-style: none;
      display: flex;
      gap: 1.25rem;
      flex-wrap: wrap;
      justify-content: center;
    }
    .footer-link {
      color: var(--color-muted);
      text-decoration: none;
    }
    .footer-link:hover {
      color: var(--color-primary);
    }
    .footer-branding {
      margin-top: 0.5rem;
    }
    .branding-link {
      color: var(--color-muted);
      text-decoration: none;
      font-size: 0.8125rem;
    }
    .branding-link strong {
      color: var(--color-primary);
    }

    /* Floating WhatsApp Button */
    .floating-whatsapp {
      position: fixed;
      bottom: 1.25rem;
      right: 1.25rem;
      background-color: #25d366;
      color: #ffffff;
      width: 56px;
      height: 56px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 4px 14px rgba(0, 0, 0, 0.25);
      z-index: 990;
      text-decoration: none;
      transition: transform 0.2s ease, box-shadow 0.2s ease;
    }
    .floating-whatsapp:hover, .floating-whatsapp:focus-visible {
      transform: scale(1.08);
      box-shadow: 0 6px 18px rgba(0, 0, 0, 0.35);
    }
    .whatsapp-icon {
      width: 32px;
      height: 32px;
      fill: currentColor;
    }

    /* Neutral Asset Placeholder */
    .asset-placeholder {
      display: flex;
      align-items: center;
      justify-content: center;
      background-color: var(--color-surface);
      color: var(--color-muted);
      border: 1px dashed rgba(128, 128, 128, 0.3);
      border-radius: 8px;
      width: 100%;
      height: 100%;
      min-height: 140px;
    }
    .placeholder-icon {
      opacity: 0.5;
    }
  `;
}
__name(getPortfolioStyles, "getPortfolioStyles");

// ../../packages/templates/dist/templates/portfolio/index.js
var portfolioTemplate = {
  id: "portfolio",
  name: "Portfolio",
  render(doc, ctx) {
    return renderPortfolioLayout(doc, ctx);
  },
  getStyles() {
    return getPortfolioStyles();
  }
};

// ../../packages/templates/dist/templates/registry.js
var templateRegistry = {
  portfolio: portfolioTemplate
};
function getTemplate(templateId) {
  const tpl = templateRegistry[templateId];
  if (!tpl) {
    return portfolioTemplate;
  }
  return tpl;
}
__name(getTemplate, "getTemplate");

// ../../packages/templates/dist/render.js
function renderSite(document, context) {
  const validation = validateSiteDocument(document);
  if (!validation.valid) {
    return {
      ok: false,
      errors: validation.errors
    };
  }
  const doc = validation.document;
  const theme = resolveTheme(doc.theme);
  const templateId = doc.template || "portfolio";
  const template = getTemplate(templateId);
  const langAttr = escapeAttr(doc.metadata.language || "en");
  const titleText = escapeHtml(doc.metadata.title);
  const descriptionAttr = escapeAttr(doc.metadata.description);
  let robotsTag = "";
  let canonicalTag = "";
  let openGraphTags = "";
  if (context.mode === "preview") {
    robotsTag = `<meta name="robots" content="noindex, nofollow">
`;
  } else {
    robotsTag = `<meta name="robots" content="index, follow">
`;
    if (context.canonicalUrl) {
      const canonicalEscaped = escapeAttr(context.canonicalUrl);
      canonicalTag = `<link rel="canonical" href="${canonicalEscaped}">
`;
      openGraphTags = `
    <meta property="og:type" content="website">
    <meta property="og:title" content="${titleText}">
    <meta property="og:description" content="${descriptionAttr}">
    <meta property="og:url" content="${canonicalEscaped}">
    <meta name="twitter:card" content="summary">
    <meta name="twitter:title" content="${titleText}">
    <meta name="twitter:description" content="${descriptionAttr}">
`;
    }
  }
  const bodyContent = template.render(doc, context);
  const htmlOutput = `<!DOCTYPE html>
<html lang="${langAttr}">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${titleText}</title>
    <meta name="description" content="${descriptionAttr}">
    ${robotsTag}${canonicalTag}${openGraphTags}${theme.fontLinkTag ? `    ${theme.fontLinkTag}
` : ""}    <style>
      :root {${theme.cssVariables}}
      ${template.getStyles()}
    </style>
</head>
<body class="${theme.isDark ? "dark" : "light"}">
${bodyContent.value}
</body>
</html>`;
  return {
    ok: true,
    html: htmlOutput
  };
}
__name(renderSite, "renderSite");

// ../../packages/templates/dist/samples/index.js
var stressSample = {
  schemaVersion: 1,
  subdomain: "stress-max-business",
  template: "portfolio",
  metadata: {
    title: "Apex Nigerian Enterprises Unlimited Maximum Title Characters Showcase",
    description: "A comprehensive stress-test document exercising all boundary lengths, maximum 20 sections, full list items, and all template components under load.",
    language: "en",
    locale: "en-NG"
  },
  theme: {
    palette: "royal-gold",
    font: "roboto",
    mode: "dark"
  },
  contact: {
    whatsappNumber: "+2349012345678",
    defaultMessage: "This is a prefilled message that approaches the full permitted character limit to test how the encoding, link generation, and text formatting hold up under heavy load."
  },
  sections: [
    // 1. Hero
    {
      id: "hero-main",
      type: "hero",
      heading: "Leading Innovation in Industrial Supply & Agro-Allied Commodities Across West Africa",
      subheading: "Connecting thousands of Nigerian farmers and regional manufacturers with reliable logistics, transparent pricing, and world-class trade execution.",
      cta: {
        label: "Contact Trade Desk",
        url: "https://wa.me/2349012345678"
      },
      image: { assetId: "asset_stress_hero", alt: "Industrial agro warehouse logistics" }
    },
    // 2. About
    {
      id: "about-main",
      type: "about",
      title: "About Apex Enterprises",
      content: "Apex Enterprises was established in 2018 to bridge the structural gap between sub-Saharan agricultural output and industrial manufacturing demands. Headquartered in Marina, Lagos, with operational hubs in Kano and Port Harcourt, we manage end-to-end supply chains encompassing grain aggregation, cold storage transport, and export compliance. Our commitment is founded on timely dispatch, zero adulteration, and fair remuneration for smallholder farming cooperatives.",
      image: { assetId: "asset_stress_about", alt: "Corporate team meeting in Lagos" }
    },
    // 3. Services with 12 items (maximum allowed!)
    {
      id: "services-main",
      type: "services",
      title: "Industrial & Commodity Services",
      subtitle: "Full-spectrum logistics and aggregation services tailored for commercial enterprises.",
      items: Array.from({ length: 12 }, (_, i) => ({
        id: `serv-item-${i + 1}`,
        name: `Commodity Service Package Grade ${i + 1}`,
        description: `Industrial specification processing and guaranteed temperature-controlled transit across all Nigerian maritime corridors.`,
        price: 5e5 + i * 25e3,
        currency: "NGN",
        priceLabel: "starting from",
        image: { assetId: `asset_serv_${i + 1}`, alt: `Service illustration ${i + 1}` }
      }))
    },
    // 4. Gallery with 12 images (maximum allowed!)
    {
      id: "gallery-main",
      type: "gallery",
      title: "Warehouse & Fleet Showcase",
      description: "Visual tour of our aggregation centers, fleets, and certified processing stations.",
      images: Array.from({ length: 12 }, (_, i) => ({
        assetId: `asset_gal_${i + 1}`,
        alt: `Processing facility photograph ${i + 1}`,
        caption: `Facility unit ${i + 1} located in industrial district`
      }))
    },
    // 5. Testimonials with 8 items (maximum allowed!)
    {
      id: "testimonials-main",
      type: "testimonials",
      title: "Enterprise Client Testimonials",
      items: Array.from({ length: 8 }, (_, i) => ({
        id: `test-item-${i + 1}`,
        quote: `Apex has delivered over four thousand metric tonnes of sorted raw materials to our plant without a single shipment delay or quality dispute.`,
        author: `Chief Executive Officer ${i + 1}`,
        roleOrLocation: `Industrial Mills PLC, Ogun State`,
        avatar: { assetId: `asset_avatar_${i + 1}`, alt: `Executive portrait ${i + 1}` }
      }))
    },
    // 6. FAQ with 10 items (maximum allowed!)
    {
      id: "faq-main",
      type: "faq",
      title: "Frequently Asked Questions",
      items: Array.from({ length: 10 }, (_, i) => ({
        id: `faq-item-${i + 1}`,
        question: `What are your minimum order volumes for industrial delivery category ${i + 1}?`,
        answer: `For commercial accounts, our baseline consignment is ten metric tonnes, backed by third-party laboratory assay certificates and verified moisture readings.`
      }))
    },
    // 7. Contact
    {
      id: "contact-main",
      type: "contact",
      title: "Contact Headquarters",
      description: "Connect directly with our commercial desk or visit our Marina executive offices.",
      whatsappNumber: "+2349012345678",
      email: "procurement@apexenterprises.ng",
      address: "Floor 14, Marina Towers, 22 Broad Street, Lagos Island, Lagos",
      socialLinks: [
        { platform: "linkedin", url: "https://linkedin.com/company/apex-enterprises" },
        { platform: "twitter", url: "https://twitter.com/apex_ng" },
        { platform: "facebook", url: "https://facebook.com/apexnigeria" }
      ]
    },
    // Sections 8 through 19: Additional content blocks bringing total to exactly 20 sections
    ...Array.from({ length: 12 }, (_, i) => ({
      id: `extra-about-${i + 1}`,
      type: "about",
      title: `Corporate Division & Subsidiary ${i + 1}`,
      content: `Detailed documentation of regional subsidiary operations, regulatory compliance certifications, and localized community impact initiatives operating under division ${i + 1}.`
    })),
    // 20. Footer (20th section)
    {
      id: "footer-main",
      type: "footer",
      copyrightText: "\xA9 2026 Apex Enterprises West Africa Limited. Registered in the Federal Republic of Nigeria.",
      links: [
        { label: "Privacy Policy", url: "https://replyiq.cv/privacy" },
        { label: "Terms of Service", url: "https://replyiq.cv/terms" }
      ]
    }
  ]
};

// src/host.ts
function isIpAddress(hostname) {
  if (/^(\d{1,3}\.){3}\d{1,3}$/.test(hostname)) {
    return true;
  }
  if (hostname.includes(":")) {
    return true;
  }
  return false;
}
__name(isIpAddress, "isIpAddress");
function parseHost(requestUrl, options) {
  let hostname = "";
  let searchParams = null;
  let pathname = "";
  try {
    const parsedUrl = new URL(requestUrl);
    hostname = parsedUrl.hostname.toLowerCase().replace(/\.+$/, "");
    searchParams = parsedUrl.searchParams;
    pathname = parsedUrl.pathname;
  } catch {
    return { type: "unknown" };
  }
  const baseDomain = options.baseDomain.toLowerCase().replace(/\.+$/, "");
  if (isIpAddress(hostname)) {
    const rawIp = hostname.replace(/^\[|\]$/g, "");
    if (options.allowLoopbackIp && (rawIp === "127.0.0.1" || rawIp === "::1")) {
      hostname = "localhost";
    } else {
      return { type: "invalid_ip" };
    }
  }
  const bypassSet = new Set(
    (options.bypassHosts || []).map((h) => h.toLowerCase().replace(/\.+$/, ""))
  );
  bypassSet.add(baseDomain);
  bypassSet.add(`www.${baseDomain}`);
  if (bypassSet.has(hostname)) {
    if (options.stagingOverrideEnabled) {
      const querySite = searchParams?.get("site");
      if (querySite) {
        const slug2 = querySite.toLowerCase();
        if (RESERVED_SLUGS.has(slug2)) return { type: "reserved_slug", slug: slug2 };
        return { type: "site", slug: slug2 };
      }
      const pathMatch = pathname.match(/^\/site\/([a-zA-Z0-9_-]+)/);
      if (pathMatch && pathMatch[1]) {
        const slug2 = pathMatch[1].toLowerCase();
        if (RESERVED_SLUGS.has(slug2)) return { type: "reserved_slug", slug: slug2 };
        return { type: "site", slug: slug2 };
      }
    }
    return { type: "bypass" };
  }
  if (hostname.endsWith(".workers.dev")) {
    if (options.stagingOverrideEnabled) {
      const querySite = searchParams?.get("site");
      if (querySite) {
        const slug2 = querySite.toLowerCase();
        if (RESERVED_SLUGS.has(slug2)) return { type: "reserved_slug", slug: slug2 };
        return { type: "site", slug: slug2 };
      }
      const pathMatch = pathname.match(/^\/site\/([a-zA-Z0-9_-]+)/);
      if (pathMatch && pathMatch[1]) {
        const slug2 = pathMatch[1].toLowerCase();
        if (RESERVED_SLUGS.has(slug2)) return { type: "reserved_slug", slug: slug2 };
        return { type: "site", slug: slug2 };
      }
    }
    return { type: "bypass" };
  }
  if (hostname === `cdn.${baseDomain}`) {
    return { type: "cdn" };
  }
  if (hostname === `preview.${baseDomain}`) {
    return { type: "preview" };
  }
  const suffix = `.${baseDomain}`;
  if (!hostname.endsWith(suffix)) {
    return { type: "unknown" };
  }
  const prefix = hostname.slice(0, -suffix.length);
  if (prefix.includes(".")) {
    return { type: "nested_subdomain" };
  }
  const slug = prefix;
  if (!slug) {
    return { type: "bypass" };
  }
  if (RESERVED_SLUGS.has(slug)) {
    return { type: "reserved_slug", slug };
  }
  return { type: "site", slug };
}
__name(parseHost, "parseHost");

// src/headers.ts
function buildSecurityHeaders(options) {
  const cdnHost = `cdn.${options.baseDomain}`;
  const csp = [
    "default-src 'none'",
    `img-src https://${cdnHost} data:`,
    "style-src 'unsafe-inline' https://fonts.googleapis.com",
    "font-src https://fonts.gstatic.com",
    "script-src 'none'",
    "frame-ancestors 'none'",
    "base-uri 'none'",
    "form-action 'none'"
  ].join("; ");
  const headers = {
    "Content-Security-Policy": csp,
    "Strict-Transport-Security": "max-age=31536000",
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "Permissions-Policy": "camera=(), microphone=(), geolocation=()"
  };
  if (options.contentType) {
    headers["Content-Type"] = options.contentType;
  }
  if (options.noIndex) {
    headers["X-Robots-Tag"] = "noindex, nofollow";
  }
  if (options.isPrivate) {
    headers["Cache-Control"] = "private, no-store, max-age=0";
  } else if (typeof options.cacheTtlSeconds === "number") {
    if (options.cacheTtlSeconds === 0) {
      headers["Cache-Control"] = "no-cache, no-store, must-revalidate";
    } else {
      headers["Cache-Control"] = `public, max-age=${options.cacheTtlSeconds}, s-maxage=${options.cacheTtlSeconds}, stale-while-revalidate=30`;
    }
  }
  return headers;
}
__name(buildSecurityHeaders, "buildSecurityHeaders");

// src/pages.ts
function escapeHtml2(text) {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}
__name(escapeHtml2, "escapeHtml");
function renderNotFoundPage(baseDomain, slug) {
  const safeSlug = slug ? escapeHtml2(slug) : "";
  const message = safeSlug ? `The website <strong>${safeSlug}.${escapeHtml2(baseDomain)}</strong> does not exist or has not been published yet.` : "The page you are looking for does not exist.";
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Site Not Found \u2014 ReplyIQ</title>
  <meta name="robots" content="noindex, nofollow">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      background-color: #0f172a;
      color: #f8fafc;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 1.5rem;
      text-align: center;
    }
    .container {
      max-width: 480px;
      background: #1e293b;
      border: 1px solid #334155;
      border-radius: 1rem;
      padding: 2.5rem 2rem;
      box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.5);
    }
    .badge {
      display: inline-block;
      background: #0284c7;
      color: #ffffff;
      font-weight: 700;
      font-size: 0.875rem;
      padding: 0.25rem 0.75rem;
      border-radius: 9999px;
      margin-bottom: 1.25rem;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    h1 {
      font-size: 1.75rem;
      font-weight: 800;
      color: #ffffff;
      margin-bottom: 1rem;
      line-height: 1.2;
    }
    p {
      color: #94a3b8;
      font-size: 1rem;
      line-height: 1.6;
      margin-bottom: 2rem;
    }
    p strong {
      color: #e2e8f0;
    }
    .footer {
      margin-top: 2rem;
      font-size: 0.8125rem;
      color: #64748b;
    }
    .footer a {
      color: #38bdf8;
      text-decoration: none;
      font-weight: 600;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="badge">404 Not Found</div>
    <h1>Site Not Found</h1>
    <p>${message}</p>
    <div class="footer">
      Powered by <a href="https://${escapeHtml2(baseDomain)}">ReplyIQ</a> &bull; Fast WhatsApp Websites
    </div>
  </div>
</body>
</html>`;
}
__name(renderNotFoundPage, "renderNotFoundPage");
function renderSuspendedPage(baseDomain, reason) {
  const safeReason = reason ? escapeHtml2(reason) : "This website has been temporarily suspended by the platform administrator.";
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Website Unavailable \u2014 ReplyIQ</title>
  <meta name="robots" content="noindex, nofollow">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      background-color: #0f172a;
      color: #f8fafc;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 1.5rem;
      text-align: center;
    }
    .container {
      max-width: 480px;
      background: #1e293b;
      border: 1px solid #e11d48;
      border-radius: 1rem;
      padding: 2.5rem 2rem;
      box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.5);
    }
    .badge {
      display: inline-block;
      background: #e11d48;
      color: #ffffff;
      font-weight: 700;
      font-size: 0.875rem;
      padding: 0.25rem 0.75rem;
      border-radius: 9999px;
      margin-bottom: 1.25rem;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    h1 {
      font-size: 1.75rem;
      font-weight: 800;
      color: #ffffff;
      margin-bottom: 1rem;
      line-height: 1.2;
    }
    p {
      color: #cbd5e1;
      font-size: 1rem;
      line-height: 1.6;
      margin-bottom: 2rem;
    }
    .notice {
      background: rgba(225, 29, 72, 0.1);
      border-left: 3px solid #e11d48;
      padding: 0.75rem 1rem;
      text-align: left;
      font-size: 0.875rem;
      color: #fda4af;
      margin-bottom: 1.5rem;
      border-radius: 0 0.5rem 0.5rem 0;
    }
    .footer {
      margin-top: 1.5rem;
      font-size: 0.8125rem;
      color: #64748b;
    }
    .footer a {
      color: #38bdf8;
      text-decoration: none;
      font-weight: 600;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="badge">403 Forbidden</div>
    <h1>Website Unavailable</h1>
    <p>This website is currently inactive or under moderation review.</p>
    <div class="notice">
      ${safeReason}
    </div>
    <div class="footer">
      Notice provided by <a href="https://${escapeHtml2(baseDomain)}">ReplyIQ</a>
    </div>
  </div>
</body>
</html>`;
}
__name(renderSuspendedPage, "renderSuspendedPage");
function renderLocalDevLandingPage(baseDomain, projects = []) {
  const safeBase = escapeHtml2(baseDomain);
  const itemsHtml = projects.length > 0 ? projects.map(
    (p) => `
      <li>
        <a href="http://${escapeHtml2(p.slug)}.${safeBase}:8787">${escapeHtml2(p.slug)}.${safeBase}:8787</a>
        <span class="tag">${escapeHtml2(p.template || "site")}</span>
      </li>`
  ).join("") : `<li><span style="color: #94a3b8;">No live sites in local D1. Run: <code>npm run sites:seed</code></span></li>`;
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>ReplyIQ Local Development</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      background-color: #0f172a;
      color: #f8fafc;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 1.5rem;
    }
    .container {
      max-width: 560px;
      width: 100%;
      background: #1e293b;
      border: 1px solid #334155;
      border-radius: 1rem;
      padding: 2rem;
      box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.5);
    }
    .badge {
      display: inline-block;
      background: #0284c7;
      color: #ffffff;
      font-weight: 700;
      font-size: 0.75rem;
      padding: 0.25rem 0.6rem;
      border-radius: 9999px;
      margin-bottom: 1rem;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    h1 {
      font-size: 1.5rem;
      font-weight: 800;
      color: #ffffff;
      margin-bottom: 0.5rem;
    }
    p {
      color: #94a3b8;
      font-size: 0.95rem;
      line-height: 1.5;
      margin-bottom: 1.5rem;
    }
    ul { list-style: none; display: flex; flex-direction: column; gap: 0.75rem; }
    li {
      background: #0f172a;
      border: 1px solid #334155;
      border-radius: 0.5rem;
      padding: 0.75rem 1rem;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    a {
      color: #38bdf8;
      text-decoration: none;
      font-weight: 600;
      font-size: 0.95rem;
    }
    a:hover { text-decoration: underline; }
    .tag {
      font-size: 0.75rem;
      background: #1e293b;
      color: #94a3b8;
      padding: 0.2rem 0.5rem;
      border-radius: 0.25rem;
      border: 1px solid #475569;
    }
    .footer {
      margin-top: 1.5rem;
      font-size: 0.8125rem;
      color: #64748b;
      text-align: center;
    }
    code {
      background: #0f172a;
      color: #38bdf8;
      padding: 0.15rem 0.4rem;
      border-radius: 0.25rem;
      font-size: 0.775rem;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="badge">Local Development Server</div>
    <h1>\u26A1 ReplyIQ Sites Worker</h1>
    <p>Sites in local D1 database. Click any live site below:</p>
    <ul>
      ${itemsHtml}
    </ul>
    <div class="footer">
      Tip: In local dev, query override also works: <code>?site=&lt;slug&gt;</code>
    </div>
  </div>
</body>
</html>`;
}
__name(renderLocalDevLandingPage, "renderLocalDevLandingPage");

// src/cache.ts
async function getEdgeCachedResponse(cacheKey) {
  try {
    if (typeof caches !== "undefined" && caches.default) {
      const cache = caches.default;
      const match = await cache.match(cacheKey);
      return match || null;
    }
  } catch {
  }
  return null;
}
__name(getEdgeCachedResponse, "getEdgeCachedResponse");
async function putEdgeCachedResponse(cacheKey, response, waitUntil) {
  try {
    if (typeof caches !== "undefined" && caches.default) {
      const cache = caches.default;
      const clonedResponse = response.clone();
      const putPromise = cache.put(cacheKey, clonedResponse);
      if (waitUntil) {
        waitUntil(putPromise);
      } else {
        await putPromise;
      }
    }
  } catch {
  }
}
__name(putEdgeCachedResponse, "putEdgeCachedResponse");

// src/index.ts
async function sha256Hex(data) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(data));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}
__name(sha256Hex, "sha256Hex");
var src_default = {
  async fetch(request, env, ctx) {
    const baseDomain = (env.BASE_DOMAIN || "localhost").toLowerCase().replace(/\.+$/, "");
    const bypassHosts = env.BYPASS_HOSTS ? env.BYPASS_HOSTS.split(",").map((h) => h.trim()) : [];
    const isDevelopment = env.ENVIRONMENT === "development";
    const allowLoopbackIp = isDevelopment && baseDomain === "localhost";
    const stagingOverrideEnabled = isDevelopment || env.ENVIRONMENT === "staging" && env.STAGING_OVERRIDE_ENABLED === "true";
    const parsedUrl = new URL(request.url);
    const hostRoute = parseHost(request.url, {
      baseDomain,
      bypassHosts,
      allowLoopbackIp,
      stagingOverrideEnabled
    });
    if (hostRoute.type === "bypass") {
      if (isDevelopment && baseDomain === "localhost") {
        let liveProjects = [];
        try {
          const res = await env.DB.prepare(
            "SELECT slug, name, template FROM projects WHERE status = 'live' AND deleted_at IS NULL ORDER BY created_at ASC"
          ).all();
          liveProjects = res.results || [];
        } catch {
        }
        return new Response(renderLocalDevLandingPage(baseDomain, liveProjects), {
          status: 200,
          headers: {
            "Content-Type": "text/html; charset=utf-8",
            "Cache-Control": "no-store"
          }
        });
      }
      return fetch(request);
    }
    if (hostRoute.type === "invalid_ip") {
      const headers = buildSecurityHeaders({
        baseDomain,
        noIndex: true,
        cacheTtlSeconds: 0,
        contentType: "text/plain; charset=utf-8"
      });
      return new Response("Invalid Host: Direct IP access forbidden", {
        status: 400,
        headers
      });
    }
    if (hostRoute.type === "nested_subdomain") {
      const html3 = renderNotFoundPage(baseDomain);
      const headers = buildSecurityHeaders({
        baseDomain,
        noIndex: true,
        cacheTtlSeconds: 10,
        contentType: "text/html; charset=utf-8"
      });
      return new Response(request.method === "HEAD" ? null : html3, {
        status: 404,
        headers
      });
    }
    if (hostRoute.type === "reserved_slug") {
      const html3 = renderNotFoundPage(baseDomain, hostRoute.slug);
      const headers = buildSecurityHeaders({
        baseDomain,
        noIndex: true,
        cacheTtlSeconds: 10,
        contentType: "text/html; charset=utf-8"
      });
      return new Response(request.method === "HEAD" ? null : html3, {
        status: 404,
        headers
      });
    }
    if (request.method !== "GET" && request.method !== "HEAD") {
      const headers = buildSecurityHeaders({
        baseDomain,
        noIndex: true,
        cacheTtlSeconds: 0,
        contentType: "text/plain; charset=utf-8"
      });
      headers["Allow"] = "GET, HEAD";
      return new Response("Method Not Allowed", {
        status: 405,
        headers
      });
    }
    if (hostRoute.type === "cdn") {
      const pathname = parsedUrl.pathname;
      if (!pathname.startsWith("/assets/")) {
        return new Response("Not Found", {
          status: 404,
          headers: buildSecurityHeaders({
            baseDomain,
            noIndex: true,
            cacheTtlSeconds: 10,
            contentType: "text/plain; charset=utf-8"
          })
        });
      }
      const rawKey = pathname.slice("/assets/".length);
      const assetKey = decodeURIComponent(rawKey);
      if (!assetKey) {
        return new Response("Not Found", {
          status: 404,
          headers: buildSecurityHeaders({
            baseDomain,
            noIndex: true,
            cacheTtlSeconds: 10,
            contentType: "text/plain; charset=utf-8"
          })
        });
      }
      const assetObj = await env.ASSETS_BUCKET.get(assetKey);
      if (!assetObj) {
        return new Response("Asset Not Found", {
          status: 404,
          headers: buildSecurityHeaders({
            baseDomain,
            noIndex: true,
            cacheTtlSeconds: 10,
            contentType: "text/plain; charset=utf-8"
          })
        });
      }
      const contentType = assetObj.httpMetadata?.contentType || "application/octet-stream";
      const headers = buildSecurityHeaders({
        baseDomain,
        cacheTtlSeconds: 31536e3,
        // 1 year immutable
        contentType
      });
      headers["Cache-Control"] = "public, max-age=31536000, immutable";
      const body = request.method === "HEAD" ? null : await assetObj.arrayBuffer();
      return new Response(body, {
        status: 200,
        headers
      });
    }
    if (hostRoute.type === "preview") {
      const token = parsedUrl.pathname.replace(/^\/+/, "").split("/")[0] || "";
      if (!token || token.length < 16) {
        const html3 = renderNotFoundPage(baseDomain);
        return new Response(request.method === "HEAD" ? null : html3, {
          status: 404,
          headers: buildSecurityHeaders({
            baseDomain,
            isPrivate: true,
            noIndex: true,
            contentType: "text/html; charset=utf-8"
          })
        });
      }
      const tokenHash = await sha256Hex(token);
      const row = await env.DB.prepare(
        `SELECT p.id as project_id, p.slug, pt.version_number, pt.expires_at, dv.document_json
         FROM preview_tokens pt
         JOIN projects p ON pt.project_id = p.id
         JOIN document_versions dv ON pt.project_id = dv.project_id AND pt.version_number = dv.version_number
         WHERE pt.token_hash = ?`
      ).bind(tokenHash).first();
      if (!row || row.expires_at <= Date.now()) {
        const html3 = renderNotFoundPage(baseDomain);
        return new Response(request.method === "HEAD" ? null : html3, {
          status: 404,
          headers: buildSecurityHeaders({
            baseDomain,
            isPrivate: true,
            noIndex: true,
            contentType: "text/html; charset=utf-8"
          })
        });
      }
      let doc;
      try {
        doc = JSON.parse(row.document_json);
      } catch {
        return new Response("Corrupted preview document", { status: 500 });
      }
      const cdnBase = `https://cdn.${baseDomain}`;
      const assetResolver = /* @__PURE__ */ __name((id) => ({
        url: `${cdnBase}/assets/${id}`,
        width: 800,
        height: 600
      }), "assetResolver");
      const renderResult = renderSite(doc, {
        mode: "preview",
        canonicalUrl: `https://${row.slug}.${baseDomain}`,
        assetResolver,
        showBranding: true
      });
      if (!renderResult.ok) {
        return new Response("Preview rendering failed", { status: 500 });
      }
      const headers = buildSecurityHeaders({
        baseDomain,
        isPrivate: true,
        noIndex: true,
        contentType: "text/html; charset=utf-8"
      });
      return new Response(request.method === "HEAD" ? null : renderResult.html, {
        status: 200,
        headers
      });
    }
    if (hostRoute.type === "site") {
      const pathname = parsedUrl.pathname;
      const isStagingPath = stagingOverrideEnabled && pathname.startsWith(`/site/${hostRoute.slug}`);
      if (pathname !== "/" && !isStagingPath) {
        const html3 = renderNotFoundPage(baseDomain, hostRoute.slug);
        return new Response(request.method === "HEAD" ? null : html3, {
          status: 404,
          headers: buildSecurityHeaders({
            baseDomain,
            noIndex: true,
            cacheTtlSeconds: 10,
            contentType: "text/html; charset=utf-8"
          })
        });
      }
      const cached = await getEdgeCachedResponse(request);
      if (cached) {
        return cached;
      }
      const project = await env.DB.prepare(
        "SELECT id, slug, status, published_version, suspended_reason FROM projects WHERE slug = ? AND deleted_at IS NULL"
      ).bind(hostRoute.slug).first();
      if (!project || project.status === "draft" || project.published_version === null) {
        const html3 = renderNotFoundPage(baseDomain, hostRoute.slug);
        return new Response(request.method === "HEAD" ? null : html3, {
          status: 404,
          headers: buildSecurityHeaders({
            baseDomain,
            noIndex: true,
            cacheTtlSeconds: 10,
            contentType: "text/html; charset=utf-8"
          })
        });
      }
      if (project.status === "suspended") {
        const html3 = renderSuspendedPage(baseDomain, project.suspended_reason);
        return new Response(request.method === "HEAD" ? null : html3, {
          status: 403,
          headers: buildSecurityHeaders({
            baseDomain,
            noIndex: true,
            cacheTtlSeconds: 10,
            contentType: "text/html; charset=utf-8"
          })
        });
      }
      const r2Key = `sites/${project.id}/${project.published_version}.html`;
      const htmlObj = await env.SITES_BUCKET.get(r2Key);
      if (!htmlObj) {
        const html3 = renderNotFoundPage(baseDomain, hostRoute.slug);
        return new Response(request.method === "HEAD" ? null : html3, {
          status: 404,
          headers: buildSecurityHeaders({
            baseDomain,
            noIndex: true,
            cacheTtlSeconds: 10,
            contentType: "text/html; charset=utf-8"
          })
        });
      }
      const htmlContent = await htmlObj.text();
      const headers = buildSecurityHeaders({
        baseDomain,
        cacheTtlSeconds: 60,
        contentType: "text/html; charset=utf-8"
      });
      const response = new Response(request.method === "HEAD" ? null : htmlContent, {
        status: 200,
        headers
      });
      await putEdgeCachedResponse(
        request,
        response,
        ctx?.waitUntil?.bind(ctx)
      );
      return response;
    }
    const html2 = renderNotFoundPage(baseDomain);
    return new Response(request.method === "HEAD" ? null : html2, {
      status: 404,
      headers: buildSecurityHeaders({
        baseDomain,
        noIndex: true,
        cacheTtlSeconds: 10,
        contentType: "text/html; charset=utf-8"
      })
    });
  }
};

// ../../node_modules/wrangler/templates/middleware/middleware-ensure-req-body-drained.ts
var drainBody = /* @__PURE__ */ __name(async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } finally {
    try {
      if (request.body !== null && !request.bodyUsed) {
        const reader = request.body.getReader();
        while (!(await reader.read()).done) {
        }
      }
    } catch (e) {
      console.error("Failed to drain the unused request body.", e);
    }
  }
}, "drainBody");
var middleware_ensure_req_body_drained_default = drainBody;

// ../../node_modules/wrangler/templates/middleware/middleware-miniflare3-json-error.ts
function reduceError(e) {
  return {
    name: e?.name,
    message: e?.message ?? String(e),
    stack: e?.stack,
    cause: e?.cause === void 0 ? void 0 : reduceError(e.cause)
  };
}
__name(reduceError, "reduceError");
var jsonError = /* @__PURE__ */ __name(async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } catch (e) {
    const error = reduceError(e);
    const body = JSON.stringify(error);
    const headers = {
      "Content-Type": "application/json",
      "MF-Experimental-Error-Stack": "true"
    };
    const encoded = encodeURIComponent(body);
    if (encoded.length <= 8192) {
      headers["MF-Experimental-Error-Stack-Payload"] = encoded;
    }
    return new Response(body, { status: 500, headers });
  }
}, "jsonError");
var middleware_miniflare3_json_error_default = jsonError;

// .wrangler/tmp/bundle-SI07VK/middleware-insertion-facade.js
var __INTERNAL_WRANGLER_MIDDLEWARE__ = [
  middleware_ensure_req_body_drained_default,
  middleware_miniflare3_json_error_default
];
var middleware_insertion_facade_default = src_default;

// ../../node_modules/wrangler/templates/middleware/common.ts
var __facade_middleware__ = [];
function __facade_register__(...args) {
  __facade_middleware__.push(...args.flat());
}
__name(__facade_register__, "__facade_register__");
function __facade_invokeChain__(request, env, ctx, dispatch, middlewareChain) {
  const [head, ...tail] = middlewareChain;
  const middlewareCtx = {
    dispatch,
    next(newRequest, newEnv) {
      return __facade_invokeChain__(newRequest, newEnv, ctx, dispatch, tail);
    }
  };
  return head(request, env, ctx, middlewareCtx);
}
__name(__facade_invokeChain__, "__facade_invokeChain__");
function __facade_invoke__(request, env, ctx, dispatch, finalMiddleware) {
  return __facade_invokeChain__(request, env, ctx, dispatch, [
    ...__facade_middleware__,
    finalMiddleware
  ]);
}
__name(__facade_invoke__, "__facade_invoke__");

// .wrangler/tmp/bundle-SI07VK/middleware-loader.entry.ts
var __Facade_ScheduledController__ = class ___Facade_ScheduledController__ {
  constructor(scheduledTime, cron, noRetry) {
    this.scheduledTime = scheduledTime;
    this.cron = cron;
    this.#noRetry = noRetry;
  }
  scheduledTime;
  cron;
  static {
    __name(this, "__Facade_ScheduledController__");
  }
  #noRetry;
  noRetry() {
    if (!(this instanceof ___Facade_ScheduledController__)) {
      throw new TypeError("Illegal invocation");
    }
    this.#noRetry();
  }
};
function wrapExportedHandler(worker) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return worker;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  const fetchDispatcher = /* @__PURE__ */ __name(function(request, env, ctx) {
    if (worker.fetch === void 0) {
      throw new Error("Handler does not export a fetch() function.");
    }
    return worker.fetch(request, env, ctx);
  }, "fetchDispatcher");
  return {
    ...worker,
    fetch(request, env, ctx) {
      const dispatcher = /* @__PURE__ */ __name(function(type, init) {
        if (type === "scheduled" && worker.scheduled !== void 0) {
          const controller = new __Facade_ScheduledController__(
            Date.now(),
            init.cron ?? "",
            () => {
            }
          );
          return worker.scheduled(controller, env, ctx);
        }
      }, "dispatcher");
      return __facade_invoke__(request, env, ctx, dispatcher, fetchDispatcher);
    }
  };
}
__name(wrapExportedHandler, "wrapExportedHandler");
function wrapWorkerEntrypoint(klass) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return klass;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  return class extends klass {
    #fetchDispatcher = /* @__PURE__ */ __name((request, env, ctx) => {
      this.env = env;
      this.ctx = ctx;
      if (super.fetch === void 0) {
        throw new Error("Entrypoint class does not define a fetch() function.");
      }
      return super.fetch(request);
    }, "#fetchDispatcher");
    #dispatcher = /* @__PURE__ */ __name((type, init) => {
      if (type === "scheduled" && super.scheduled !== void 0) {
        const controller = new __Facade_ScheduledController__(
          Date.now(),
          init.cron ?? "",
          () => {
          }
        );
        return super.scheduled(controller);
      }
    }, "#dispatcher");
    fetch(request) {
      return __facade_invoke__(
        request,
        this.env,
        this.ctx,
        this.#dispatcher,
        this.#fetchDispatcher
      );
    }
  };
}
__name(wrapWorkerEntrypoint, "wrapWorkerEntrypoint");
var WRAPPED_ENTRY;
if (typeof middleware_insertion_facade_default === "object") {
  WRAPPED_ENTRY = wrapExportedHandler(middleware_insertion_facade_default);
} else if (typeof middleware_insertion_facade_default === "function") {
  WRAPPED_ENTRY = wrapWorkerEntrypoint(middleware_insertion_facade_default);
}
var middleware_loader_entry_default = WRAPPED_ENTRY;
export {
  __INTERNAL_WRANGLER_MIDDLEWARE__,
  middleware_loader_entry_default as default
};
//# sourceMappingURL=index.js.map
