try {
  this["Module"] = Module;
} catch (e) {
  this["Module"] = Module = {};
}

var ENVIRONMENT_IS_NODE = typeof process === "object";

var ENVIRONMENT_IS_WEB = typeof window === "object";

var ENVIRONMENT_IS_WORKER = typeof importScripts === "function";

var ENVIRONMENT_IS_SHELL = !ENVIRONMENT_IS_WEB && !ENVIRONMENT_IS_NODE && !ENVIRONMENT_IS_WORKER;

if (ENVIRONMENT_IS_NODE) {
  Module["print"] = (function(x) {
    process["stdout"].write(x + "\n");
  });
  Module["printErr"] = (function(x) {
    process["stderr"].write(x + "\n");
  });
  var nodeFS = require("fs");
  var nodePath = require("path");
  Module["read"] = (function(filename) {
    filename = nodePath["normalize"](filename);
    var ret = nodeFS["readFileSync"](filename).toString();
    if (!ret && filename != nodePath["resolve"](filename)) {
      filename = path.join(__dirname, "..", "src", filename);
      ret = nodeFS["readFileSync"](filename).toString();
    }
    return ret;
  });
  Module["load"] = (function(f) {
    globalEval(read(f));
  });
  if (!Module["arguments"]) {
    Module["arguments"] = process["argv"].slice(2);
  }
} else if (ENVIRONMENT_IS_SHELL) {
  Module["print"] = print;
  Module["printErr"] = printErr;
  if (typeof read != "undefined") {
    Module["read"] = read;
  } else {
    Module["read"] = (function(f) {
      snarf(f);
    });
  }
  if (!Module["arguments"]) {
    if (typeof scriptArgs != "undefined") {
      Module["arguments"] = scriptArgs;
    } else if (typeof arguments != "undefined") {
      Module["arguments"] = arguments;
    }
  }
} else if (ENVIRONMENT_IS_WEB) {
  if (!Module["print"]) {
    Module["print"] = (function(x) {
      console.log(x);
    });
  }
  if (!Module["printErr"]) {
    Module["printErr"] = (function(x) {
      console.log(x);
    });
  }
  Module["read"] = (function(url) {
    var xhr = new XMLHttpRequest;
    xhr.open("GET", url, false);
    xhr.send(null);
    return xhr.responseText;
  });
  if (!Module["arguments"]) {
    if (typeof arguments != "undefined") {
      Module["arguments"] = arguments;
    }
  }
} else if (ENVIRONMENT_IS_WORKER) {
  Module["load"] = importScripts;
} else {
  throw "Unknown runtime environment. Where are we?";
}

function globalEval(x) {
  eval.call(null, x);
}

if (!Module["load"] == "undefined" && Module["read"]) {
  Module["load"] = (function(f) {
    globalEval(Module["read"](f));
  });
}

if (!Module["printErr"]) {
  Module["printErr"] = (function() {});
}

if (!Module["print"]) {
  Module["print"] = Module["printErr"];
}

if (!Module["arguments"]) {
  Module["arguments"] = [];
}

Module.print = Module["print"];

Module.printErr = Module["printErr"];

if (!Module["preRun"]) Module["preRun"] = [];

if (!Module["postRun"]) Module["postRun"] = [];

var Runtime = {
  stackSave: (function() {
    return STACKTOP;
  }),
  stackRestore: (function(stackTop) {
    STACKTOP = stackTop;
  }),
  forceAlign: (function(target, quantum) {
    quantum = quantum || 4;
    if (quantum == 1) return target;
    if (isNumber(target) && isNumber(quantum)) {
      return Math.ceil(target / quantum) * quantum;
    } else if (isNumber(quantum) && isPowerOfTwo(quantum)) {
      var logg = log2(quantum);
      return "((((" + target + ")+" + (quantum - 1) + ")>>" + logg + ")<<" + logg + ")";
    }
    return "Math.ceil((" + target + ")/" + quantum + ")*" + quantum;
  }),
  isNumberType: (function(type) {
    return type in Runtime.INT_TYPES || type in Runtime.FLOAT_TYPES;
  }),
  isPointerType: function isPointerType(type) {
    return type[type.length - 1] == "*";
  },
  isStructType: function isStructType(type) {
    if (isPointerType(type)) return false;
    if (/^\[\d+\ x\ (.*)\]/.test(type)) return true;
    if (/<?{ ?[^}]* ?}>?/.test(type)) return true;
    return type[0] == "%";
  },
  INT_TYPES: {
    "i1": 0,
    "i8": 0,
    "i16": 0,
    "i32": 0,
    "i64": 0
  },
  FLOAT_TYPES: {
    "float": 0,
    "double": 0
  },
  bitshift64: (function(low, high, op, bits) {
    var ander = Math.pow(2, bits) - 1;
    if (bits < 32) {
      switch (op) {
       case "shl":
        return [ low << bits, high << bits | (low & ander << 32 - bits) >>> 32 - bits ];
       case "ashr":
        return [ (low >>> bits | (high & ander) << 32 - bits) >> 0 >>> 0, high >> bits >>> 0 ];
       case "lshr":
        return [ (low >>> bits | (high & ander) << 32 - bits) >>> 0, high >>> bits ];
      }
    } else if (bits == 32) {
      switch (op) {
       case "shl":
        return [ 0, low ];
       case "ashr":
        return [ high, (high | 0) < 0 ? ander : 0 ];
       case "lshr":
        return [ high, 0 ];
      }
    } else {
      switch (op) {
       case "shl":
        return [ 0, low << bits - 32 ];
       case "ashr":
        return [ high >> bits - 32 >>> 0, (high | 0) < 0 ? ander : 0 ];
       case "lshr":
        return [ high >>> bits - 32, 0 ];
      }
    }
    abort("unknown bitshift64 op: " + [ value, op, bits ]);
  }),
  or64: (function(x, y) {
    var l = x | 0 | (y | 0);
    var h = (Math.round(x / 4294967296) | Math.round(y / 4294967296)) * 4294967296;
    return l + h;
  }),
  and64: (function(x, y) {
    var l = (x | 0) & (y | 0);
    var h = (Math.round(x / 4294967296) & Math.round(y / 4294967296)) * 4294967296;
    return l + h;
  }),
  xor64: (function(x, y) {
    var l = (x | 0) ^ (y | 0);
    var h = (Math.round(x / 4294967296) ^ Math.round(y / 4294967296)) * 4294967296;
    return l + h;
  }),
  getNativeTypeSize: (function(type, quantumSize) {
    if (Runtime.QUANTUM_SIZE == 1) return 1;
    var size = {
      "%i1": 1,
      "%i8": 1,
      "%i16": 2,
      "%i32": 4,
      "%i64": 8,
      "%float": 4,
      "%double": 8
    }["%" + type];
    if (!size) {
      if (type[type.length - 1] == "*") {
        size = Runtime.QUANTUM_SIZE;
      } else if (type[0] == "i") {
        var bits = parseInt(type.substr(1));
        assert(bits % 8 == 0);
        size = bits / 8;
      }
    }
    return size;
  }),
  getNativeFieldSize: (function(type) {
    return Math.max(Runtime.getNativeTypeSize(type), Runtime.QUANTUM_SIZE);
  }),
  dedup: function dedup(items, ident) {
    var seen = {};
    if (ident) {
      return items.filter((function(item) {
        if (seen[item[ident]]) return false;
        seen[item[ident]] = true;
        return true;
      }));
    } else {
      return items.filter((function(item) {
        if (seen[item]) return false;
        seen[item] = true;
        return true;
      }));
    }
  },
  set: function set() {
    var args = typeof arguments[0] === "object" ? arguments[0] : arguments;
    var ret = {};
    for (var i = 0; i < args.length; i++) {
      ret[args[i]] = 0;
    }
    return ret;
  },
  calculateStructAlignment: function calculateStructAlignment(type) {
    type.flatSize = 0;
    type.alignSize = 0;
    var diffs = [];
    var prev = -1;
    type.flatIndexes = type.fields.map((function(field) {
      var size, alignSize;
      if (Runtime.isNumberType(field) || Runtime.isPointerType(field)) {
        size = Runtime.getNativeTypeSize(field);
        alignSize = size;
      } else if (Runtime.isStructType(field)) {
        size = Types.types[field].flatSize;
        alignSize = Types.types[field].alignSize;
      } else {
        throw "Unclear type in struct: " + field + ", in " + type.name_ + " :: " + dump(Types.types[type.name_]);
      }
      alignSize = type.packed ? 1 : Math.min(alignSize, Runtime.QUANTUM_SIZE);
      type.alignSize = Math.max(type.alignSize, alignSize);
      var curr = Runtime.alignMemory(type.flatSize, alignSize);
      type.flatSize = curr + size;
      if (prev >= 0) {
        diffs.push(curr - prev);
      }
      prev = curr;
      return curr;
    }));
    type.flatSize = Runtime.alignMemory(type.flatSize, type.alignSize);
    if (diffs.length == 0) {
      type.flatFactor = type.flatSize;
    } else if (Runtime.dedup(diffs).length == 1) {
      type.flatFactor = diffs[0];
    }
    type.needsFlattening = type.flatFactor != 1;
    return type.flatIndexes;
  },
  generateStructInfo: (function(struct, typeName, offset) {
    var type, alignment;
    if (typeName) {
      offset = offset || 0;
      type = (typeof Types === "undefined" ? Runtime.typeInfo : Types.types)[typeName];
      if (!type) return null;
      assert(type.fields.length === struct.length, "Number of named fields must match the type for " + typeName);
      alignment = type.flatIndexes;
    } else {
      var type = {
        fields: struct.map((function(item) {
          return item[0];
        }))
      };
      alignment = Runtime.calculateStructAlignment(type);
    }
    var ret = {
      __size__: type.flatSize
    };
    if (typeName) {
      struct.forEach((function(item, i) {
        if (typeof item === "string") {
          ret[item] = alignment[i] + offset;
        } else {
          var key;
          for (var k in item) key = k;
          ret[key] = Runtime.generateStructInfo(item[key], type.fields[i], alignment[i]);
        }
      }));
    } else {
      struct.forEach((function(item, i) {
        ret[item[1]] = alignment[i];
      }));
    }
    return ret;
  }),
  addFunction: (function(func) {
    var ret = FUNCTION_TABLE.length;
    FUNCTION_TABLE.push(func);
    FUNCTION_TABLE.push(0);
    return ret;
  }),
  warnOnce: (function(text) {
    if (!Runtime.warnOnce.shown) Runtime.warnOnce.shown = {};
    if (!Runtime.warnOnce.shown[text]) {
      Runtime.warnOnce.shown[text] = 1;
      Module.printErr(text);
    }
  }),
  funcWrappers: {},
  getFuncWrapper: (function(func) {
    if (!Runtime.funcWrappers[func]) {
      Runtime.funcWrappers[func] = (function() {
        FUNCTION_TABLE[func].apply(null, arguments);
      });
    }
    return Runtime.funcWrappers[func];
  }),
  stackAlloc: function stackAlloc(size) {
    var ret = STACKTOP;
    STACKTOP += size;
    STACKTOP = STACKTOP + 3 >> 2 << 2;
    return ret;
  },
  staticAlloc: function staticAlloc(size) {
    var ret = STATICTOP;
    STATICTOP += size;
    STATICTOP = STATICTOP + 3 >> 2 << 2;
    if (STATICTOP >= TOTAL_MEMORY) enlargeMemory();
    return ret;
  },
  alignMemory: function alignMemory(size, quantum) {
    var ret = size = Math.ceil(size / (quantum ? quantum : 4)) * (quantum ? quantum : 4);
    return ret;
  },
  makeBigInt: function makeBigInt(low, high, unsigned) {
    var ret = unsigned ? (low >>> 0) + (high >>> 0) * 4294967296 : (low >>> 0) + (high | 0) * 4294967296;
    return ret;
  },
  QUANTUM_SIZE: 4,
  __dummy__: 0
};

var CorrectionsMonitor = {
  MAX_ALLOWED: 0,
  corrections: 0,
  sigs: {},
  note: (function(type, succeed, sig) {
    if (!succeed) {
      this.corrections++;
      if (this.corrections >= this.MAX_ALLOWED) abort("\n\nToo many corrections!");
    }
  }),
  print: (function() {})
};

var __THREW__ = false;

var ABORT = false;

var undef = 0;

var tempValue, tempInt, tempBigInt, tempInt2, tempBigInt2, tempPair, tempBigIntI, tempBigIntR, tempBigIntS, tempBigIntP, tempBigIntD;

var tempI64, tempI64b;

function abort(text) {
  Module.print(text + ":\n" + (new Error).stack);
  ABORT = true;
  throw "Assertion: " + text;
}

function assert(condition, text) {
  if (!condition) {
    abort("Assertion failed: " + text);
  }
}

var globalScope = this;

function ccall(ident, returnType, argTypes, args) {
  var stack = 0;
  function toC(value, type) {
    if (type == "string") {
      if (value === null || value === undefined || value === 0) return 0;
      if (!stack) stack = Runtime.stackSave();
      var ret = Runtime.stackAlloc(value.length + 1);
      writeStringToMemory(value, ret);
      return ret;
    } else if (type == "array") {
      if (!stack) stack = Runtime.stackSave();
      var ret = Runtime.stackAlloc(value.length);
      writeArrayToMemory(value, ret);
      return ret;
    }
    return value;
  }
  function fromC(value, type) {
    if (type == "string") {
      return Pointer_stringify(value);
    }
    assert(type != "array");
    return value;
  }
  try {
    var func = eval("_" + ident);
  } catch (e) {
    try {
      func = globalScope["Module"]["_" + ident];
    } catch (e) {}
  }
  assert(func, "Cannot call unknown function " + ident + " (perhaps LLVM optimizations or closure removed it?)");
  var i = 0;
  var cArgs = args ? args.map((function(arg) {
    return toC(arg, argTypes[i++]);
  })) : [];
  var ret = fromC(func.apply(null, cArgs), returnType);
  if (stack) Runtime.stackRestore(stack);
  return ret;
}

Module["ccall"] = ccall;

function cwrap(ident, returnType, argTypes) {
  return (function() {
    return ccall(ident, returnType, argTypes, Array.prototype.slice.call(arguments));
  });
}

Module["cwrap"] = cwrap;

function setValue(ptr, value, type, noSafe) {
  type = type || "i8";
  if (type[type.length - 1] === "*") type = "i32";
  switch (type) {
   case "i1":
    HEAP8[ptr] = value;
    break;
   case "i8":
    HEAP8[ptr] = value;
    break;
   case "i16":
    HEAP16[ptr >> 1] = value;
    break;
   case "i32":
    HEAP32[ptr >> 2] = value;
    break;
   case "i64":
    HEAP32[ptr >> 2] = value;
    break;
   case "float":
    HEAPF32[ptr >> 2] = value;
    break;
   case "double":
    tempDoubleF64[0] = value, HEAP32[ptr >> 2] = tempDoubleI32[0], HEAP32[ptr + 4 >> 2] = tempDoubleI32[1];
    break;
   default:
    abort("invalid type for setValue: " + type);
  }
}

Module["setValue"] = setValue;

function getValue(ptr, type, noSafe) {
  type = type || "i8";
  if (type[type.length - 1] === "*") type = "i32";
  switch (type) {
   case "i1":
    return HEAP8[ptr];
   case "i8":
    return HEAP8[ptr];
   case "i16":
    return HEAP16[ptr >> 1];
   case "i32":
    return HEAP32[ptr >> 2];
   case "i64":
    return HEAP32[ptr >> 2];
   case "float":
    return HEAPF32[ptr >> 2];
   case "double":
    return tempDoubleI32[0] = HEAP32[ptr >> 2], tempDoubleI32[1] = HEAP32[ptr + 4 >> 2], tempDoubleF64[0];
   default:
    abort("invalid type for setValue: " + type);
  }
  return null;
}

Module["getValue"] = getValue;

var ALLOC_NORMAL = 0;

var ALLOC_STACK = 1;

var ALLOC_STATIC = 2;

Module["ALLOC_NORMAL"] = ALLOC_NORMAL;

Module["ALLOC_STACK"] = ALLOC_STACK;

Module["ALLOC_STATIC"] = ALLOC_STATIC;

function allocate(slab, types, allocator) {
  var zeroinit, size;
  if (typeof slab === "number") {
    zeroinit = true;
    size = slab;
  } else {
    zeroinit = false;
    size = slab.length;
  }
  var singleType = typeof types === "string" ? types : null;
  var ret = [ _malloc, Runtime.stackAlloc, Runtime.staticAlloc ][allocator === undefined ? ALLOC_STATIC : allocator](Math.max(size, singleType ? 1 : types.length));
  if (zeroinit) {
    _memset(ret, 0, size);
    return ret;
  }
  var i = 0, type;
  while (i < size) {
    var curr = slab[i];
    if (typeof curr === "function") {
      curr = Runtime.getFunctionIndex(curr);
    }
    type = singleType || types[i];
    if (type === 0) {
      i++;
      continue;
    }
    if (type == "i64") type = "i32";
    setValue(ret + i, curr, type);
    i += Runtime.getNativeTypeSize(type);
  }
  return ret;
}

Module["allocate"] = allocate;

function Pointer_stringify(ptr, length) {
  var nullTerminated = typeof length == "undefined";
  var ret = "";
  var i = 0;
  var t;
  var nullByte = String.fromCharCode(0);
  while (1) {
    t = String.fromCharCode(HEAPU8[ptr + i]);
    if (nullTerminated && t == nullByte) {
      break;
    } else {}
    ret += t;
    i += 1;
    if (!nullTerminated && i == length) {
      break;
    }
  }
  return ret;
}

Module["Pointer_stringify"] = Pointer_stringify;

function Array_stringify(array) {
  var ret = "";
  for (var i = 0; i < array.length; i++) {
    ret += String.fromCharCode(array[i]);
  }
  return ret;
}

Module["Array_stringify"] = Array_stringify;

var FUNCTION_TABLE;

var PAGE_SIZE = 4096;

function alignMemoryPage(x) {
  return x + 4095 >> 12 << 12;
}

var HEAP;

var HEAP8, HEAPU8, HEAP16, HEAPU16, HEAP32, HEAPU32, HEAPF32, HEAPF64;

var STACK_ROOT, STACKTOP, STACK_MAX;

var STATICTOP;

function enlargeMemory() {
  while (TOTAL_MEMORY <= STATICTOP) {
    TOTAL_MEMORY = alignMemoryPage(2 * TOTAL_MEMORY);
  }
  var oldHEAP8 = HEAP8;
  var buffer = new ArrayBuffer(TOTAL_MEMORY);
  HEAP8 = new Int8Array(buffer);
  HEAP16 = new Int16Array(buffer);
  HEAP32 = new Int32Array(buffer);
  HEAPU8 = new Uint8Array(buffer);
  HEAPU16 = new Uint16Array(buffer);
  HEAPU32 = new Uint32Array(buffer);
  HEAPF32 = new Float32Array(buffer);
  HEAPF64 = new Float64Array(buffer);
  HEAP8.set(oldHEAP8);
}

var TOTAL_STACK = Module["TOTAL_STACK"] || 5242880;

var TOTAL_MEMORY = Module["TOTAL_MEMORY"] || 10485760;

var FAST_MEMORY = Module["FAST_MEMORY"] || 2097152;

assert(!!Int32Array && !!Float64Array && !!(new Int32Array(1))["subarray"] && !!(new Int32Array(1))["set"], "Cannot fallback to non-typed array case: Code is too specialized");

var buffer = new ArrayBuffer(TOTAL_MEMORY);

HEAP8 = new Int8Array(buffer);

HEAP16 = new Int16Array(buffer);

HEAP32 = new Int32Array(buffer);

HEAPU8 = new Uint8Array(buffer);

HEAPU16 = new Uint16Array(buffer);

HEAPU32 = new Uint32Array(buffer);

HEAPF32 = new Float32Array(buffer);

HEAPF64 = new Float64Array(buffer);

HEAP32[0] = 255;

assert(HEAPU8[0] === 255 && HEAPU8[3] === 0, "Typed arrays 2 must be run on a little-endian system");

var base = intArrayFromString("(null)");

STATICTOP = base.length;

for (var i = 0; i < base.length; i++) {
  HEAP8[i] = base[i];
}

Module["HEAP"] = HEAP;

Module["HEAP8"] = HEAP8;

Module["HEAP16"] = HEAP16;

Module["HEAP32"] = HEAP32;

Module["HEAPU8"] = HEAPU8;

Module["HEAPU16"] = HEAPU16;

Module["HEAPU32"] = HEAPU32;

Module["HEAPF32"] = HEAPF32;

Module["HEAPF64"] = HEAPF64;

STACK_ROOT = STACKTOP = Runtime.alignMemory(STATICTOP);

STACK_MAX = STACK_ROOT + TOTAL_STACK;

var tempDoublePtr = Runtime.alignMemory(STACK_MAX, 8);

var tempDoubleI8 = HEAP8.subarray(tempDoublePtr);

var tempDoubleI32 = HEAP32.subarray(tempDoublePtr >> 2);

var tempDoubleF32 = HEAPF32.subarray(tempDoublePtr >> 2);

var tempDoubleF64 = HEAPF64.subarray(tempDoublePtr >> 3);

function copyTempFloat(ptr) {
  tempDoubleI8[0] = HEAP8[ptr];
  tempDoubleI8[1] = HEAP8[ptr + 1];
  tempDoubleI8[2] = HEAP8[ptr + 2];
  tempDoubleI8[3] = HEAP8[ptr + 3];
}

function copyTempDouble(ptr) {
  tempDoubleI8[0] = HEAP8[ptr];
  tempDoubleI8[1] = HEAP8[ptr + 1];
  tempDoubleI8[2] = HEAP8[ptr + 2];
  tempDoubleI8[3] = HEAP8[ptr + 3];
  tempDoubleI8[4] = HEAP8[ptr + 4];
  tempDoubleI8[5] = HEAP8[ptr + 5];
  tempDoubleI8[6] = HEAP8[ptr + 6];
  tempDoubleI8[7] = HEAP8[ptr + 7];
}

STACK_MAX = tempDoublePtr + 8;

STATICTOP = alignMemoryPage(STACK_MAX);

function callRuntimeCallbacks(callbacks) {
  while (callbacks.length > 0) {
    var callback = callbacks.shift();
    var func = callback.func;
    if (typeof func === "number") {
      func = FUNCTION_TABLE[func];
    }
    func(callback.arg === undefined ? null : callback.arg);
  }
}

var __ATINIT__ = [];

var __ATMAIN__ = [];

var __ATEXIT__ = [];

function initRuntime() {
  callRuntimeCallbacks(__ATINIT__);
}

function preMain() {
  callRuntimeCallbacks(__ATMAIN__);
}

function exitRuntime() {
  callRuntimeCallbacks(__ATEXIT__);
  CorrectionsMonitor.print();
}

function String_len(ptr) {
  var i = 0;
  while (HEAP8[ptr + i]) i++;
  return i;
}

Module["String_len"] = String_len;

function intArrayFromString(stringy, dontAddNull, length) {
  var ret = [];
  var t;
  var i = 0;
  if (length === undefined) {
    length = stringy.length;
  }
  while (i < length) {
    var chr = stringy.charCodeAt(i);
    if (chr > 255) {
      chr &= 255;
    }
    ret.push(chr);
    i = i + 1;
  }
  if (!dontAddNull) {
    ret.push(0);
  }
  return ret;
}

Module["intArrayFromString"] = intArrayFromString;

function intArrayToString(array) {
  var ret = [];
  for (var i = 0; i < array.length; i++) {
    var chr = array[i];
    if (chr > 255) {
      chr &= 255;
    }
    ret.push(String.fromCharCode(chr));
  }
  return ret.join("");
}

Module["intArrayToString"] = intArrayToString;

function writeStringToMemory(string, buffer, dontAddNull) {
  var i = 0;
  while (i < string.length) {
    var chr = string.charCodeAt(i);
    if (chr > 255) {
      chr &= 255;
    }
    HEAP8[buffer + i] = chr;
    i = i + 1;
  }
  if (!dontAddNull) {
    HEAP8[buffer + i] = 0;
  }
}

Module["writeStringToMemory"] = writeStringToMemory;

function writeArrayToMemory(array, buffer) {
  for (var i = 0; i < array.length; i++) {
    HEAP8[buffer + i] = array[i];
  }
}

Module["writeArrayToMemory"] = writeArrayToMemory;

var STRING_TABLE = [];

function unSign(value, bits, ignore, sig) {
  if (value >= 0) {
    return value;
  }
  return bits <= 32 ? 2 * Math.abs(1 << bits - 1) + value : Math.pow(2, bits) + value;
}

function reSign(value, bits, ignore, sig) {
  if (value <= 0) {
    return value;
  }
  var half = bits <= 32 ? Math.abs(1 << bits - 1) : Math.pow(2, bits - 1);
  if (value >= half && (bits <= 32 || value > half)) {
    value = -2 * half + value;
  }
  return value;
}

var runDependencies = 0;

function addRunDependency() {
  runDependencies++;
  if (Module["monitorRunDependencies"]) {
    Module["monitorRunDependencies"](runDependencies);
  }
}

Module["addRunDependency"] = addRunDependency;

function removeRunDependency() {
  runDependencies--;
  if (Module["monitorRunDependencies"]) {
    Module["monitorRunDependencies"](runDependencies);
  }
  if (runDependencies == 0) run();
}

Module["removeRunDependency"] = removeRunDependency;

function __Z5b2MinIiET_S0_S0_($a, $b) {
  var $2 = ($a | 0) < ($b | 0) ? $a : $b;
  return $2;
  return null;
}

function __Z5b2MaxIiET_S0_S0_($a, $b) {
  var $2 = ($a | 0) > ($b | 0) ? $a : $b;
  return $2;
  return null;
}

function __ZN12b2BroadPhase12UnBufferMoveEi($this, $proxyId) {
  var $2 = HEAP32[$this + 40 >> 2];
  var $3 = $this + 32 | 0;
  var $i_0 = 0;
  while (1) {
    var $i_0;
    if (($i_0 | 0) >= ($2 | 0)) {
      break;
    }
    var $8 = ($i_0 << 2) + HEAP32[$3 >> 2] | 0;
    if ((HEAP32[$8 >> 2] | 0) == ($proxyId | 0)) {
      HEAP32[$8 >> 2] = -1;
      break;
    }
    var $i_0 = $i_0 + 1 | 0;
  }
  return;
  return;
}

function __ZN12b2BroadPhaseC1Ev($this) {
  __ZN12b2BroadPhaseC2Ev($this);
  return;
  return;
}

function __ZN12b2BroadPhaseD1Ev($this) {
  __ZN12b2BroadPhaseD2Ev($this);
  return;
  return;
}

function __ZN12b2BroadPhase11CreateProxyERK6b2AABBPv($this, $aabb, $userData) {
  var $1 = $this | 0;
  var $2 = __ZN13b2DynamicTree11CreateProxyERK6b2AABBPv($1, $aabb, $userData);
  var $3 = $this + 28 | 0;
  var $5 = HEAP32[$3 >> 2] + 1 | 0;
  HEAP32[$3 >> 2] = $5;
  __ZN12b2BroadPhase10BufferMoveEi($this, $2);
  return $2;
  return null;
}

function __ZN12b2BroadPhase10BufferMoveEi($this, $proxyId) {
  var $6$s2;
  var $1$s2;
  var $1$s2 = ($this + 40 | 0) >> 2;
  var $2 = HEAP32[$1$s2];
  var $3 = $this + 36 | 0;
  var $4 = HEAP32[$3 >> 2];
  var $6$s2 = ($this + 32 | 0) >> 2;
  if (($2 | 0) == ($4 | 0)) {
    var $8 = HEAP32[$6$s2];
    var $9 = $4 << 1;
    HEAP32[$3 >> 2] = $9;
    var $10 = $4 << 3;
    var $11 = __Z7b2Alloci($10);
    var $12 = $11;
    HEAP32[$6$s2] = $12;
    var $13 = $8;
    var $15 = HEAP32[$1$s2] << 2;
    _memcpy($11, $13, $15, 1);
    __Z6b2FreePv($13);
    var $16 = HEAP32[$1$s2];
  } else {
    var $16 = $2;
  }
  var $16;
  var $18 = ($16 << 2) + HEAP32[$6$s2] | 0;
  HEAP32[$18 >> 2] = $proxyId;
  var $20 = HEAP32[$1$s2] + 1 | 0;
  HEAP32[$1$s2] = $20;
  return;
  return;
}

function __ZN12b2BroadPhase12DestroyProxyEi($this, $proxyId) {
  __ZN12b2BroadPhase12UnBufferMoveEi($this, $proxyId);
  var $1 = $this + 28 | 0;
  var $3 = HEAP32[$1 >> 2] - 1 | 0;
  HEAP32[$1 >> 2] = $3;
  var $4 = $this | 0;
  __ZN13b2DynamicTree12DestroyProxyEi($4, $proxyId);
  return;
  return;
}

function __ZN12b2BroadPhase9MoveProxyEiRK6b2AABBRK6b2Vec2($this, $proxyId, $aabb, $displacement) {
  var $1 = $this | 0;
  var $2 = __ZN13b2DynamicTree9MoveProxyEiRK6b2AABBRK6b2Vec2($1, $proxyId, $aabb, $displacement);
  if ($2) {
    __ZN12b2BroadPhase10BufferMoveEi($this, $proxyId);
  }
  return;
  return;
}

function __ZN12b2BroadPhase10TouchProxyEi($this, $proxyId) {
  __ZN12b2BroadPhase10BufferMoveEi($this, $proxyId);
  return;
  return;
}

function __ZN12b2BroadPhase13QueryCallbackEi($this, $proxyId) {
  var $10$s2;
  var $5$s2;
  var $1$s2;
  var $1$s2 = ($this + 56 | 0) >> 2;
  var $2 = HEAP32[$1$s2];
  if (($2 | 0) != ($proxyId | 0)) {
    var $5$s2 = ($this + 52 | 0) >> 2;
    var $6 = HEAP32[$5$s2];
    var $7 = $this + 48 | 0;
    var $8 = HEAP32[$7 >> 2];
    var $10$s2 = ($this + 44 | 0) >> 2;
    if (($6 | 0) == ($8 | 0)) {
      var $12 = HEAP32[$10$s2];
      var $13 = $8 << 1;
      HEAP32[$7 >> 2] = $13;
      var $14 = $8 * 24 | 0;
      var $15 = __Z7b2Alloci($14);
      var $16 = $15;
      HEAP32[$10$s2] = $16;
      var $17 = $12;
      var $19 = HEAP32[$5$s2] * 12 | 0;
      _memcpy($15, $17, $19, 1);
      __Z6b2FreePv($17);
      var $21 = HEAP32[$1$s2];
      var $20 = HEAP32[$5$s2];
    } else {
      var $21 = $2;
      var $20 = $6;
    }
    var $20;
    var $21;
    var $22 = __Z5b2MinIiET_S0_S0_($proxyId, $21);
    var $24 = HEAP32[$10$s2] + $20 * 12 | 0;
    HEAP32[$24 >> 2] = $22;
    var $25 = HEAP32[$1$s2];
    var $26 = __Z5b2MaxIiET_S0_S0_($proxyId, $25);
    var $29 = HEAP32[$10$s2] + HEAP32[$5$s2] * 12 + 4 | 0;
    HEAP32[$29 >> 2] = $26;
    var $31 = HEAP32[$5$s2] + 1 | 0;
    HEAP32[$5$s2] = $31;
  }
  return 1;
  return null;
}

function __ZN12b2BroadPhaseC2Ev($this) {
  var $this$s2 = $this >> 2;
  var $1 = $this | 0;
  __ZN13b2DynamicTreeC1Ev($1);
  HEAP32[$this$s2 + 7] = 0;
  HEAP32[$this$s2 + 12] = 16;
  HEAP32[$this$s2 + 13] = 0;
  var $5 = __Z7b2Alloci(192);
  HEAP32[$this$s2 + 11] = $5;
  HEAP32[$this$s2 + 9] = 16;
  HEAP32[$this$s2 + 10] = 0;
  var $11 = __Z7b2Alloci(64);
  HEAP32[$this$s2 + 8] = $11;
  return;
  return;
}

function __ZN12b2BroadPhaseD2Ev($this) {
  var $3 = HEAP32[$this + 32 >> 2];
  __Z6b2FreePv($3);
  var $7 = HEAP32[$this + 44 >> 2];
  __Z6b2FreePv($7);
  var $9 = $this | 0;
  __ZN13b2DynamicTreeD1Ev($9);
  return;
  return;
}

var i64Math = null;

var __ZN13b2DynamicTreeC1Ev;

var __Z7b2Alloci;

function ___gxx_personality_v0() {}

var __ZN13b2DynamicTreeD1Ev;

var __ZSt9terminatev;

var __Z6b2FreePv;

var __ZN13b2DynamicTree11CreateProxyERK6b2AABBPv;

var __ZN13b2DynamicTree12DestroyProxyEi;

var __ZN13b2DynamicTree9MoveProxyEiRK6b2AABBRK6b2Vec2;

function _memcpy(dest, src, num, align) {
  if (num >= 20 && src % 2 == dest % 2) {
    if (src % 4 == dest % 4) {
      var stop = src + num;
      while (src % 4) {
        HEAP8[dest++] = HEAP8[src++];
      }
      var src4 = src >> 2, dest4 = dest >> 2, stop4 = stop >> 2;
      while (src4 < stop4) {
        HEAP32[dest4++] = HEAP32[src4++];
      }
      src = src4 << 2;
      dest = dest4 << 2;
      while (src < stop) {
        HEAP8[dest++] = HEAP8[src++];
      }
    } else {
      var stop = src + num;
      if (src % 2) {
        HEAP8[dest++] = HEAP8[src++];
      }
      var src2 = src >> 1, dest2 = dest >> 1, stop2 = stop >> 1;
      while (src2 < stop2) {
        HEAP16[dest2++] = HEAP16[src2++];
      }
      src = src2 << 1;
      dest = dest2 << 1;
      if (src < stop) {
        HEAP8[dest++] = HEAP8[src++];
      }
    }
  } else {
    while (num--) {
      HEAP8[dest++] = HEAP8[src++];
    }
  }
}

var _llvm_memcpy_p0i8_p0i8_i32 = _memcpy;

function _memset(ptr, value, num, align) {
  if (num >= 20) {
    var stop = ptr + num;
    while (ptr % 4) {
      HEAP8[ptr++] = value;
    }
    if (value < 0) value += 256;
    var ptr4 = ptr >> 2, stop4 = stop >> 2, value4 = value | value << 8 | value << 16 | value << 24;
    while (ptr4 < stop4) {
      HEAP32[ptr4++] = value4;
    }
    ptr = ptr4 << 2;
    while (ptr < stop) {
      HEAP8[ptr++] = value;
    }
  } else {
    while (num--) {
      HEAP8[ptr++] = value;
    }
  }
}

function _malloc(bytes) {
  ptr = Runtime.staticAlloc(bytes + 8);
  return ptr + 8 & 4294967288;
}

Module["_malloc"] = _malloc;

function _free() {}

Module["_free"] = _free;

var Browser = {
  mainLoop: {
    scheduler: null,
    shouldPause: false,
    paused: false
  },
  pointerLock: false,
  moduleContextCreatedCallbacks: [],
  createContext: (function(canvas, useWebGL, setInModule) {
    try {
      var ctx = canvas.getContext(useWebGL ? "experimental-webgl" : "2d");
      if (!ctx) throw ":(";
    } catch (e) {
      Module.print("Could not create canvas - " + e);
      return null;
    }
    if (useWebGL) {
      canvas.style.backgroundColor = "black";
      canvas.addEventListener("webglcontextlost", (function(event) {
        alert("WebGL context lost. You will need to reload the page.");
      }), false);
    }
    if (setInModule) {
      Module.ctx = ctx;
      Module.useWebGL = useWebGL;
      Browser.moduleContextCreatedCallbacks.forEach((function(callback) {
        callback();
      }));
    }
    return ctx;
  }),
  requestFullScreen: (function() {
    var canvas = Module.canvas;
    function fullScreenChange() {
      if (Module["onFullScreen"]) Module["onFullScreen"]();
      if (document["webkitFullScreenElement"] === canvas || document["mozFullScreenElement"] === canvas || document["fullScreenElement"] === canvas) {
        canvas.requestPointerLock = canvas["requestPointerLock"] || canvas["mozRequestPointerLock"] || canvas["webkitRequestPointerLock"];
        canvas.requestPointerLock();
      }
    }
    document.addEventListener("fullscreenchange", fullScreenChange, false);
    document.addEventListener("mozfullscreenchange", fullScreenChange, false);
    document.addEventListener("webkitfullscreenchange", fullScreenChange, false);
    function pointerLockChange() {
      Browser.pointerLock = document["pointerLockElement"] === canvas || document["mozPointerLockElement"] === canvas || document["webkitPointerLockElement"] === canvas;
    }
    document.addEventListener("pointerlockchange", pointerLockChange, false);
    document.addEventListener("mozpointerlockchange", pointerLockChange, false);
    document.addEventListener("webkitpointerlockchange", pointerLockChange, false);
    canvas.requestFullScreen = canvas["requestFullScreen"] || canvas["mozRequestFullScreen"] || (canvas["webkitRequestFullScreen"] ? (function() {
      canvas["webkitRequestFullScreen"](Element["ALLOW_KEYBOARD_INPUT"]);
    }) : null);
    canvas.requestFullScreen();
  }),
  requestAnimationFrame: (function(func) {
    if (!window.requestAnimationFrame) {
      window.requestAnimationFrame = window["requestAnimationFrame"] || window["mozRequestAnimationFrame"] || window["webkitRequestAnimationFrame"] || window["msRequestAnimationFrame"] || window["oRequestAnimationFrame"] || window["setTimeout"];
    }
    window.requestAnimationFrame(func);
  }),
  getMovementX: (function(event) {
    return event["movementX"] || event["mozMovementX"] || event["webkitMovementX"] || 0;
  }),
  getMovementY: (function(event) {
    return event["movementY"] || event["mozMovementY"] || event["webkitMovementY"] || 0;
  }),
  xhrLoad: (function(url, onload, onerror) {
    var xhr = new XMLHttpRequest;
    xhr.open("GET", url, true);
    xhr.responseType = "arraybuffer";
    xhr.onload = (function() {
      if (xhr.status == 200) {
        onload(xhr.response);
      } else {
        onerror();
      }
    });
    xhr.onerror = onerror;
    xhr.send(null);
  }),
  asyncLoad: (function(url, callback) {
    Browser.xhrLoad(url, (function(arrayBuffer) {
      assert(arrayBuffer, 'Loading data file "' + url + '" failed (no arrayBuffer).');
      callback(new Uint8Array(arrayBuffer));
      removeRunDependency();
    }), (function(event) {
      throw 'Loading data file "' + url + '" failed.';
    }));
    addRunDependency();
  })
};

Module["requestFullScreen"] = (function() {
  Browser.requestFullScreen();
});

Module.callMain = function callMain(args) {
  var argc = args.length + 1;
  function pad() {
    for (var i = 0; i < 4 - 1; i++) {
      argv.push(0);
    }
  }
  var argv = [ allocate(intArrayFromString("/bin/this.program"), "i8", ALLOC_STATIC) ];
  pad();
  for (var i = 0; i < argc - 1; i = i + 1) {
    argv.push(allocate(intArrayFromString(args[i]), "i8", ALLOC_STATIC));
    pad();
  }
  argv.push(0);
  argv = allocate(argv, "i32", ALLOC_STATIC);
  return _main(argc, argv, 0);
};

FUNCTION_TABLE = [ 0, 0 ];

Module["FUNCTION_TABLE"] = FUNCTION_TABLE;

function run(args) {
  args = args || Module["arguments"];
  if (Module["preRun"]) {
    if (typeof Module["preRun"] == "function") Module["preRun"] = [ Module["preRun"] ];
    while (Module["preRun"].length > 0) {
      Module["preRun"].pop()();
      if (runDependencies > 0) {
        return 0;
      }
    }
  }
  function doRun() {
    var ret = 0;
    if (Module["_main"]) {
      preMain();
      ret = Module.callMain(args);
      if (!Module["noExitRuntime"]) {
        exitRuntime();
      }
    }
    if (Module["postRun"]) {
      if (typeof Module["postRun"] == "function") Module["postRun"] = [ Module["postRun"] ];
      while (Module["postRun"].length > 0) {
        Module["postRun"].pop()();
      }
    }
    return ret;
  }
  if (Module["setStatus"]) {
    Module["setStatus"]("Running...");
    setTimeout((function() {
      setTimeout((function() {
        Module["setStatus"]("");
      }), 1);
      doRun();
    }), 1);
    return 0;
  } else {
    return doRun();
  }
}

Module["run"] = run;

initRuntime();

if (Module["noInitialRun"]) {
  addRunDependency();
}

if (runDependencies == 0) {
  var ret = run();
}

var Object__cache = {};

function wrapPointer(ptr, __class__) {
  var cache = __class__ ? __class__.prototype.__cache__ : Object__cache;
  var ret = cache[ptr];
  if (ret) return ret;
  __class__ = __class__ || Object;
  ret = Object.create(__class__.prototype);
  ret.ptr = ptr;
  ret.__class__ = __class__;
  return cache[ptr] = ret;
}

Module["wrapPointer"] = wrapPointer;

function castObject(obj, __class__) {
  return wrapPointer(obj.ptr, __class__);
}

Module["castObject"] = castObject;

Module["NULL"] = wrapPointer(0);

function destroy(obj) {
  if (!obj["__destroy__"]) throw "Error: Cannot destroy object. (Did you create it yourself?)";
  obj["__destroy__"]();
  if (obj.__class__ !== Object) {
    delete obj.__class__.prototype.__cache__[obj.ptr];
  } else {
    delete Object__cache[obj.ptr];
  }
}

Module["destroy"] = destroy;

function compare(obj1, obj2) {
  return obj1.ptr === obj2.ptr;
}

Module["compare"] = compare;

function getPointer(obj) {
  return obj.ptr;
}

Module["getPointer"] = getPointer;

function getClass(obj) {
  return obj.__class__;
}

Module["getClass"] = getClass;

function customizeVTable(object, replacementPairs) {
  var vTable = getValue(object.ptr, "void*");
  var size = 0;
  while (getValue(vTable + Runtime.QUANTUM_SIZE * size, "void*")) {
    size++;
  }
  var vTable2 = _malloc(size * Runtime.QUANTUM_SIZE);
  setValue(object.ptr, vTable2, "void*");
  var canaryValue;
  var functions = FUNCTION_TABLE.length;
  for (var i = 0; i < size; i++) {
    var index = FUNCTION_TABLE.length;
    ((function(j) {
      FUNCTION_TABLE.push((function() {
        canaryValue = j;
      }));
    }))(i);
    FUNCTION_TABLE.push(0);
    setValue(vTable2 + Runtime.QUANTUM_SIZE * i, index, "void*");
  }
  var args = [ {
    ptr: 0
  } ];
  replacementPairs.forEach((function(pair) {
    while (1) {
      try {
        pair["original"].apply(object, args);
        break;
      } catch (e) {
        args.push(args[0]);
      }
    }
    pair.originalIndex = getValue(vTable + canaryValue * Runtime.QUANTUM_SIZE, "void*");
  }));
  FUNCTION_TABLE = FUNCTION_TABLE.slice(0, functions);
  var replacements = {};
  replacementPairs.forEach((function(pair) {
    var replacementIndex = FUNCTION_TABLE.length;
    FUNCTION_TABLE.push(pair["replacement"]);
    FUNCTION_TABLE.push(0);
    replacements[pair.originalIndex] = replacementIndex;
  }));
  for (var i = 0; i < size; i++) {
    var value = getValue(vTable + Runtime.QUANTUM_SIZE * i, "void*");
    if (value in replacements) value = replacements[value];
    setValue(vTable2 + Runtime.QUANTUM_SIZE * i, value, "void*");
  }
  return object;
}

Module["customizeVTable"] = customizeVTable;

function ensureString(value) {
  if (typeof value == "number") return value;
  return allocate(intArrayFromString(value), "i8", ALLOC_STACK);
}

b2ContactManager.prototype["get_m_contactFilter"] = (function() {
  return wrapPointer(_emscripten_bind_b2ContactManager__get_m_contactFilter_p0(this.ptr), Module["b2ContactFilter"]);
});

b2ContactManager.prototype["get_m_contactCount"] = (function() {
  return _emscripten_bind_b2ContactManager__get_m_contactCount_p0(this.ptr);
});

b2ContactManager.prototype["set_m_contactFilter"] = (function(arg0) {
  _emscripten_bind_b2ContactManager__set_m_contactFilter_p1(this.ptr, arg0.ptr);
});

b2ContactManager.prototype["AddPair"] = (function(arg0, arg1) {
  _emscripten_bind_b2ContactManager__AddPair_p2(this.ptr, arg0, arg1);
});

b2ContactManager.prototype["set_m_allocator"] = (function(arg0) {
  _emscripten_bind_b2ContactManager__set_m_allocator_p1(this.ptr, arg0.ptr);
});

b2ContactManager.prototype["set_m_contactCount"] = (function(arg0) {
  _emscripten_bind_b2ContactManager__set_m_contactCount_p1(this.ptr, arg0);
});

b2ContactManager.prototype["Collide"] = (function() {
  _emscripten_bind_b2ContactManager__Collide_p0(this.ptr);
});

b2ContactManager.prototype["set_m_contactList"] = (function(arg0) {
  _emscripten_bind_b2ContactManager__set_m_contactList_p1(this.ptr, arg0.ptr);
});

b2ContactManager.prototype["FindNewContacts"] = (function() {
  _emscripten_bind_b2ContactManager__FindNewContacts_p0(this.ptr);
});

b2ContactManager.prototype["get_m_contactListener"] = (function() {
  return wrapPointer(_emscripten_bind_b2ContactManager__get_m_contactListener_p0(this.ptr), Module["b2ContactListener"]);
});

b2ContactManager.prototype["__destroy__"] = (function() {
  _emscripten_bind_b2ContactManager____destroy___p0(this.ptr);
});

b2ContactManager.prototype["set_m_contactListener"] = (function(arg0) {
  _emscripten_bind_b2ContactManager__set_m_contactListener_p1(this.ptr, arg0.ptr);
});

b2ContactManager.prototype["get_m_broadPhase"] = (function() {
  return wrapPointer(_emscripten_bind_b2ContactManager__get_m_broadPhase_p0(this.ptr), Module["b2BroadPhase"]);
});

b2ContactManager.prototype["Destroy"] = (function(arg0) {
  _emscripten_bind_b2ContactManager__Destroy_p1(this.ptr, arg0.ptr);
});

b2ContactManager.prototype["set_m_broadPhase"] = (function(arg0) {
  _emscripten_bind_b2ContactManager__set_m_broadPhase_p1(this.ptr, arg0.ptr);
});

b2ContactManager.prototype["get_m_contactList"] = (function() {
  return wrapPointer(_emscripten_bind_b2ContactManager__get_m_contactList_p0(this.ptr), Module["b2Contact"]);
});

b2ContactManager.prototype["get_m_allocator"] = (function() {
  return wrapPointer(_emscripten_bind_b2ContactManager__get_m_allocator_p0(this.ptr), Module["b2BlockAllocator"]);
});

b2BroadPhase.prototype["GetTreeQuality"] = (function() {
  return _emscripten_bind_b2BroadPhase__GetTreeQuality_p0(this.ptr);
});

b2BroadPhase.prototype["GetFatAABB"] = (function(arg0) {
  return wrapPointer(_emscripten_bind_b2BroadPhase__GetFatAABB_p1(this.ptr, arg0), Module["b2AABB"]);
});

b2BroadPhase.prototype["GetUserData"] = (function(arg0) {
  return _emscripten_bind_b2BroadPhase__GetUserData_p1(this.ptr, arg0);
});

b2BroadPhase.prototype["__destroy__"] = (function() {
  _emscripten_bind_b2BroadPhase____destroy___p0(this.ptr);
});

b2BroadPhase.prototype["GetTreeHeight"] = (function() {
  return _emscripten_bind_b2BroadPhase__GetTreeHeight_p0(this.ptr);
});

b2BroadPhase.prototype["GetProxyCount"] = (function() {
  return _emscripten_bind_b2BroadPhase__GetProxyCount_p0(this.ptr);
});

b2BroadPhase.prototype["GetTreeBalance"] = (function() {
  return _emscripten_bind_b2BroadPhase__GetTreeBalance_p0(this.ptr);
});

b2BroadPhase.prototype["TestOverlap"] = (function(arg0, arg1) {
  return _emscripten_bind_b2BroadPhase__TestOverlap_p2(this.ptr, arg0, arg1);
});

b2BroadPhase.prototype["TouchProxy"] = (function(arg0) {
  _emscripten_bind_b2BroadPhase__TouchProxy_p1(this.ptr, arg0);
});

b2BroadPhase.prototype["CreateProxy"] = (function(arg0, arg1) {
  return _emscripten_bind_b2BroadPhase__CreateProxy_p2(this.ptr, arg0.ptr, arg1);
});

b2BroadPhase.prototype["MoveProxy"] = (function(arg0, arg1, arg2) {
  _emscripten_bind_b2BroadPhase__MoveProxy_p3(this.ptr, arg0, arg1.ptr, arg2.ptr);
});

b2BroadPhase.prototype["DestroyProxy"] = (function(arg0) {
  _emscripten_bind_b2BroadPhase__DestroyProxy_p1(this.ptr, arg0);
});

b2World.prototype["QueryAABB"] = (function(arg0, arg1) {
  _emscripten_bind_b2World__QueryAABB_p2(this.ptr, arg0.ptr, arg1.ptr);
});

b2World.prototype["SetSubStepping"] = (function(arg0) {
  _emscripten_bind_b2World__SetSubStepping_p1(this.ptr, arg0);
});

b2World.prototype["GetTreeQuality"] = (function() {
  return _emscripten_bind_b2World__GetTreeQuality_p0(this.ptr);
});

b2World.prototype["GetTreeHeight"] = (function() {
  return _emscripten_bind_b2World__GetTreeHeight_p0(this.ptr);
});

b2World.prototype["GetProfile"] = (function() {
  return wrapPointer(_emscripten_bind_b2World__GetProfile_p0(this.ptr), Module["b2Profile"]);
});

b2World.prototype["GetTreeBalance"] = (function() {
  return _emscripten_bind_b2World__GetTreeBalance_p0(this.ptr);
});

b2World.prototype["GetSubStepping"] = (function() {
  return _emscripten_bind_b2World__GetSubStepping_p0(this.ptr);
});

b2World.prototype["GetContactManager"] = (function() {
  return wrapPointer(_emscripten_bind_b2World__GetContactManager_p0(this.ptr), Module["b2ContactManager"]);
});

b2World.prototype["SetContactListener"] = (function(arg0) {
  _emscripten_bind_b2World__SetContactListener_p1(this.ptr, arg0.ptr);
});

b2World.prototype["DrawDebugData"] = (function() {
  _emscripten_bind_b2World__DrawDebugData_p0(this.ptr);
});

b2World.prototype["SetContinuousPhysics"] = (function(arg0) {
  _emscripten_bind_b2World__SetContinuousPhysics_p1(this.ptr, arg0);
});

b2World.prototype["SetGravity"] = (function(arg0) {
  _emscripten_bind_b2World__SetGravity_p1(this.ptr, arg0.ptr);
});

b2World.prototype["GetBodyCount"] = (function() {
  return _emscripten_bind_b2World__GetBodyCount_p0(this.ptr);
});

b2World.prototype["GetAutoClearForces"] = (function() {
  return _emscripten_bind_b2World__GetAutoClearForces_p0(this.ptr);
});

b2World.prototype["GetContinuousPhysics"] = (function() {
  return _emscripten_bind_b2World__GetContinuousPhysics_p0(this.ptr);
});

b2World.prototype["GetJointList"] = (function() {
  return wrapPointer(_emscripten_bind_b2World__GetJointList_p0(this.ptr), Module["b2Joint"]);
});

b2World.prototype["CreateBody"] = (function(arg0) {
  return wrapPointer(_emscripten_bind_b2World__CreateBody_p1(this.ptr, arg0.ptr), Module["b2Body"]);
});

b2World.prototype["GetBodyList"] = (function() {
  return wrapPointer(_emscripten_bind_b2World__GetBodyList_p0(this.ptr), Module["b2Body"]);
});

b2World.prototype["SetDestructionListener"] = (function(arg0) {
  _emscripten_bind_b2World__SetDestructionListener_p1(this.ptr, arg0.ptr);
});

b2World.prototype["DestroyJoint"] = (function(arg0) {
  _emscripten_bind_b2World__DestroyJoint_p1(this.ptr, arg0.ptr);
});

b2World.prototype["GetJointCount"] = (function() {
  return _emscripten_bind_b2World__GetJointCount_p0(this.ptr);
});

b2World.prototype["Step"] = (function(arg0, arg1, arg2) {
  _emscripten_bind_b2World__Step_p3(this.ptr, arg0, arg1, arg2);
});

b2World.prototype["ClearForces"] = (function() {
  _emscripten_bind_b2World__ClearForces_p0(this.ptr);
});

b2World.prototype["GetWarmStarting"] = (function() {
  return _emscripten_bind_b2World__GetWarmStarting_p0(this.ptr);
});

b2World.prototype["SetAllowSleeping"] = (function(arg0) {
  _emscripten_bind_b2World__SetAllowSleeping_p1(this.ptr, arg0);
});

b2World.prototype["DestroyBody"] = (function(arg0) {
  _emscripten_bind_b2World__DestroyBody_p1(this.ptr, arg0.ptr);
});

b2World.prototype["GetAllowSleeping"] = (function() {
  return _emscripten_bind_b2World__GetAllowSleeping_p0(this.ptr);
});

b2World.prototype["CreateJoint"] = (function(arg0) {
  return wrapPointer(_emscripten_bind_b2World__CreateJoint_p1(this.ptr, arg0.ptr), Module["b2Joint"]);
});

b2World.prototype["GetProxyCount"] = (function() {
  return _emscripten_bind_b2World__GetProxyCount_p0(this.ptr);
});

b2World.prototype["RayCast"] = (function(arg0, arg1, arg2) {
  _emscripten_bind_b2World__RayCast_p3(this.ptr, arg0.ptr, arg1.ptr, arg2.ptr);
});

b2World.prototype["IsLocked"] = (function() {
  return _emscripten_bind_b2World__IsLocked_p0(this.ptr);
});

b2World.prototype["GetContactList"] = (function() {
  return wrapPointer(_emscripten_bind_b2World__GetContactList_p0(this.ptr), Module["b2Contact"]);
});

b2World.prototype["SetDebugDraw"] = (function(arg0) {
  _emscripten_bind_b2World__SetDebugDraw_p1(this.ptr, arg0.ptr);
});

b2World.prototype["__destroy__"] = (function() {
  _emscripten_bind_b2World____destroy___p0(this.ptr);
});

b2World.prototype["Dump"] = (function() {
  _emscripten_bind_b2World__Dump_p0(this.ptr);
});

b2World.prototype["SetAutoClearForces"] = (function(arg0) {
  _emscripten_bind_b2World__SetAutoClearForces_p1(this.ptr, arg0);
});

b2World.prototype["GetGravity"] = (function() {
  return wrapPointer(_emscripten_bind_b2World__GetGravity_p0(this.ptr), Module["b2Vec2"]);
});

b2World.prototype["GetContactCount"] = (function() {
  return _emscripten_bind_b2World__GetContactCount_p0(this.ptr);
});

b2World.prototype["SetWarmStarting"] = (function(arg0) {
  _emscripten_bind_b2World__SetWarmStarting_p1(this.ptr, arg0);
});

b2World.prototype["SetContactFilter"] = (function(arg0) {
  _emscripten_bind_b2World__SetContactFilter_p1(this.ptr, arg0.ptr);
});

b2CircleShape.prototype["__destroy__"] = (function() {
  _emscripten_bind_b2CircleShape____destroy___p0(this.ptr);
});

b2CircleShape.prototype["GetType"] = (function() {
  return _emscripten_bind_b2CircleShape__GetType_p0(this.ptr);
});

b2CircleShape.prototype["ComputeMass"] = (function(arg0, arg1) {
  _emscripten_bind_b2CircleShape__ComputeMass_p2(this.ptr, arg0.ptr, arg1);
});

b2CircleShape.prototype["set_m_radius"] = (function(arg0) {
  _emscripten_bind_b2CircleShape__set_m_radius_p1(this.ptr, arg0);
});

b2CircleShape.prototype["get_m_radius"] = (function() {
  return _emscripten_bind_b2CircleShape__get_m_radius_p0(this.ptr);
});

b2CircleShape.prototype["GetVertex"] = (function(arg0) {
  return wrapPointer(_emscripten_bind_b2CircleShape__GetVertex_p1(this.ptr, arg0), Module["b2Vec2"]);
});

b2CircleShape.prototype["Clone"] = (function(arg0) {
  return wrapPointer(_emscripten_bind_b2CircleShape__Clone_p1(this.ptr, arg0.ptr), Module["b2Shape"]);
});

b2CircleShape.prototype["GetSupportVertex"] = (function(arg0) {
  return wrapPointer(_emscripten_bind_b2CircleShape__GetSupportVertex_p1(this.ptr, arg0.ptr), Module["b2Vec2"]);
});

b2CircleShape.prototype["RayCast"] = (function(arg0, arg1, arg2, arg3) {
  return _emscripten_bind_b2CircleShape__RayCast_p4(this.ptr, arg0.ptr, arg1.ptr, arg2.ptr, arg3);
});

b2CircleShape.prototype["ComputeAABB"] = (function(arg0, arg1, arg2) {
  _emscripten_bind_b2CircleShape__ComputeAABB_p3(this.ptr, arg0.ptr, arg1.ptr, arg2);
});

b2CircleShape.prototype["GetVertexCount"] = (function() {
  return _emscripten_bind_b2CircleShape__GetVertexCount_p0(this.ptr);
});

b2CircleShape.prototype["GetChildCount"] = (function() {
  return _emscripten_bind_b2CircleShape__GetChildCount_p0(this.ptr);
});

b2CircleShape.prototype["TestPoint"] = (function(arg0, arg1) {
  return _emscripten_bind_b2CircleShape__TestPoint_p2(this.ptr, arg0.ptr, arg1.ptr);
});

b2CircleShape.prototype["GetSupport"] = (function(arg0) {
  return _emscripten_bind_b2CircleShape__GetSupport_p1(this.ptr, arg0.ptr);
});

b2CircleShape.prototype["set_m_p"] = (function(arg0) {
  _emscripten_bind_b2CircleShape__set_m_p_p1(this.ptr, arg0.ptr);
});

b2CircleShape.prototype["get_m_p"] = (function() {
  return wrapPointer(_emscripten_bind_b2CircleShape__get_m_p_p0(this.ptr), Module["b2Vec2"]);
});

function b2Draw() {
  throw "b2Draw is abstract!";
}

b2Draw.prototype.__cache__ = {};

Module["b2Draw"] = b2Draw;

b2Draw.prototype["AppendFlags"] = (function(arg0) {
  _emscripten_bind_b2Draw__AppendFlags_p1(this.ptr, arg0);
});

b2Draw.prototype["DrawTransform"] = (function(arg0) {
  _emscripten_bind_b2Draw__DrawTransform_p1(this.ptr, arg0.ptr);
});

b2Draw.prototype["ClearFlags"] = (function(arg0) {
  _emscripten_bind_b2Draw__ClearFlags_p1(this.ptr, arg0);
});

b2Draw.prototype["DrawPolygon"] = (function(arg0, arg1, arg2) {
  _emscripten_bind_b2Draw__DrawPolygon_p3(this.ptr, arg0.ptr, arg1, arg2.ptr);
});

b2Draw.prototype["DrawSolidCircle"] = (function(arg0, arg1, arg2, arg3) {
  _emscripten_bind_b2Draw__DrawSolidCircle_p4(this.ptr, arg0.ptr, arg1, arg2.ptr, arg3.ptr);
});

b2Draw.prototype["DrawSolidPolygon"] = (function(arg0, arg1, arg2) {
  _emscripten_bind_b2Draw__DrawSolidPolygon_p3(this.ptr, arg0.ptr, arg1, arg2.ptr);
});

b2Draw.prototype["DrawCircle"] = (function(arg0, arg1, arg2) {
  _emscripten_bind_b2Draw__DrawCircle_p3(this.ptr, arg0.ptr, arg1, arg2.ptr);
});

b2Draw.prototype["SetFlags"] = (function(arg0) {
  _emscripten_bind_b2Draw__SetFlags_p1(this.ptr, arg0);
});

b2Draw.prototype["DrawSegment"] = (function(arg0, arg1, arg2) {
  _emscripten_bind_b2Draw__DrawSegment_p3(this.ptr, arg0.ptr, arg1.ptr, arg2.ptr);
});

b2Draw.prototype["GetFlags"] = (function() {
  return _emscripten_bind_b2Draw__GetFlags_p0(this.ptr);
});

function b2Joint() {
  throw "b2Joint is abstract!";
}

b2Joint.prototype.__cache__ = {};

Module["b2Joint"] = b2Joint;

b2Joint.prototype["GetNext"] = (function() {
  return wrapPointer(_emscripten_bind_b2Joint__GetNext_p0(this.ptr), Module["b2Joint"]);
});

b2Joint.prototype["GetBodyA"] = (function() {
  return wrapPointer(_emscripten_bind_b2Joint__GetBodyA_p0(this.ptr), Module["b2Body"]);
});

b2Joint.prototype["GetBodyB"] = (function() {
  return wrapPointer(_emscripten_bind_b2Joint__GetBodyB_p0(this.ptr), Module["b2Body"]);
});

b2Joint.prototype["GetReactionTorque"] = (function(arg0) {
  return _emscripten_bind_b2Joint__GetReactionTorque_p1(this.ptr, arg0);
});

b2Joint.prototype["GetAnchorA"] = (function() {
  return wrapPointer(_emscripten_bind_b2Joint__GetAnchorA_p0(this.ptr), Module["b2Vec2"]);
});

b2Joint.prototype["GetUserData"] = (function() {
  return _emscripten_bind_b2Joint__GetUserData_p0(this.ptr);
});

b2Joint.prototype["GetType"] = (function() {
  return _emscripten_bind_b2Joint__GetType_p0(this.ptr);
});

b2Joint.prototype["SetUserData"] = (function(arg0) {
  _emscripten_bind_b2Joint__SetUserData_p1(this.ptr, arg0);
});

b2Joint.prototype["GetCollideConnected"] = (function() {
  return _emscripten_bind_b2Joint__GetCollideConnected_p0(this.ptr);
});

b2Joint.prototype["Dump"] = (function() {
  _emscripten_bind_b2Joint__Dump_p0(this.ptr);
});

b2Joint.prototype["GetAnchorB"] = (function() {
  return wrapPointer(_emscripten_bind_b2Joint__GetAnchorB_p0(this.ptr), Module["b2Vec2"]);
});

b2Joint.prototype["GetReactionForce"] = (function(arg0) {
  return wrapPointer(_emscripten_bind_b2Joint__GetReactionForce_p1(this.ptr, arg0), Module["b2Vec2"]);
});

b2Joint.prototype["IsActive"] = (function() {
  return _emscripten_bind_b2Joint__IsActive_p0(this.ptr);
});

function b2RayCastCallback() {
  throw "b2RayCastCallback is abstract!";
}

b2RayCastCallback.prototype.__cache__ = {};

Module["b2RayCastCallback"] = b2RayCastCallback;

b2RayCastCallback.prototype["ReportFixture"] = (function(arg0, arg1, arg2, arg3) {
  return _emscripten_bind_b2RayCastCallback__ReportFixture_p4(this.ptr, arg0.ptr, arg1.ptr, arg2.ptr, arg3);
});

b2DynamicTree.prototype["__destroy__"] = (function() {
  _emscripten_bind_b2DynamicTree____destroy___p0(this.ptr);
});

b2DynamicTree.prototype["GetFatAABB"] = (function(arg0) {
  return wrapPointer(_emscripten_bind_b2DynamicTree__GetFatAABB_p1(this.ptr, arg0), Module["b2AABB"]);
});

b2DynamicTree.prototype["GetUserData"] = (function(arg0) {
  return _emscripten_bind_b2DynamicTree__GetUserData_p1(this.ptr, arg0);
});

b2DynamicTree.prototype["GetMaxBalance"] = (function() {
  return _emscripten_bind_b2DynamicTree__GetMaxBalance_p0(this.ptr);
});

b2DynamicTree.prototype["GetHeight"] = (function() {
  return _emscripten_bind_b2DynamicTree__GetHeight_p0(this.ptr);
});

b2DynamicTree.prototype["GetAreaRatio"] = (function() {
  return _emscripten_bind_b2DynamicTree__GetAreaRatio_p0(this.ptr);
});

b2DynamicTree.prototype["RebuildBottomUp"] = (function() {
  _emscripten_bind_b2DynamicTree__RebuildBottomUp_p0(this.ptr);
});

b2DynamicTree.prototype["CreateProxy"] = (function(arg0, arg1) {
  return _emscripten_bind_b2DynamicTree__CreateProxy_p2(this.ptr, arg0.ptr, arg1);
});

b2DynamicTree.prototype["MoveProxy"] = (function(arg0, arg1, arg2) {
  return _emscripten_bind_b2DynamicTree__MoveProxy_p3(this.ptr, arg0, arg1.ptr, arg2.ptr);
});

b2DynamicTree.prototype["Validate"] = (function() {
  _emscripten_bind_b2DynamicTree__Validate_p0(this.ptr);
});

b2DynamicTree.prototype["DestroyProxy"] = (function(arg0) {
  _emscripten_bind_b2DynamicTree__DestroyProxy_p1(this.ptr, arg0);
});

b2Timer.prototype["Reset"] = (function() {
  _emscripten_bind_b2Timer__Reset_p0(this.ptr);
});

b2Timer.prototype["__destroy__"] = (function() {
  _emscripten_bind_b2Timer____destroy___p0(this.ptr);
});

b2Timer.prototype["GetMilliseconds"] = (function() {
  return _emscripten_bind_b2Timer__GetMilliseconds_p0(this.ptr);
});

b2ChainShape.prototype["__destroy__"] = (function() {
  _emscripten_bind_b2ChainShape____destroy___p0(this.ptr);
});

b2ChainShape.prototype["GetType"] = (function() {
  return _emscripten_bind_b2ChainShape__GetType_p0(this.ptr);
});

b2ChainShape.prototype["CreateChain"] = (function(arg0, arg1) {
  _emscripten_bind_b2ChainShape__CreateChain_p2(this.ptr, arg0.ptr, arg1);
});

b2ChainShape.prototype["set_m_radius"] = (function(arg0) {
  _emscripten_bind_b2ChainShape__set_m_radius_p1(this.ptr, arg0);
});

b2ChainShape.prototype["get_m_radius"] = (function() {
  return _emscripten_bind_b2ChainShape__get_m_radius_p0(this.ptr);
});

b2ChainShape.prototype["get_m_vertices"] = (function() {
  return wrapPointer(_emscripten_bind_b2ChainShape__get_m_vertices_p0(this.ptr), Module["b2Vec2"]);
});

b2ChainShape.prototype["ComputeMass"] = (function(arg0, arg1) {
  _emscripten_bind_b2ChainShape__ComputeMass_p2(this.ptr, arg0.ptr, arg1);
});

b2ChainShape.prototype["Clone"] = (function(arg0) {
  return wrapPointer(_emscripten_bind_b2ChainShape__Clone_p1(this.ptr, arg0.ptr), Module["b2Shape"]);
});

b2ChainShape.prototype["get_m_count"] = (function() {
  return _emscripten_bind_b2ChainShape__get_m_count_p0(this.ptr);
});

b2ChainShape.prototype["GetChildEdge"] = (function(arg0, arg1) {
  _emscripten_bind_b2ChainShape__GetChildEdge_p2(this.ptr, arg0.ptr, arg1);
});

b2ChainShape.prototype["ComputeAABB"] = (function(arg0, arg1, arg2) {
  _emscripten_bind_b2ChainShape__ComputeAABB_p3(this.ptr, arg0.ptr, arg1.ptr, arg2);
});

b2ChainShape.prototype["RayCast"] = (function(arg0, arg1, arg2, arg3) {
  return _emscripten_bind_b2ChainShape__RayCast_p4(this.ptr, arg0.ptr, arg1.ptr, arg2.ptr, arg3);
});

b2ChainShape.prototype["GetChildCount"] = (function() {
  return _emscripten_bind_b2ChainShape__GetChildCount_p0(this.ptr);
});

b2ChainShape.prototype["TestPoint"] = (function(arg0, arg1) {
  return _emscripten_bind_b2ChainShape__TestPoint_p2(this.ptr, arg0.ptr, arg1.ptr);
});

b2ChainShape.prototype["SetPrevVertex"] = (function(arg0) {
  _emscripten_bind_b2ChainShape__SetPrevVertex_p1(this.ptr, arg0.ptr);
});

b2ChainShape.prototype["CreateLoop"] = (function(arg0, arg1) {
  _emscripten_bind_b2ChainShape__CreateLoop_p2(this.ptr, arg0.ptr, arg1);
});

b2ChainShape.prototype["set_m_vertices"] = (function(arg0) {
  _emscripten_bind_b2ChainShape__set_m_vertices_p1(this.ptr, arg0.ptr);
});

b2ChainShape.prototype["SetNextVertex"] = (function(arg0) {
  _emscripten_bind_b2ChainShape__SetNextVertex_p1(this.ptr, arg0.ptr);
});

b2ChainShape.prototype["set_m_count"] = (function(arg0) {
  _emscripten_bind_b2ChainShape__set_m_count_p1(this.ptr, arg0);
});

function b2QueryCallback() {
  throw "b2QueryCallback is abstract!";
}

b2QueryCallback.prototype.__cache__ = {};

Module["b2QueryCallback"] = b2QueryCallback;

b2QueryCallback.prototype["ReportFixture"] = (function(arg0) {
  return _emscripten_bind_b2QueryCallback__ReportFixture_p1(this.ptr, arg0.ptr);
});

b2BlockAllocator.prototype["__destroy__"] = (function() {
  _emscripten_bind_b2BlockAllocator____destroy___p0(this.ptr);
});

b2BlockAllocator.prototype["Clear"] = (function() {
  _emscripten_bind_b2BlockAllocator__Clear_p0(this.ptr);
});

b2BlockAllocator.prototype["Free"] = (function(arg0, arg1) {
  _emscripten_bind_b2BlockAllocator__Free_p2(this.ptr, arg0, arg1);
});

b2BlockAllocator.prototype["Allocate"] = (function(arg0) {
  return _emscripten_bind_b2BlockAllocator__Allocate_p1(this.ptr, arg0);
});

b2PolygonShape.prototype["__destroy__"] = (function() {
  _emscripten_bind_b2PolygonShape____destroy___p0(this.ptr);
});

b2PolygonShape.prototype["Set"] = (function(arg0, arg1) {
  _emscripten_bind_b2PolygonShape__Set_p2(this.ptr, arg0.ptr, arg1);
});

b2PolygonShape.prototype["ComputeMass"] = (function(arg0, arg1) {
  _emscripten_bind_b2PolygonShape__ComputeMass_p2(this.ptr, arg0.ptr, arg1);
});

b2PolygonShape.prototype["set_m_radius"] = (function(arg0) {
  _emscripten_bind_b2PolygonShape__set_m_radius_p1(this.ptr, arg0);
});

b2PolygonShape.prototype["get_m_radius"] = (function() {
  return _emscripten_bind_b2PolygonShape__get_m_radius_p0(this.ptr);
});

b2PolygonShape.prototype["Clone"] = (function(arg0) {
  return wrapPointer(_emscripten_bind_b2PolygonShape__Clone_p1(this.ptr, arg0.ptr), Module["b2Shape"]);
});

b2PolygonShape.prototype["GetVertex"] = (function(arg0) {
  return wrapPointer(_emscripten_bind_b2PolygonShape__GetVertex_p1(this.ptr, arg0), Module["b2Vec2"]);
});

b2PolygonShape.prototype["RayCast"] = (function(arg0, arg1, arg2, arg3) {
  return _emscripten_bind_b2PolygonShape__RayCast_p4(this.ptr, arg0.ptr, arg1.ptr, arg2.ptr, arg3);
});

b2PolygonShape.prototype["SetAsBox"] = (function(arg0, arg1, arg2, arg3) {
  if (arg2 === undefined) _emscripten_bind_b2PolygonShape__SetAsBox_p2(this.ptr, arg0, arg1); else _emscripten_bind_b2PolygonShape__SetAsBox_p4(this.ptr, arg0, arg1, arg2.ptr, arg3);
});

b2PolygonShape.prototype["set_m_centroid"] = (function(arg0) {
  _emscripten_bind_b2PolygonShape__set_m_centroid_p1(this.ptr, arg0.ptr);
});

b2PolygonShape.prototype["ComputeAABB"] = (function(arg0, arg1, arg2) {
  _emscripten_bind_b2PolygonShape__ComputeAABB_p3(this.ptr, arg0.ptr, arg1.ptr, arg2);
});

b2PolygonShape.prototype["set_m_vertexCount"] = (function(arg0) {
  _emscripten_bind_b2PolygonShape__set_m_vertexCount_p1(this.ptr, arg0);
});

b2PolygonShape.prototype["GetVertexCount"] = (function() {
  return _emscripten_bind_b2PolygonShape__GetVertexCount_p0(this.ptr);
});

b2PolygonShape.prototype["GetChildCount"] = (function() {
  return _emscripten_bind_b2PolygonShape__GetChildCount_p0(this.ptr);
});

b2PolygonShape.prototype["TestPoint"] = (function(arg0, arg1) {
  return _emscripten_bind_b2PolygonShape__TestPoint_p2(this.ptr, arg0.ptr, arg1.ptr);
});

b2PolygonShape.prototype["GetType"] = (function() {
  return _emscripten_bind_b2PolygonShape__GetType_p0(this.ptr);
});

b2PolygonShape.prototype["get_m_vertexCount"] = (function() {
  return _emscripten_bind_b2PolygonShape__get_m_vertexCount_p0(this.ptr);
});

b2PolygonShape.prototype["get_m_centroid"] = (function() {
  return wrapPointer(_emscripten_bind_b2PolygonShape__get_m_centroid_p0(this.ptr), Module["b2Vec2"]);
});

b2EdgeShape.prototype["__destroy__"] = (function() {
  _emscripten_bind_b2EdgeShape____destroy___p0(this.ptr);
});

b2EdgeShape.prototype["Set"] = (function(arg0, arg1) {
  _emscripten_bind_b2EdgeShape__Set_p2(this.ptr, arg0.ptr, arg1.ptr);
});

b2EdgeShape.prototype["ComputeMass"] = (function(arg0, arg1) {
  _emscripten_bind_b2EdgeShape__ComputeMass_p2(this.ptr, arg0.ptr, arg1);
});

b2EdgeShape.prototype["set_m_radius"] = (function(arg0) {
  _emscripten_bind_b2EdgeShape__set_m_radius_p1(this.ptr, arg0);
});

b2EdgeShape.prototype["get_m_radius"] = (function() {
  return _emscripten_bind_b2EdgeShape__get_m_radius_p0(this.ptr);
});

b2EdgeShape.prototype["Clone"] = (function(arg0) {
  return wrapPointer(_emscripten_bind_b2EdgeShape__Clone_p1(this.ptr, arg0.ptr), Module["b2Shape"]);
});

b2EdgeShape.prototype["GetType"] = (function() {
  return _emscripten_bind_b2EdgeShape__GetType_p0(this.ptr);
});

b2EdgeShape.prototype["RayCast"] = (function(arg0, arg1, arg2, arg3) {
  return _emscripten_bind_b2EdgeShape__RayCast_p4(this.ptr, arg0.ptr, arg1.ptr, arg2.ptr, arg3);
});

b2EdgeShape.prototype["ComputeAABB"] = (function(arg0, arg1, arg2) {
  _emscripten_bind_b2EdgeShape__ComputeAABB_p3(this.ptr, arg0.ptr, arg1.ptr, arg2);
});

b2EdgeShape.prototype["GetChildCount"] = (function() {
  return _emscripten_bind_b2EdgeShape__GetChildCount_p0(this.ptr);
});

b2EdgeShape.prototype["TestPoint"] = (function(arg0, arg1) {
  return _emscripten_bind_b2EdgeShape__TestPoint_p2(this.ptr, arg0.ptr, arg1.ptr);
});

function b2Contact() {
  throw "b2Contact is abstract!";
}

b2Contact.prototype.__cache__ = {};

Module["b2Contact"] = b2Contact;

b2Contact.prototype["GetNext"] = (function() {
  return wrapPointer(_emscripten_bind_b2Contact__GetNext_p0(this.ptr), Module["b2Contact"]);
});

b2Contact.prototype["SetEnabled"] = (function(arg0) {
  _emscripten_bind_b2Contact__SetEnabled_p1(this.ptr, arg0);
});

b2Contact.prototype["GetWorldManifold"] = (function(arg0) {
  _emscripten_bind_b2Contact__GetWorldManifold_p1(this.ptr, arg0.ptr);
});

b2Contact.prototype["GetRestitution"] = (function() {
  return _emscripten_bind_b2Contact__GetRestitution_p0(this.ptr);
});

b2Contact.prototype["ResetFriction"] = (function() {
  _emscripten_bind_b2Contact__ResetFriction_p0(this.ptr);
});

b2Contact.prototype["GetFriction"] = (function() {
  return _emscripten_bind_b2Contact__GetFriction_p0(this.ptr);
});

b2Contact.prototype["IsTouching"] = (function() {
  return _emscripten_bind_b2Contact__IsTouching_p0(this.ptr);
});

b2Contact.prototype["IsEnabled"] = (function() {
  return _emscripten_bind_b2Contact__IsEnabled_p0(this.ptr);
});

b2Contact.prototype["GetFixtureB"] = (function() {
  return wrapPointer(_emscripten_bind_b2Contact__GetFixtureB_p0(this.ptr), Module["b2Fixture"]);
});

b2Contact.prototype["SetFriction"] = (function(arg0) {
  _emscripten_bind_b2Contact__SetFriction_p1(this.ptr, arg0);
});

b2Contact.prototype["GetFixtureA"] = (function() {
  return wrapPointer(_emscripten_bind_b2Contact__GetFixtureA_p0(this.ptr), Module["b2Fixture"]);
});

b2Contact.prototype["GetChildIndexA"] = (function() {
  return _emscripten_bind_b2Contact__GetChildIndexA_p0(this.ptr);
});

b2Contact.prototype["GetChildIndexB"] = (function() {
  return _emscripten_bind_b2Contact__GetChildIndexB_p0(this.ptr);
});

b2Contact.prototype["Evaluate"] = (function(arg0, arg1, arg2) {
  _emscripten_bind_b2Contact__Evaluate_p3(this.ptr, arg0.ptr, arg1.ptr, arg2.ptr);
});

b2Contact.prototype["SetRestitution"] = (function(arg0) {
  _emscripten_bind_b2Contact__SetRestitution_p1(this.ptr, arg0);
});

b2Contact.prototype["GetManifold"] = (function() {
  return wrapPointer(_emscripten_bind_b2Contact__GetManifold_p0(this.ptr), Module["b2Manifold"]);
});

b2Contact.prototype["ResetRestitution"] = (function() {
  _emscripten_bind_b2Contact__ResetRestitution_p0(this.ptr);
});

function b2Shape() {
  throw "b2Shape is abstract!";
}

b2Shape.prototype.__cache__ = {};

Module["b2Shape"] = b2Shape;

b2Shape.prototype["get_m_radius"] = (function() {
  return _emscripten_bind_b2Shape__get_m_radius_p0(this.ptr);
});

b2Shape.prototype["ComputeMass"] = (function(arg0, arg1) {
  _emscripten_bind_b2Shape__ComputeMass_p2(this.ptr, arg0.ptr, arg1);
});

b2Shape.prototype["set_m_radius"] = (function(arg0) {
  _emscripten_bind_b2Shape__set_m_radius_p1(this.ptr, arg0);
});

b2Shape.prototype["Clone"] = (function(arg0) {
  return wrapPointer(_emscripten_bind_b2Shape__Clone_p1(this.ptr, arg0.ptr), Module["b2Shape"]);
});

b2Shape.prototype["GetType"] = (function() {
  return _emscripten_bind_b2Shape__GetType_p0(this.ptr);
});

b2Shape.prototype["RayCast"] = (function(arg0, arg1, arg2, arg3) {
  return _emscripten_bind_b2Shape__RayCast_p4(this.ptr, arg0.ptr, arg1.ptr, arg2.ptr, arg3);
});

b2Shape.prototype["ComputeAABB"] = (function(arg0, arg1, arg2) {
  _emscripten_bind_b2Shape__ComputeAABB_p3(this.ptr, arg0.ptr, arg1.ptr, arg2);
});

b2Shape.prototype["GetChildCount"] = (function() {
  return _emscripten_bind_b2Shape__GetChildCount_p0(this.ptr);
});

b2Shape.prototype["TestPoint"] = (function(arg0, arg1) {
  return _emscripten_bind_b2Shape__TestPoint_p2(this.ptr, arg0.ptr, arg1.ptr);
});

function b2Body() {
  throw "b2Body is abstract!";
}

b2Body.prototype.__cache__ = {};

Module["b2Body"] = b2Body;

b2Body.prototype["GetAngle"] = (function() {
  return _emscripten_bind_b2Body__GetAngle_p0(this.ptr);
});

b2Body.prototype["GetUserData"] = (function() {
  return _emscripten_bind_b2Body__GetUserData_p0(this.ptr);
});

b2Body.prototype["IsSleepingAllowed"] = (function() {
  return _emscripten_bind_b2Body__IsSleepingAllowed_p0(this.ptr);
});

b2Body.prototype["SetAngularDamping"] = (function(arg0) {
  _emscripten_bind_b2Body__SetAngularDamping_p1(this.ptr, arg0);
});

b2Body.prototype["SetActive"] = (function(arg0) {
  _emscripten_bind_b2Body__SetActive_p1(this.ptr, arg0);
});

b2Body.prototype["SetGravityScale"] = (function(arg0) {
  _emscripten_bind_b2Body__SetGravityScale_p1(this.ptr, arg0);
});

b2Body.prototype["SetUserData"] = (function(arg0) {
  _emscripten_bind_b2Body__SetUserData_p1(this.ptr, arg0);
});

b2Body.prototype["GetAngularVelocity"] = (function() {
  return _emscripten_bind_b2Body__GetAngularVelocity_p0(this.ptr);
});

b2Body.prototype["GetFixtureList"] = (function() {
  return wrapPointer(_emscripten_bind_b2Body__GetFixtureList_p0(this.ptr), Module["b2Fixture"]);
});

b2Body.prototype["ApplyForce"] = (function(arg0, arg1) {
  _emscripten_bind_b2Body__ApplyForce_p2(this.ptr, arg0.ptr, arg1.ptr);
});

b2Body.prototype["GetLocalPoint"] = (function(arg0) {
  return wrapPointer(_emscripten_bind_b2Body__GetLocalPoint_p1(this.ptr, arg0.ptr), Module["b2Vec2"]);
});

b2Body.prototype["SetLinearVelocity"] = (function(arg0) {
  _emscripten_bind_b2Body__SetLinearVelocity_p1(this.ptr, arg0.ptr);
});

b2Body.prototype["GetJointList"] = (function() {
  return wrapPointer(_emscripten_bind_b2Body__GetJointList_p0(this.ptr), Module["b2JointEdge"]);
});

b2Body.prototype["GetLinearVelocity"] = (function() {
  return wrapPointer(_emscripten_bind_b2Body__GetLinearVelocity_p0(this.ptr), Module["b2Vec2"]);
});

b2Body.prototype["GetNext"] = (function() {
  return wrapPointer(_emscripten_bind_b2Body__GetNext_p0(this.ptr), Module["b2Body"]);
});

b2Body.prototype["SetSleepingAllowed"] = (function(arg0) {
  _emscripten_bind_b2Body__SetSleepingAllowed_p1(this.ptr, arg0);
});

b2Body.prototype["SetTransform"] = (function(arg0, arg1) {
  _emscripten_bind_b2Body__SetTransform_p2(this.ptr, arg0.ptr, arg1);
});

b2Body.prototype["GetMass"] = (function() {
  return _emscripten_bind_b2Body__GetMass_p0(this.ptr);
});

b2Body.prototype["SetAngularVelocity"] = (function(arg0) {
  _emscripten_bind_b2Body__SetAngularVelocity_p1(this.ptr, arg0);
});

b2Body.prototype["GetMassData"] = (function(arg0) {
  _emscripten_bind_b2Body__GetMassData_p1(this.ptr, arg0.ptr);
});

b2Body.prototype["GetLinearVelocityFromWorldPoint"] = (function(arg0) {
  return wrapPointer(_emscripten_bind_b2Body__GetLinearVelocityFromWorldPoint_p1(this.ptr, arg0.ptr), Module["b2Vec2"]);
});

b2Body.prototype["ResetMassData"] = (function() {
  _emscripten_bind_b2Body__ResetMassData_p0(this.ptr);
});

b2Body.prototype["ApplyForceToCenter"] = (function(arg0) {
  _emscripten_bind_b2Body__ApplyForceToCenter_p1(this.ptr, arg0.ptr);
});

b2Body.prototype["ApplyTorque"] = (function(arg0) {
  _emscripten_bind_b2Body__ApplyTorque_p1(this.ptr, arg0);
});

b2Body.prototype["IsAwake"] = (function() {
  return _emscripten_bind_b2Body__IsAwake_p0(this.ptr);
});

b2Body.prototype["SetType"] = (function(arg0) {
  _emscripten_bind_b2Body__SetType_p1(this.ptr, arg0);
});

b2Body.prototype["CreateFixture"] = (function(arg0, arg1) {
  if (arg1 === undefined) return wrapPointer(_emscripten_bind_b2Body__CreateFixture_p1(this.ptr, arg0.ptr), Module["b2Fixture"]); else return wrapPointer(_emscripten_bind_b2Body__CreateFixture_p2(this.ptr, arg0.ptr, arg1), Module["b2Fixture"]);
});

b2Body.prototype["SetMassData"] = (function(arg0) {
  _emscripten_bind_b2Body__SetMassData_p1(this.ptr, arg0.ptr);
});

b2Body.prototype["GetTransform"] = (function() {
  return wrapPointer(_emscripten_bind_b2Body__GetTransform_p0(this.ptr), Module["b2Transform"]);
});

b2Body.prototype["GetWorldCenter"] = (function() {
  return wrapPointer(_emscripten_bind_b2Body__GetWorldCenter_p0(this.ptr), Module["b2Vec2"]);
});

b2Body.prototype["GetAngularDamping"] = (function() {
  return _emscripten_bind_b2Body__GetAngularDamping_p0(this.ptr);
});

b2Body.prototype["ApplyLinearImpulse"] = (function(arg0, arg1) {
  _emscripten_bind_b2Body__ApplyLinearImpulse_p2(this.ptr, arg0.ptr, arg1.ptr);
});

b2Body.prototype["IsFixedRotation"] = (function() {
  return _emscripten_bind_b2Body__IsFixedRotation_p0(this.ptr);
});

b2Body.prototype["GetLocalCenter"] = (function() {
  return wrapPointer(_emscripten_bind_b2Body__GetLocalCenter_p0(this.ptr), Module["b2Vec2"]);
});

b2Body.prototype["GetWorldVector"] = (function(arg0) {
  return wrapPointer(_emscripten_bind_b2Body__GetWorldVector_p1(this.ptr, arg0.ptr), Module["b2Vec2"]);
});

b2Body.prototype["GetLinearVelocityFromLocalPoint"] = (function(arg0) {
  return wrapPointer(_emscripten_bind_b2Body__GetLinearVelocityFromLocalPoint_p1(this.ptr, arg0.ptr), Module["b2Vec2"]);
});

b2Body.prototype["GetContactList"] = (function() {
  return wrapPointer(_emscripten_bind_b2Body__GetContactList_p0(this.ptr), Module["b2ContactEdge"]);
});

b2Body.prototype["GetWorldPoint"] = (function(arg0) {
  return wrapPointer(_emscripten_bind_b2Body__GetWorldPoint_p1(this.ptr, arg0.ptr), Module["b2Vec2"]);
});

b2Body.prototype["SetAwake"] = (function(arg0) {
  _emscripten_bind_b2Body__SetAwake_p1(this.ptr, arg0);
});

b2Body.prototype["GetLinearDamping"] = (function() {
  return _emscripten_bind_b2Body__GetLinearDamping_p0(this.ptr);
});

b2Body.prototype["IsBullet"] = (function() {
  return _emscripten_bind_b2Body__IsBullet_p0(this.ptr);
});

b2Body.prototype["GetWorld"] = (function() {
  return wrapPointer(_emscripten_bind_b2Body__GetWorld_p0(this.ptr), Module["b2World"]);
});

b2Body.prototype["GetLocalVector"] = (function(arg0) {
  return wrapPointer(_emscripten_bind_b2Body__GetLocalVector_p1(this.ptr, arg0.ptr), Module["b2Vec2"]);
});

b2Body.prototype["SetLinearDamping"] = (function(arg0) {
  _emscripten_bind_b2Body__SetLinearDamping_p1(this.ptr, arg0);
});

b2Body.prototype["Dump"] = (function() {
  _emscripten_bind_b2Body__Dump_p0(this.ptr);
});

b2Body.prototype["SetBullet"] = (function(arg0) {
  _emscripten_bind_b2Body__SetBullet_p1(this.ptr, arg0);
});

b2Body.prototype["GetType"] = (function() {
  return _emscripten_bind_b2Body__GetType_p0(this.ptr);
});

b2Body.prototype["GetGravityScale"] = (function() {
  return _emscripten_bind_b2Body__GetGravityScale_p0(this.ptr);
});

b2Body.prototype["DestroyFixture"] = (function(arg0) {
  _emscripten_bind_b2Body__DestroyFixture_p1(this.ptr, arg0.ptr);
});

b2Body.prototype["GetInertia"] = (function() {
  return _emscripten_bind_b2Body__GetInertia_p0(this.ptr);
});

b2Body.prototype["IsActive"] = (function() {
  return _emscripten_bind_b2Body__IsActive_p0(this.ptr);
});

b2Body.prototype["SetFixedRotation"] = (function(arg0) {
  _emscripten_bind_b2Body__SetFixedRotation_p1(this.ptr, arg0);
});

b2Body.prototype["ApplyAngularImpulse"] = (function(arg0) {
  _emscripten_bind_b2Body__ApplyAngularImpulse_p1(this.ptr, arg0);
});

b2Body.prototype["GetPosition"] = (function() {
  return wrapPointer(_emscripten_bind_b2Body__GetPosition_p0(this.ptr), Module["b2Vec2"]);
});

b2StackAllocator.prototype["GetMaxAllocation"] = (function() {
  return _emscripten_bind_b2StackAllocator__GetMaxAllocation_p0(this.ptr);
});

b2StackAllocator.prototype["__destroy__"] = (function() {
  _emscripten_bind_b2StackAllocator____destroy___p0(this.ptr);
});

b2StackAllocator.prototype["Allocate"] = (function(arg0) {
  return _emscripten_bind_b2StackAllocator__Allocate_p1(this.ptr, arg0);
});

b2StackAllocator.prototype["Free"] = (function(arg0) {
  _emscripten_bind_b2StackAllocator__Free_p1(this.ptr, arg0);
});

function b2DestructionListener() {
  throw "b2DestructionListener is abstract!";
}

b2DestructionListener.prototype.__cache__ = {};

Module["b2DestructionListener"] = b2DestructionListener;

b2DestructionListener.prototype["SayGoodbye"] = (function(arg0) {
  _emscripten_bind_b2DestructionListener__SayGoodbye_p1(this.ptr, arg0.ptr);
});

b2Filter.prototype["__destroy__"] = (function() {
  _emscripten_bind_b2Filter____destroy___p0(this.ptr);
});

b2Filter.prototype["set_maskBits"] = (function(arg0) {
  _emscripten_bind_b2Filter__set_maskBits_p1(this.ptr, arg0);
});

b2Filter.prototype["set_categoryBits"] = (function(arg0) {
  _emscripten_bind_b2Filter__set_categoryBits_p1(this.ptr, arg0);
});

b2Filter.prototype["get_groupIndex"] = (function() {
  return _emscripten_bind_b2Filter__get_groupIndex_p0(this.ptr);
});

b2Filter.prototype["set_groupIndex"] = (function(arg0) {
  _emscripten_bind_b2Filter__set_groupIndex_p1(this.ptr, arg0);
});

b2Filter.prototype["get_maskBits"] = (function() {
  return _emscripten_bind_b2Filter__get_maskBits_p0(this.ptr);
});

b2Filter.prototype["get_categoryBits"] = (function() {
  return _emscripten_bind_b2Filter__get_categoryBits_p0(this.ptr);
});

b2BodyDef.prototype["get_linearDamping"] = (function() {
  return _emscripten_bind_b2BodyDef__get_linearDamping_p0(this.ptr);
});

b2BodyDef.prototype["get_awake"] = (function() {
  return _emscripten_bind_b2BodyDef__get_awake_p0(this.ptr);
});

b2BodyDef.prototype["get_type"] = (function() {
  return _emscripten_bind_b2BodyDef__get_type_p0(this.ptr);
});

b2BodyDef.prototype["get_allowSleep"] = (function() {
  return _emscripten_bind_b2BodyDef__get_allowSleep_p0(this.ptr);
});

b2BodyDef.prototype["set_position"] = (function(arg0) {
  _emscripten_bind_b2BodyDef__set_position_p1(this.ptr, arg0.ptr);
});

b2BodyDef.prototype["set_linearVelocity"] = (function(arg0) {
  _emscripten_bind_b2BodyDef__set_linearVelocity_p1(this.ptr, arg0.ptr);
});

b2BodyDef.prototype["get_bullet"] = (function() {
  return _emscripten_bind_b2BodyDef__get_bullet_p0(this.ptr);
});

b2BodyDef.prototype["get_userData"] = (function() {
  return _emscripten_bind_b2BodyDef__get_userData_p0(this.ptr);
});

b2BodyDef.prototype["set_angularDamping"] = (function(arg0) {
  _emscripten_bind_b2BodyDef__set_angularDamping_p1(this.ptr, arg0);
});

b2BodyDef.prototype["set_fixedRotation"] = (function(arg0) {
  _emscripten_bind_b2BodyDef__set_fixedRotation_p1(this.ptr, arg0);
});

b2BodyDef.prototype["set_allowSleep"] = (function(arg0) {
  _emscripten_bind_b2BodyDef__set_allowSleep_p1(this.ptr, arg0);
});

b2BodyDef.prototype["get_gravityScale"] = (function() {
  return _emscripten_bind_b2BodyDef__get_gravityScale_p0(this.ptr);
});

b2BodyDef.prototype["set_angularVelocity"] = (function(arg0) {
  _emscripten_bind_b2BodyDef__set_angularVelocity_p1(this.ptr, arg0);
});

b2BodyDef.prototype["set_userData"] = (function(arg0) {
  _emscripten_bind_b2BodyDef__set_userData_p1(this.ptr, arg0);
});

b2BodyDef.prototype["get_position"] = (function() {
  return wrapPointer(_emscripten_bind_b2BodyDef__get_position_p0(this.ptr), Module["b2Vec2"]);
});

b2BodyDef.prototype["__destroy__"] = (function() {
  _emscripten_bind_b2BodyDef____destroy___p0(this.ptr);
});

b2BodyDef.prototype["set_type"] = (function(arg0) {
  _emscripten_bind_b2BodyDef__set_type_p1(this.ptr, arg0);
});

b2BodyDef.prototype["set_gravityScale"] = (function(arg0) {
  _emscripten_bind_b2BodyDef__set_gravityScale_p1(this.ptr, arg0);
});

b2BodyDef.prototype["get_angularDamping"] = (function() {
  return _emscripten_bind_b2BodyDef__get_angularDamping_p0(this.ptr);
});

b2BodyDef.prototype["set_bullet"] = (function(arg0) {
  _emscripten_bind_b2BodyDef__set_bullet_p1(this.ptr, arg0);
});

b2BodyDef.prototype["set_active"] = (function(arg0) {
  _emscripten_bind_b2BodyDef__set_active_p1(this.ptr, arg0);
});

b2BodyDef.prototype["set_angle"] = (function(arg0) {
  _emscripten_bind_b2BodyDef__set_angle_p1(this.ptr, arg0);
});

b2BodyDef.prototype["get_angle"] = (function() {
  return _emscripten_bind_b2BodyDef__get_angle_p0(this.ptr);
});

b2BodyDef.prototype["get_angularVelocity"] = (function() {
  return _emscripten_bind_b2BodyDef__get_angularVelocity_p0(this.ptr);
});

b2BodyDef.prototype["get_linearVelocity"] = (function() {
  return wrapPointer(_emscripten_bind_b2BodyDef__get_linearVelocity_p0(this.ptr), Module["b2Vec2"]);
});

b2BodyDef.prototype["get_active"] = (function() {
  return _emscripten_bind_b2BodyDef__get_active_p0(this.ptr);
});

b2BodyDef.prototype["set_linearDamping"] = (function(arg0) {
  _emscripten_bind_b2BodyDef__set_linearDamping_p1(this.ptr, arg0);
});

b2BodyDef.prototype["get_fixedRotation"] = (function() {
  return _emscripten_bind_b2BodyDef__get_fixedRotation_p0(this.ptr);
});

b2BodyDef.prototype["set_awake"] = (function(arg0) {
  _emscripten_bind_b2BodyDef__set_awake_p1(this.ptr, arg0);
});

b2FrictionJointDef.prototype["set_localAnchorA"] = (function(arg0) {
  _emscripten_bind_b2FrictionJointDef__set_localAnchorA_p1(this.ptr, arg0.ptr);
});

b2FrictionJointDef.prototype["__destroy__"] = (function() {
  _emscripten_bind_b2FrictionJointDef____destroy___p0(this.ptr);
});

b2FrictionJointDef.prototype["set_localAnchorB"] = (function(arg0) {
  _emscripten_bind_b2FrictionJointDef__set_localAnchorB_p1(this.ptr, arg0.ptr);
});

b2FrictionJointDef.prototype["get_maxForce"] = (function() {
  return _emscripten_bind_b2FrictionJointDef__get_maxForce_p0(this.ptr);
});

b2FrictionJointDef.prototype["get_localAnchorA"] = (function() {
  return wrapPointer(_emscripten_bind_b2FrictionJointDef__get_localAnchorA_p0(this.ptr), Module["b2Vec2"]);
});

b2FrictionJointDef.prototype["set_maxForce"] = (function(arg0) {
  _emscripten_bind_b2FrictionJointDef__set_maxForce_p1(this.ptr, arg0);
});

b2FrictionJointDef.prototype["get_localAnchorB"] = (function() {
  return wrapPointer(_emscripten_bind_b2FrictionJointDef__get_localAnchorB_p0(this.ptr), Module["b2Vec2"]);
});

b2FrictionJointDef.prototype["set_maxTorque"] = (function(arg0) {
  _emscripten_bind_b2FrictionJointDef__set_maxTorque_p1(this.ptr, arg0);
});

b2FrictionJointDef.prototype["get_maxTorque"] = (function() {
  return _emscripten_bind_b2FrictionJointDef__get_maxTorque_p0(this.ptr);
});

b2FrictionJointDef.prototype["Initialize"] = (function(arg0, arg1, arg2) {
  _emscripten_bind_b2FrictionJointDef__Initialize_p3(this.ptr, arg0.ptr, arg1.ptr, arg2.ptr);
});

__sFILE.prototype["set__flags"] = (function(arg0) {
  _emscripten_bind___sFILE__set__flags_p1(this.ptr, arg0);
});

__sFILE.prototype["get__w"] = (function() {
  return _emscripten_bind___sFILE__get__w_p0(this.ptr);
});

__sFILE.prototype["get__p"] = (function() {
  return _emscripten_bind___sFILE__get__p_p0(this.ptr);
});

__sFILE.prototype["get__r"] = (function() {
  return _emscripten_bind___sFILE__get__r_p0(this.ptr);
});

__sFILE.prototype["set__lbfsize"] = (function(arg0) {
  _emscripten_bind___sFILE__set__lbfsize_p1(this.ptr, arg0);
});

__sFILE.prototype["set__lock"] = (function(arg0) {
  _emscripten_bind___sFILE__set__lock_p1(this.ptr, arg0);
});

__sFILE.prototype["get__flags2"] = (function() {
  return _emscripten_bind___sFILE__get__flags2_p0(this.ptr);
});

__sFILE.prototype["get__ur"] = (function() {
  return _emscripten_bind___sFILE__get__ur_p0(this.ptr);
});

__sFILE.prototype["set__offset"] = (function(arg0) {
  _emscripten_bind___sFILE__set__offset_p1(this.ptr, arg0);
});

__sFILE.prototype["get__up"] = (function() {
  return _emscripten_bind___sFILE__get__up_p0(this.ptr);
});

__sFILE.prototype["get__mbstate"] = (function() {
  return _emscripten_bind___sFILE__get__mbstate_p0(this.ptr);
});

__sFILE.prototype["get__blksize"] = (function() {
  return _emscripten_bind___sFILE__get__blksize_p0(this.ptr);
});

__sFILE.prototype["set__cookie"] = (function(arg0) {
  _emscripten_bind___sFILE__set__cookie_p1(this.ptr, arg0);
});

__sFILE.prototype["get__flags"] = (function() {
  return _emscripten_bind___sFILE__get__flags_p0(this.ptr);
});

__sFILE.prototype["set__file"] = (function(arg0) {
  _emscripten_bind___sFILE__set__file_p1(this.ptr, arg0);
});

__sFILE.prototype["set__mbstate"] = (function(arg0) {
  _emscripten_bind___sFILE__set__mbstate_p1(this.ptr, arg0);
});

__sFILE.prototype["get__file"] = (function() {
  return _emscripten_bind___sFILE__get__file_p0(this.ptr);
});

__sFILE.prototype["get__lock"] = (function() {
  return _emscripten_bind___sFILE__get__lock_p0(this.ptr);
});

__sFILE.prototype["set__flags2"] = (function(arg0) {
  _emscripten_bind___sFILE__set__flags2_p1(this.ptr, arg0);
});

__sFILE.prototype["get__cookie"] = (function() {
  return _emscripten_bind___sFILE__get__cookie_p0(this.ptr);
});

__sFILE.prototype["get__offset"] = (function() {
  return _emscripten_bind___sFILE__get__offset_p0(this.ptr);
});

__sFILE.prototype["__destroy__"] = (function() {
  _emscripten_bind___sFILE____destroy___p0(this.ptr);
});

__sFILE.prototype["set__ur"] = (function(arg0) {
  _emscripten_bind___sFILE__set__ur_p1(this.ptr, arg0);
});

__sFILE.prototype["set__up"] = (function(arg0) {
  var stack = Runtime.stackSave();
  try {
    _emscripten_bind___sFILE__set__up_p1(this.ptr, ensureString(arg0));
  } finally {
    Runtime.stackRestore(stack);
  }
});

__sFILE.prototype["set__p"] = (function(arg0) {
  var stack = Runtime.stackSave();
  try {
    _emscripten_bind___sFILE__set__p_p1(this.ptr, ensureString(arg0));
  } finally {
    Runtime.stackRestore(stack);
  }
});

__sFILE.prototype["set__r"] = (function(arg0) {
  _emscripten_bind___sFILE__set__r_p1(this.ptr, arg0);
});

__sFILE.prototype["set__w"] = (function(arg0) {
  _emscripten_bind___sFILE__set__w_p1(this.ptr, arg0);
});

__sFILE.prototype["set__blksize"] = (function(arg0) {
  _emscripten_bind___sFILE__set__blksize_p1(this.ptr, arg0);
});

__sFILE.prototype["get__lbfsize"] = (function() {
  return _emscripten_bind___sFILE__get__lbfsize_p0(this.ptr);
});

b2Vec2.prototype["Normalize"] = (function() {
  return _emscripten_bind_b2Vec2__Normalize_p0(this.ptr);
});

b2Vec2.prototype["set_x"] = (function(arg0) {
  _emscripten_bind_b2Vec2__set_x_p1(this.ptr, arg0);
});

b2Vec2.prototype["Set"] = (function(arg0, arg1) {
  _emscripten_bind_b2Vec2__Set_p2(this.ptr, arg0, arg1);
});

b2Vec2.prototype["get_x"] = (function() {
  return _emscripten_bind_b2Vec2__get_x_p0(this.ptr);
});

b2Vec2.prototype["get_y"] = (function() {
  return _emscripten_bind_b2Vec2__get_y_p0(this.ptr);
});

b2Vec2.prototype["set_y"] = (function(arg0) {
  _emscripten_bind_b2Vec2__set_y_p1(this.ptr, arg0);
});

b2Vec2.prototype["IsValid"] = (function() {
  return _emscripten_bind_b2Vec2__IsValid_p0(this.ptr);
});

b2Vec2.prototype["Skew"] = (function() {
  return wrapPointer(_emscripten_bind_b2Vec2__Skew_p0(this.ptr), Module["b2Vec2"]);
});

b2Vec2.prototype["LengthSquared"] = (function() {
  return _emscripten_bind_b2Vec2__LengthSquared_p0(this.ptr);
});

b2Vec2.prototype["op_add"] = (function(arg0) {
  _emscripten_bind_b2Vec2__op_add_p1(this.ptr, arg0.ptr);
});

b2Vec2.prototype["SetZero"] = (function() {
  _emscripten_bind_b2Vec2__SetZero_p0(this.ptr);
});

b2Vec2.prototype["Length"] = (function() {
  return _emscripten_bind_b2Vec2__Length_p0(this.ptr);
});

b2Vec2.prototype["__destroy__"] = (function() {
  _emscripten_bind_b2Vec2____destroy___p0(this.ptr);
});

b2Vec2.prototype["op_mul"] = (function(arg0) {
  _emscripten_bind_b2Vec2__op_mul_p1(this.ptr, arg0);
});

b2Vec2.prototype["op_sub"] = (function() {
  return wrapPointer(_emscripten_bind_b2Vec2__op_sub_p0(this.ptr), Module["b2Vec2"]);
});

b2Vec3.prototype["__destroy__"] = (function() {
  _emscripten_bind_b2Vec3____destroy___p0(this.ptr);
});

b2Vec3.prototype["set_z"] = (function(arg0) {
  _emscripten_bind_b2Vec3__set_z_p1(this.ptr, arg0);
});

b2Vec3.prototype["Set"] = (function(arg0, arg1, arg2) {
  _emscripten_bind_b2Vec3__Set_p3(this.ptr, arg0, arg1, arg2);
});

b2Vec3.prototype["get_z"] = (function() {
  return _emscripten_bind_b2Vec3__get_z_p0(this.ptr);
});

b2Vec3.prototype["op_add"] = (function(arg0) {
  _emscripten_bind_b2Vec3__op_add_p1(this.ptr, arg0.ptr);
});

b2Vec3.prototype["SetZero"] = (function() {
  _emscripten_bind_b2Vec3__SetZero_p0(this.ptr);
});

b2Vec3.prototype["op_mul"] = (function(arg0) {
  _emscripten_bind_b2Vec3__op_mul_p1(this.ptr, arg0);
});

b2Vec3.prototype["op_sub"] = (function() {
  return wrapPointer(_emscripten_bind_b2Vec3__op_sub_p0(this.ptr), Module["b2Vec3"]);
});

b2FixtureDef.prototype["__destroy__"] = (function() {
  _emscripten_bind_b2FixtureDef____destroy___p0(this.ptr);
});

b2FixtureDef.prototype["get_isSensor"] = (function() {
  return _emscripten_bind_b2FixtureDef__get_isSensor_p0(this.ptr);
});

b2FixtureDef.prototype["set_userData"] = (function(arg0) {
  _emscripten_bind_b2FixtureDef__set_userData_p1(this.ptr, arg0);
});

b2FixtureDef.prototype["set_shape"] = (function(arg0) {
  _emscripten_bind_b2FixtureDef__set_shape_p1(this.ptr, arg0.ptr);
});

b2FixtureDef.prototype["get_density"] = (function() {
  return _emscripten_bind_b2FixtureDef__get_density_p0(this.ptr);
});

b2FixtureDef.prototype["get_shape"] = (function() {
  return _emscripten_bind_b2FixtureDef__get_shape_p0(this.ptr);
});

b2FixtureDef.prototype["set_density"] = (function(arg0) {
  _emscripten_bind_b2FixtureDef__set_density_p1(this.ptr, arg0);
});

b2FixtureDef.prototype["set_restitution"] = (function(arg0) {
  _emscripten_bind_b2FixtureDef__set_restitution_p1(this.ptr, arg0);
});

b2FixtureDef.prototype["get_restitution"] = (function() {
  return _emscripten_bind_b2FixtureDef__get_restitution_p0(this.ptr);
});

b2FixtureDef.prototype["set_isSensor"] = (function(arg0) {
  _emscripten_bind_b2FixtureDef__set_isSensor_p1(this.ptr, arg0);
});

b2FixtureDef.prototype["get_filter"] = (function() {
  return wrapPointer(_emscripten_bind_b2FixtureDef__get_filter_p0(this.ptr), Module["b2Filter"]);
});

b2FixtureDef.prototype["get_friction"] = (function() {
  return _emscripten_bind_b2FixtureDef__get_friction_p0(this.ptr);
});

b2FixtureDef.prototype["set_friction"] = (function(arg0) {
  _emscripten_bind_b2FixtureDef__set_friction_p1(this.ptr, arg0);
});

b2FixtureDef.prototype["get_userData"] = (function() {
  return _emscripten_bind_b2FixtureDef__get_userData_p0(this.ptr);
});

b2FixtureDef.prototype["set_filter"] = (function(arg0) {
  _emscripten_bind_b2FixtureDef__set_filter_p1(this.ptr, arg0.ptr);
});

b2PrismaticJointDef.prototype["set_localAnchorA"] = (function(arg0) {
  _emscripten_bind_b2PrismaticJointDef__set_localAnchorA_p1(this.ptr, arg0.ptr);
});

b2PrismaticJointDef.prototype["set_localAnchorB"] = (function(arg0) {
  _emscripten_bind_b2PrismaticJointDef__set_localAnchorB_p1(this.ptr, arg0.ptr);
});

b2PrismaticJointDef.prototype["get_motorSpeed"] = (function() {
  return _emscripten_bind_b2PrismaticJointDef__get_motorSpeed_p0(this.ptr);
});

b2PrismaticJointDef.prototype["get_enableMotor"] = (function() {
  return _emscripten_bind_b2PrismaticJointDef__get_enableMotor_p0(this.ptr);
});

b2PrismaticJointDef.prototype["get_referenceAngle"] = (function() {
  return _emscripten_bind_b2PrismaticJointDef__get_referenceAngle_p0(this.ptr);
});

b2PrismaticJointDef.prototype["set_enableLimit"] = (function(arg0) {
  _emscripten_bind_b2PrismaticJointDef__set_enableLimit_p1(this.ptr, arg0);
});

b2PrismaticJointDef.prototype["set_motorSpeed"] = (function(arg0) {
  _emscripten_bind_b2PrismaticJointDef__set_motorSpeed_p1(this.ptr, arg0);
});

b2PrismaticJointDef.prototype["get_localAxisA"] = (function() {
  return wrapPointer(_emscripten_bind_b2PrismaticJointDef__get_localAxisA_p0(this.ptr), Module["b2Vec2"]);
});

b2PrismaticJointDef.prototype["set_upperTranslation"] = (function(arg0) {
  _emscripten_bind_b2PrismaticJointDef__set_upperTranslation_p1(this.ptr, arg0);
});

b2PrismaticJointDef.prototype["Initialize"] = (function(arg0, arg1, arg2, arg3) {
  _emscripten_bind_b2PrismaticJointDef__Initialize_p4(this.ptr, arg0.ptr, arg1.ptr, arg2.ptr, arg3.ptr);
});

b2PrismaticJointDef.prototype["set_lowerTranslation"] = (function(arg0) {
  _emscripten_bind_b2PrismaticJointDef__set_lowerTranslation_p1(this.ptr, arg0);
});

b2PrismaticJointDef.prototype["get_upperTranslation"] = (function() {
  return _emscripten_bind_b2PrismaticJointDef__get_upperTranslation_p0(this.ptr);
});

b2PrismaticJointDef.prototype["get_enableLimit"] = (function() {
  return _emscripten_bind_b2PrismaticJointDef__get_enableLimit_p0(this.ptr);
});

b2PrismaticJointDef.prototype["set_referenceAngle"] = (function(arg0) {
  _emscripten_bind_b2PrismaticJointDef__set_referenceAngle_p1(this.ptr, arg0);
});

b2PrismaticJointDef.prototype["get_localAnchorA"] = (function() {
  return wrapPointer(_emscripten_bind_b2PrismaticJointDef__get_localAnchorA_p0(this.ptr), Module["b2Vec2"]);
});

b2PrismaticJointDef.prototype["get_localAnchorB"] = (function() {
  return wrapPointer(_emscripten_bind_b2PrismaticJointDef__get_localAnchorB_p0(this.ptr), Module["b2Vec2"]);
});

b2PrismaticJointDef.prototype["__destroy__"] = (function() {
  _emscripten_bind_b2PrismaticJointDef____destroy___p0(this.ptr);
});

b2PrismaticJointDef.prototype["get_maxMotorForce"] = (function() {
  return _emscripten_bind_b2PrismaticJointDef__get_maxMotorForce_p0(this.ptr);
});

b2PrismaticJointDef.prototype["set_maxMotorForce"] = (function(arg0) {
  _emscripten_bind_b2PrismaticJointDef__set_maxMotorForce_p1(this.ptr, arg0);
});

b2PrismaticJointDef.prototype["set_enableMotor"] = (function(arg0) {
  _emscripten_bind_b2PrismaticJointDef__set_enableMotor_p1(this.ptr, arg0);
});

b2PrismaticJointDef.prototype["get_lowerTranslation"] = (function() {
  return _emscripten_bind_b2PrismaticJointDef__get_lowerTranslation_p0(this.ptr);
});

b2PrismaticJointDef.prototype["set_localAxisA"] = (function(arg0) {
  _emscripten_bind_b2PrismaticJointDef__set_localAxisA_p1(this.ptr, arg0.ptr);
});

b2WheelJointDef.prototype["set_localAnchorA"] = (function(arg0) {
  _emscripten_bind_b2WheelJointDef__set_localAnchorA_p1(this.ptr, arg0.ptr);
});

b2WheelJointDef.prototype["set_motorSpeed"] = (function(arg0) {
  _emscripten_bind_b2WheelJointDef__set_motorSpeed_p1(this.ptr, arg0);
});

b2WheelJointDef.prototype["get_localAxisA"] = (function() {
  return wrapPointer(_emscripten_bind_b2WheelJointDef__get_localAxisA_p0(this.ptr), Module["b2Vec2"]);
});

b2WheelJointDef.prototype["set_localAnchorB"] = (function(arg0) {
  _emscripten_bind_b2WheelJointDef__set_localAnchorB_p1(this.ptr, arg0.ptr);
});

b2WheelJointDef.prototype["get_frequencyHz"] = (function() {
  return _emscripten_bind_b2WheelJointDef__get_frequencyHz_p0(this.ptr);
});

b2WheelJointDef.prototype["set_maxMotorTorque"] = (function(arg0) {
  _emscripten_bind_b2WheelJointDef__set_maxMotorTorque_p1(this.ptr, arg0);
});

b2WheelJointDef.prototype["get_enableMotor"] = (function() {
  return _emscripten_bind_b2WheelJointDef__get_enableMotor_p0(this.ptr);
});

b2WheelJointDef.prototype["__destroy__"] = (function() {
  _emscripten_bind_b2WheelJointDef____destroy___p0(this.ptr);
});

b2WheelJointDef.prototype["get_localAnchorA"] = (function() {
  return wrapPointer(_emscripten_bind_b2WheelJointDef__get_localAnchorA_p0(this.ptr), Module["b2Vec2"]);
});

b2WheelJointDef.prototype["get_maxMotorTorque"] = (function() {
  return _emscripten_bind_b2WheelJointDef__get_maxMotorTorque_p0(this.ptr);
});

b2WheelJointDef.prototype["get_localAnchorB"] = (function() {
  return wrapPointer(_emscripten_bind_b2WheelJointDef__get_localAnchorB_p0(this.ptr), Module["b2Vec2"]);
});

b2WheelJointDef.prototype["get_dampingRatio"] = (function() {
  return _emscripten_bind_b2WheelJointDef__get_dampingRatio_p0(this.ptr);
});

b2WheelJointDef.prototype["set_enableMotor"] = (function(arg0) {
  _emscripten_bind_b2WheelJointDef__set_enableMotor_p1(this.ptr, arg0);
});

b2WheelJointDef.prototype["set_frequencyHz"] = (function(arg0) {
  _emscripten_bind_b2WheelJointDef__set_frequencyHz_p1(this.ptr, arg0);
});

b2WheelJointDef.prototype["Initialize"] = (function(arg0, arg1, arg2, arg3) {
  _emscripten_bind_b2WheelJointDef__Initialize_p4(this.ptr, arg0.ptr, arg1.ptr, arg2.ptr, arg3.ptr);
});

b2WheelJointDef.prototype["set_dampingRatio"] = (function(arg0) {
  _emscripten_bind_b2WheelJointDef__set_dampingRatio_p1(this.ptr, arg0);
});

b2WheelJointDef.prototype["set_localAxisA"] = (function(arg0) {
  _emscripten_bind_b2WheelJointDef__set_localAxisA_p1(this.ptr, arg0.ptr);
});

b2WheelJointDef.prototype["get_motorSpeed"] = (function() {
  return _emscripten_bind_b2WheelJointDef__get_motorSpeed_p0(this.ptr);
});

b2PulleyJointDef.prototype["set_localAnchorA"] = (function(arg0) {
  _emscripten_bind_b2PulleyJointDef__set_localAnchorA_p1(this.ptr, arg0.ptr);
});

b2PulleyJointDef.prototype["__destroy__"] = (function() {
  _emscripten_bind_b2PulleyJointDef____destroy___p0(this.ptr);
});

b2PulleyJointDef.prototype["set_localAnchorB"] = (function(arg0) {
  _emscripten_bind_b2PulleyJointDef__set_localAnchorB_p1(this.ptr, arg0.ptr);
});

b2PulleyJointDef.prototype["get_ratio"] = (function() {
  return _emscripten_bind_b2PulleyJointDef__get_ratio_p0(this.ptr);
});

b2PulleyJointDef.prototype["get_lengthB"] = (function() {
  return _emscripten_bind_b2PulleyJointDef__get_lengthB_p0(this.ptr);
});

b2PulleyJointDef.prototype["get_lengthA"] = (function() {
  return _emscripten_bind_b2PulleyJointDef__get_lengthA_p0(this.ptr);
});

b2PulleyJointDef.prototype["get_localAnchorA"] = (function() {
  return wrapPointer(_emscripten_bind_b2PulleyJointDef__get_localAnchorA_p0(this.ptr), Module["b2Vec2"]);
});

b2PulleyJointDef.prototype["set_ratio"] = (function(arg0) {
  _emscripten_bind_b2PulleyJointDef__set_ratio_p1(this.ptr, arg0);
});

b2PulleyJointDef.prototype["get_localAnchorB"] = (function() {
  return wrapPointer(_emscripten_bind_b2PulleyJointDef__get_localAnchorB_p0(this.ptr), Module["b2Vec2"]);
});

b2PulleyJointDef.prototype["get_groundAnchorB"] = (function() {
  return wrapPointer(_emscripten_bind_b2PulleyJointDef__get_groundAnchorB_p0(this.ptr), Module["b2Vec2"]);
});

b2PulleyJointDef.prototype["set_groundAnchorB"] = (function(arg0) {
  _emscripten_bind_b2PulleyJointDef__set_groundAnchorB_p1(this.ptr, arg0.ptr);
});

b2PulleyJointDef.prototype["set_groundAnchorA"] = (function(arg0) {
  _emscripten_bind_b2PulleyJointDef__set_groundAnchorA_p1(this.ptr, arg0.ptr);
});

b2PulleyJointDef.prototype["Initialize"] = (function(arg0, arg1, arg2, arg3, arg4, arg5, arg6) {
  _emscripten_bind_b2PulleyJointDef__Initialize_p7(this.ptr, arg0.ptr, arg1.ptr, arg2.ptr, arg3.ptr, arg4.ptr, arg5.ptr, arg6);
});

b2PulleyJointDef.prototype["set_lengthB"] = (function(arg0) {
  _emscripten_bind_b2PulleyJointDef__set_lengthB_p1(this.ptr, arg0);
});

b2PulleyJointDef.prototype["set_lengthA"] = (function(arg0) {
  _emscripten_bind_b2PulleyJointDef__set_lengthA_p1(this.ptr, arg0);
});

b2PulleyJointDef.prototype["get_groundAnchorA"] = (function() {
  return wrapPointer(_emscripten_bind_b2PulleyJointDef__get_groundAnchorA_p0(this.ptr), Module["b2Vec2"]);
});

b2JointDef.prototype["get_bodyA"] = (function() {
  return wrapPointer(_emscripten_bind_b2JointDef__get_bodyA_p0(this.ptr), Module["b2Body"]);
});

b2JointDef.prototype["set_userData"] = (function(arg0) {
  _emscripten_bind_b2JointDef__set_userData_p1(this.ptr, arg0);
});

b2JointDef.prototype["set_bodyA"] = (function(arg0) {
  _emscripten_bind_b2JointDef__set_bodyA_p1(this.ptr, arg0.ptr);
});

b2JointDef.prototype["set_bodyB"] = (function(arg0) {
  _emscripten_bind_b2JointDef__set_bodyB_p1(this.ptr, arg0.ptr);
});

b2JointDef.prototype["__destroy__"] = (function() {
  _emscripten_bind_b2JointDef____destroy___p0(this.ptr);
});

b2JointDef.prototype["get_bodyB"] = (function() {
  return wrapPointer(_emscripten_bind_b2JointDef__get_bodyB_p0(this.ptr), Module["b2Body"]);
});

b2JointDef.prototype["set_type"] = (function(arg0) {
  _emscripten_bind_b2JointDef__set_type_p1(this.ptr, arg0);
});

b2JointDef.prototype["get_collideConnected"] = (function() {
  return _emscripten_bind_b2JointDef__get_collideConnected_p0(this.ptr);
});

b2JointDef.prototype["get_type"] = (function() {
  return _emscripten_bind_b2JointDef__get_type_p0(this.ptr);
});

b2JointDef.prototype["set_collideConnected"] = (function(arg0) {
  _emscripten_bind_b2JointDef__set_collideConnected_p1(this.ptr, arg0);
});

b2JointDef.prototype["get_userData"] = (function() {
  return _emscripten_bind_b2JointDef__get_userData_p0(this.ptr);
});

b2Transform.prototype["__destroy__"] = (function() {
  _emscripten_bind_b2Transform____destroy___p0(this.ptr);
});

b2Transform.prototype["Set"] = (function(arg0, arg1) {
  _emscripten_bind_b2Transform__Set_p2(this.ptr, arg0.ptr, arg1);
});

b2Transform.prototype["set_p"] = (function(arg0) {
  _emscripten_bind_b2Transform__set_p_p1(this.ptr, arg0.ptr);
});

b2Transform.prototype["set_q"] = (function(arg0) {
  _emscripten_bind_b2Transform__set_q_p1(this.ptr, arg0.ptr);
});

b2Transform.prototype["get_p"] = (function() {
  return wrapPointer(_emscripten_bind_b2Transform__get_p_p0(this.ptr), Module["b2Vec2"]);
});

b2Transform.prototype["get_q"] = (function() {
  return wrapPointer(_emscripten_bind_b2Transform__get_q_p0(this.ptr), Module["b2Rot"]);
});

b2Transform.prototype["SetIdentity"] = (function() {
  _emscripten_bind_b2Transform__SetIdentity_p0(this.ptr);
});

b2Color.prototype["__destroy__"] = (function() {
  _emscripten_bind_b2Color____destroy___p0(this.ptr);
});

b2Color.prototype["set_b"] = (function(arg0) {
  _emscripten_bind_b2Color__set_b_p1(this.ptr, arg0);
});

b2Color.prototype["Set"] = (function(arg0, arg1, arg2) {
  _emscripten_bind_b2Color__Set_p3(this.ptr, arg0, arg1, arg2);
});

b2Color.prototype["get_b"] = (function() {
  return _emscripten_bind_b2Color__get_b_p0(this.ptr);
});

_reent.prototype["get__current_category"] = (function() {
  return _emscripten_bind__reent__get__current_category_p0(this.ptr);
});

_reent.prototype["set__inc"] = (function(arg0) {
  _emscripten_bind__reent__set__inc_p1(this.ptr, arg0);
});

_reent.prototype["get__errno"] = (function() {
  return _emscripten_bind__reent__get__errno_p0(this.ptr);
});

_reent.prototype["set__result_k"] = (function(arg0) {
  _emscripten_bind__reent__set__result_k_p1(this.ptr, arg0);
});

_reent.prototype["__destroy__"] = (function() {
  _emscripten_bind__reent____destroy___p0(this.ptr);
});

_reent.prototype["set__cvtlen"] = (function(arg0) {
  _emscripten_bind__reent__set__cvtlen_p1(this.ptr, arg0);
});

_reent.prototype["get__current_locale"] = (function() {
  return _emscripten_bind__reent__get__current_locale_p0(this.ptr);
});

_reent.prototype["get__cvtlen"] = (function() {
  return _emscripten_bind__reent__get__cvtlen_p0(this.ptr);
});

_reent.prototype["set__current_locale"] = (function(arg0) {
  var stack = Runtime.stackSave();
  try {
    _emscripten_bind__reent__set__current_locale_p1(this.ptr, ensureString(arg0));
  } finally {
    Runtime.stackRestore(stack);
  }
});

_reent.prototype["set__errno"] = (function(arg0) {
  _emscripten_bind__reent__set__errno_p1(this.ptr, arg0);
});

_reent.prototype["set___sdidinit"] = (function(arg0) {
  _emscripten_bind__reent__set___sdidinit_p1(this.ptr, arg0);
});

_reent.prototype["set__cvtbuf"] = (function(arg0) {
  var stack = Runtime.stackSave();
  try {
    _emscripten_bind__reent__set__cvtbuf_p1(this.ptr, ensureString(arg0));
  } finally {
    Runtime.stackRestore(stack);
  }
});

_reent.prototype["get__inc"] = (function() {
  return _emscripten_bind__reent__get__inc_p0(this.ptr);
});

_reent.prototype["get__cvtbuf"] = (function() {
  return _emscripten_bind__reent__get__cvtbuf_p0(this.ptr);
});

_reent.prototype["get__result_k"] = (function() {
  return _emscripten_bind__reent__get__result_k_p0(this.ptr);
});

_reent.prototype["get___sdidinit"] = (function() {
  return _emscripten_bind__reent__get___sdidinit_p0(this.ptr);
});

_reent.prototype["set__current_category"] = (function(arg0) {
  _emscripten_bind__reent__set__current_category_p1(this.ptr, arg0);
});

b2Rot.prototype["__destroy__"] = (function() {
  _emscripten_bind_b2Rot____destroy___p0(this.ptr);
});

b2Rot.prototype["Set"] = (function(arg0) {
  _emscripten_bind_b2Rot__Set_p1(this.ptr, arg0);
});

b2Rot.prototype["GetAngle"] = (function() {
  return _emscripten_bind_b2Rot__GetAngle_p0(this.ptr);
});

b2Rot.prototype["GetYAxis"] = (function() {
  return wrapPointer(_emscripten_bind_b2Rot__GetYAxis_p0(this.ptr), Module["b2Vec2"]);
});

b2Rot.prototype["GetXAxis"] = (function() {
  return wrapPointer(_emscripten_bind_b2Rot__GetXAxis_p0(this.ptr), Module["b2Vec2"]);
});

b2Rot.prototype["set_c"] = (function(arg0) {
  _emscripten_bind_b2Rot__set_c_p1(this.ptr, arg0);
});

b2Rot.prototype["SetIdentity"] = (function() {
  _emscripten_bind_b2Rot__SetIdentity_p0(this.ptr);
});

b2Rot.prototype["get_c"] = (function() {
  return _emscripten_bind_b2Rot__get_c_p0(this.ptr);
});

b2WeldJointDef.prototype["set_localAnchorA"] = (function(arg0) {
  _emscripten_bind_b2WeldJointDef__set_localAnchorA_p1(this.ptr, arg0.ptr);
});

b2WeldJointDef.prototype["__destroy__"] = (function() {
  _emscripten_bind_b2WeldJointDef____destroy___p0(this.ptr);
});

b2WeldJointDef.prototype["get_frequencyHz"] = (function() {
  return _emscripten_bind_b2WeldJointDef__get_frequencyHz_p0(this.ptr);
});

b2WeldJointDef.prototype["set_localAnchorB"] = (function(arg0) {
  _emscripten_bind_b2WeldJointDef__set_localAnchorB_p1(this.ptr, arg0.ptr);
});

b2WeldJointDef.prototype["set_dampingRatio"] = (function(arg0) {
  _emscripten_bind_b2WeldJointDef__set_dampingRatio_p1(this.ptr, arg0);
});

b2WeldJointDef.prototype["set_referenceAngle"] = (function(arg0) {
  _emscripten_bind_b2WeldJointDef__set_referenceAngle_p1(this.ptr, arg0);
});

b2WeldJointDef.prototype["get_localAnchorA"] = (function() {
  return wrapPointer(_emscripten_bind_b2WeldJointDef__get_localAnchorA_p0(this.ptr), Module["b2Vec2"]);
});

b2WeldJointDef.prototype["get_referenceAngle"] = (function() {
  return _emscripten_bind_b2WeldJointDef__get_referenceAngle_p0(this.ptr);
});

b2WeldJointDef.prototype["get_localAnchorB"] = (function() {
  return wrapPointer(_emscripten_bind_b2WeldJointDef__get_localAnchorB_p0(this.ptr), Module["b2Vec2"]);
});

b2WeldJointDef.prototype["get_dampingRatio"] = (function() {
  return _emscripten_bind_b2WeldJointDef__get_dampingRatio_p0(this.ptr);
});

b2WeldJointDef.prototype["set_frequencyHz"] = (function(arg0) {
  _emscripten_bind_b2WeldJointDef__set_frequencyHz_p1(this.ptr, arg0);
});

b2WeldJointDef.prototype["Initialize"] = (function(arg0, arg1, arg2) {
  _emscripten_bind_b2WeldJointDef__Initialize_p3(this.ptr, arg0.ptr, arg1.ptr, arg2.ptr);
});

b2RevoluteJointDef.prototype["set_localAnchorA"] = (function(arg0) {
  _emscripten_bind_b2RevoluteJointDef__set_localAnchorA_p1(this.ptr, arg0.ptr);
});

b2RevoluteJointDef.prototype["get_lowerAngle"] = (function() {
  return _emscripten_bind_b2RevoluteJointDef__get_lowerAngle_p0(this.ptr);
});

b2RevoluteJointDef.prototype["set_upperAngle"] = (function(arg0) {
  _emscripten_bind_b2RevoluteJointDef__set_upperAngle_p1(this.ptr, arg0);
});

b2RevoluteJointDef.prototype["set_localAnchorB"] = (function(arg0) {
  _emscripten_bind_b2RevoluteJointDef__set_localAnchorB_p1(this.ptr, arg0.ptr);
});

b2RevoluteJointDef.prototype["get_enableLimit"] = (function() {
  return _emscripten_bind_b2RevoluteJointDef__get_enableLimit_p0(this.ptr);
});

b2RevoluteJointDef.prototype["set_lowerAngle"] = (function(arg0) {
  _emscripten_bind_b2RevoluteJointDef__set_lowerAngle_p1(this.ptr, arg0);
});

b2RevoluteJointDef.prototype["get_enableMotor"] = (function() {
  return _emscripten_bind_b2RevoluteJointDef__get_enableMotor_p0(this.ptr);
});

b2RevoluteJointDef.prototype["set_motorSpeed"] = (function(arg0) {
  _emscripten_bind_b2RevoluteJointDef__set_motorSpeed_p1(this.ptr, arg0);
});

b2RevoluteJointDef.prototype["get_upperAngle"] = (function() {
  return _emscripten_bind_b2RevoluteJointDef__get_upperAngle_p0(this.ptr);
});

b2RevoluteJointDef.prototype["set_referenceAngle"] = (function(arg0) {
  _emscripten_bind_b2RevoluteJointDef__set_referenceAngle_p1(this.ptr, arg0);
});

b2RevoluteJointDef.prototype["set_maxMotorTorque"] = (function(arg0) {
  _emscripten_bind_b2RevoluteJointDef__set_maxMotorTorque_p1(this.ptr, arg0);
});

b2RevoluteJointDef.prototype["get_localAnchorA"] = (function() {
  return wrapPointer(_emscripten_bind_b2RevoluteJointDef__get_localAnchorA_p0(this.ptr), Module["b2Vec2"]);
});

b2RevoluteJointDef.prototype["get_referenceAngle"] = (function() {
  return _emscripten_bind_b2RevoluteJointDef__get_referenceAngle_p0(this.ptr);
});

b2RevoluteJointDef.prototype["get_localAnchorB"] = (function() {
  return wrapPointer(_emscripten_bind_b2RevoluteJointDef__get_localAnchorB_p0(this.ptr), Module["b2Vec2"]);
});

b2RevoluteJointDef.prototype["set_enableLimit"] = (function(arg0) {
  _emscripten_bind_b2RevoluteJointDef__set_enableLimit_p1(this.ptr, arg0);
});

b2RevoluteJointDef.prototype["set_enableMotor"] = (function(arg0) {
  _emscripten_bind_b2RevoluteJointDef__set_enableMotor_p1(this.ptr, arg0);
});

b2RevoluteJointDef.prototype["__destroy__"] = (function() {
  _emscripten_bind_b2RevoluteJointDef____destroy___p0(this.ptr);
});

b2RevoluteJointDef.prototype["Initialize"] = (function(arg0, arg1, arg2) {
  _emscripten_bind_b2RevoluteJointDef__Initialize_p3(this.ptr, arg0.ptr, arg1.ptr, arg2.ptr);
});

b2RevoluteJointDef.prototype["get_maxMotorTorque"] = (function() {
  return _emscripten_bind_b2RevoluteJointDef__get_maxMotorTorque_p0(this.ptr);
});

b2RevoluteJointDef.prototype["get_motorSpeed"] = (function() {
  return _emscripten_bind_b2RevoluteJointDef__get_motorSpeed_p0(this.ptr);
});

b2MouseJointDef.prototype["__destroy__"] = (function() {
  _emscripten_bind_b2MouseJointDef____destroy___p0(this.ptr);
});

b2MouseJointDef.prototype["get_frequencyHz"] = (function() {
  return _emscripten_bind_b2MouseJointDef__get_frequencyHz_p0(this.ptr);
});

b2MouseJointDef.prototype["set_dampingRatio"] = (function(arg0) {
  _emscripten_bind_b2MouseJointDef__set_dampingRatio_p1(this.ptr, arg0);
});

b2MouseJointDef.prototype["get_maxForce"] = (function() {
  return _emscripten_bind_b2MouseJointDef__get_maxForce_p0(this.ptr);
});

b2MouseJointDef.prototype["set_target"] = (function(arg0) {
  _emscripten_bind_b2MouseJointDef__set_target_p1(this.ptr, arg0.ptr);
});

b2MouseJointDef.prototype["set_maxForce"] = (function(arg0) {
  _emscripten_bind_b2MouseJointDef__set_maxForce_p1(this.ptr, arg0);
});

b2MouseJointDef.prototype["get_target"] = (function() {
  return wrapPointer(_emscripten_bind_b2MouseJointDef__get_target_p0(this.ptr), Module["b2Vec2"]);
});

b2MouseJointDef.prototype["set_frequencyHz"] = (function(arg0) {
  _emscripten_bind_b2MouseJointDef__set_frequencyHz_p1(this.ptr, arg0);
});

b2MouseJointDef.prototype["get_dampingRatio"] = (function() {
  return _emscripten_bind_b2MouseJointDef__get_dampingRatio_p0(this.ptr);
});

b2DistanceJointDef.prototype["set_localAnchorA"] = (function(arg0) {
  _emscripten_bind_b2DistanceJointDef__set_localAnchorA_p1(this.ptr, arg0.ptr);
});

b2DistanceJointDef.prototype["get_length"] = (function() {
  return _emscripten_bind_b2DistanceJointDef__get_length_p0(this.ptr);
});

b2DistanceJointDef.prototype["get_frequencyHz"] = (function() {
  return _emscripten_bind_b2DistanceJointDef__get_frequencyHz_p0(this.ptr);
});

b2DistanceJointDef.prototype["set_localAnchorB"] = (function(arg0) {
  _emscripten_bind_b2DistanceJointDef__set_localAnchorB_p1(this.ptr, arg0.ptr);
});

b2DistanceJointDef.prototype["set_dampingRatio"] = (function(arg0) {
  _emscripten_bind_b2DistanceJointDef__set_dampingRatio_p1(this.ptr, arg0);
});

b2DistanceJointDef.prototype["__destroy__"] = (function() {
  _emscripten_bind_b2DistanceJointDef____destroy___p0(this.ptr);
});

b2DistanceJointDef.prototype["get_localAnchorA"] = (function() {
  return wrapPointer(_emscripten_bind_b2DistanceJointDef__get_localAnchorA_p0(this.ptr), Module["b2Vec2"]);
});

b2DistanceJointDef.prototype["get_localAnchorB"] = (function() {
  return wrapPointer(_emscripten_bind_b2DistanceJointDef__get_localAnchorB_p0(this.ptr), Module["b2Vec2"]);
});

b2DistanceJointDef.prototype["get_dampingRatio"] = (function() {
  return _emscripten_bind_b2DistanceJointDef__get_dampingRatio_p0(this.ptr);
});

b2DistanceJointDef.prototype["set_length"] = (function(arg0) {
  _emscripten_bind_b2DistanceJointDef__set_length_p1(this.ptr, arg0);
});

b2DistanceJointDef.prototype["set_frequencyHz"] = (function(arg0) {
  _emscripten_bind_b2DistanceJointDef__set_frequencyHz_p1(this.ptr, arg0);
});

b2DistanceJointDef.prototype["Initialize"] = (function(arg0, arg1, arg2, arg3) {
  _emscripten_bind_b2DistanceJointDef__Initialize_p4(this.ptr, arg0.ptr, arg1.ptr, arg2.ptr, arg3.ptr);
});

b2DistanceProxy.prototype["get_m_radius"] = (function() {
  return _emscripten_bind_b2DistanceProxy__get_m_radius_p0(this.ptr);
});

b2DistanceProxy.prototype["Set"] = (function(arg0, arg1) {
  _emscripten_bind_b2DistanceProxy__Set_p2(this.ptr, arg0.ptr, arg1);
});

b2DistanceProxy.prototype["set_m_radius"] = (function(arg0) {
  _emscripten_bind_b2DistanceProxy__set_m_radius_p1(this.ptr, arg0);
});

b2DistanceProxy.prototype["__destroy__"] = (function() {
  _emscripten_bind_b2DistanceProxy____destroy___p0(this.ptr);
});

b2DistanceProxy.prototype["get_m_vertices"] = (function() {
  return _emscripten_bind_b2DistanceProxy__get_m_vertices_p0(this.ptr);
});

b2DistanceProxy.prototype["GetSupportVertex"] = (function(arg0) {
  return wrapPointer(_emscripten_bind_b2DistanceProxy__GetSupportVertex_p1(this.ptr, arg0.ptr), Module["b2Vec2"]);
});

b2DistanceProxy.prototype["get_m_count"] = (function() {
  return _emscripten_bind_b2DistanceProxy__get_m_count_p0(this.ptr);
});

b2DistanceProxy.prototype["GetVertexCount"] = (function() {
  return _emscripten_bind_b2DistanceProxy__GetVertexCount_p0(this.ptr);
});

b2DistanceProxy.prototype["GetVertex"] = (function(arg0) {
  return wrapPointer(_emscripten_bind_b2DistanceProxy__GetVertex_p1(this.ptr, arg0), Module["b2Vec2"]);
});

b2DistanceProxy.prototype["GetSupport"] = (function(arg0) {
  return _emscripten_bind_b2DistanceProxy__GetSupport_p1(this.ptr, arg0.ptr);
});

b2DistanceProxy.prototype["set_m_vertices"] = (function(arg0) {
  _emscripten_bind_b2DistanceProxy__set_m_vertices_p1(this.ptr, arg0.ptr);
});

b2DistanceProxy.prototype["set_m_count"] = (function(arg0) {
  _emscripten_bind_b2DistanceProxy__set_m_count_p1(this.ptr, arg0);
});

b2GearJointDef.prototype["__destroy__"] = (function() {
  _emscripten_bind_b2GearJointDef____destroy___p0(this.ptr);
});

b2GearJointDef.prototype["set_joint1"] = (function(arg0) {
  _emscripten_bind_b2GearJointDef__set_joint1_p1(this.ptr, arg0.ptr);
});

b2GearJointDef.prototype["set_joint2"] = (function(arg0) {
  _emscripten_bind_b2GearJointDef__set_joint2_p1(this.ptr, arg0.ptr);
});

b2GearJointDef.prototype["set_ratio"] = (function(arg0) {
  _emscripten_bind_b2GearJointDef__set_ratio_p1(this.ptr, arg0);
});

b2GearJointDef.prototype["get_joint1"] = (function() {
  return wrapPointer(_emscripten_bind_b2GearJointDef__get_joint1_p0(this.ptr), Module["b2Joint"]);
});

b2GearJointDef.prototype["get_joint2"] = (function() {
  return wrapPointer(_emscripten_bind_b2GearJointDef__get_joint2_p0(this.ptr), Module["b2Joint"]);
});

b2GearJointDef.prototype["get_ratio"] = (function() {
  return _emscripten_bind_b2GearJointDef__get_ratio_p0(this.ptr);
});

_atexit.prototype["get__ind"] = (function() {
  return _emscripten_bind__atexit__get__ind_p0(this.ptr);
});

_atexit.prototype["set__ind"] = (function(arg0) {
  _emscripten_bind__atexit__set__ind_p1(this.ptr, arg0);
});

_atexit.prototype["__destroy__"] = (function() {
  _emscripten_bind__atexit____destroy___p0(this.ptr);
});

b2RopeJointDef.prototype["set_localAnchorA"] = (function(arg0) {
  _emscripten_bind_b2RopeJointDef__set_localAnchorA_p1(this.ptr, arg0.ptr);
});

b2RopeJointDef.prototype["__destroy__"] = (function() {
  _emscripten_bind_b2RopeJointDef____destroy___p0(this.ptr);
});

b2RopeJointDef.prototype["get_maxLength"] = (function() {
  return _emscripten_bind_b2RopeJointDef__get_maxLength_p0(this.ptr);
});

b2RopeJointDef.prototype["set_localAnchorB"] = (function(arg0) {
  _emscripten_bind_b2RopeJointDef__set_localAnchorB_p1(this.ptr, arg0.ptr);
});

b2RopeJointDef.prototype["get_localAnchorA"] = (function() {
  return wrapPointer(_emscripten_bind_b2RopeJointDef__get_localAnchorA_p0(this.ptr), Module["b2Vec2"]);
});

b2RopeJointDef.prototype["get_localAnchorB"] = (function() {
  return wrapPointer(_emscripten_bind_b2RopeJointDef__get_localAnchorB_p0(this.ptr), Module["b2Vec2"]);
});

b2RopeJointDef.prototype["set_maxLength"] = (function(arg0) {
  _emscripten_bind_b2RopeJointDef__set_maxLength_p1(this.ptr, arg0);
});

this["Box2D"] = Module;

Module["b2_staticBody"] = 0;

Module["b2_kinematicBody"] = 1;

Module["b2_dynamicBody"] = 2;
// EMSCRIPTEN_GENERATED_FUNCTIONS: ["__Z5b2MinIiET_S0_S0_","__Z5b2MaxIiET_S0_S0_","__ZN12b2BroadPhase12UnBufferMoveEi","__ZN12b2BroadPhaseC1Ev","__ZN12b2BroadPhaseD1Ev","__ZN12b2BroadPhase11CreateProxyERK6b2AABBPv","__ZN12b2BroadPhase10BufferMoveEi","__ZN12b2BroadPhase12DestroyProxyEi","__ZN12b2BroadPhase9MoveProxyEiRK6b2AABBRK6b2Vec2","__ZN12b2BroadPhase10TouchProxyEi","__ZN12b2BroadPhase13QueryCallbackEi","__ZN12b2BroadPhaseC2Ev","__ZN12b2BroadPhaseD2Ev"]

