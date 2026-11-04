"use strict";
/*
 * ATTENTION: An "eval-source-map" devtool has been used.
 * This devtool is neither made for production nor for readable output files.
 * It uses "eval()" calls to create a separate source file with attached SourceMaps in the browser devtools.
 * If you are trying to read the output file, select a different devtool (https://webpack.js.org/configuration/devtool/)
 * or disable the default devtool with "devtool: false".
 * If you are looking for production-ready output files, see mode: "production" (https://webpack.js.org/configuration/mode/).
 */
exports.id = "_ssr_src_lib_supabaseClient_js";
exports.ids = ["_ssr_src_lib_supabaseClient_js"];
exports.modules = {

/***/ "(ssr)/./src/lib/supabaseClient.js":
/*!***********************************!*\
  !*** ./src/lib/supabaseClient.js ***!
  \***********************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

eval("__webpack_require__.r(__webpack_exports__);\n/* harmony export */ __webpack_require__.d(__webpack_exports__, {\n/* harmony export */   supabase: () => (/* binding */ supabase)\n/* harmony export */ });\n/* harmony import */ var _supabase_supabase_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! @supabase/supabase-js */ \"(ssr)/./node_modules/@supabase/supabase-js/dist/index.mjs\");\n\nconst supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;\nconst supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;\n// No hardcoded fallbacks: a project URL or key embedded in source is exposed\n// to anyone who reads the bundle. Both must come from the environment.\nif (!supabaseUrl) {\n    throw new Error(\"Missing Supabase project URL. Set NEXT_PUBLIC_SUPABASE_URL in your environment.\");\n}\nif (!supabaseKey) {\n    throw new Error(\"Missing Supabase publishable key. Set NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY or NEXT_PUBLIC_SUPABASE_ANON_KEY in your environment.\");\n}\nconst supabase = (0,_supabase_supabase_js__WEBPACK_IMPORTED_MODULE_0__.createClient)(supabaseUrl, supabaseKey);\n//# sourceURL=[module]\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiKHNzcikvLi9zcmMvbGliL3N1cGFiYXNlQ2xpZW50LmpzIiwibWFwcGluZ3MiOiI7Ozs7O0FBQXFEO0FBRXJELE1BQU1DLGNBQWNDLFFBQVFDLEdBQUcsQ0FBQ0Msd0JBQXdCO0FBQ3hELE1BQU1DLGNBQ0pILFFBQVFDLEdBQUcsQ0FBQ0csb0NBQW9DLElBQ2hESixRQUFRQyxHQUFHLENBQUNJLDZCQUE2QjtBQUUzQyw2RUFBNkU7QUFDN0UsdUVBQXVFO0FBQ3ZFLElBQUksQ0FBQ04sYUFBYTtJQUNoQixNQUFNLElBQUlPLE1BQ1I7QUFFSjtBQUVBLElBQUksQ0FBQ0gsYUFBYTtJQUNoQixNQUFNLElBQUlHLE1BQ1I7QUFFSjtBQUVPLE1BQU1DLFdBQVdULG1FQUFZQSxDQUFDQyxhQUFhSSxhQUFhIiwic291cmNlcyI6WyJ3ZWJwYWNrOi8vVVFaRVJBLWNsaWVudC8uL3NyYy9saWIvc3VwYWJhc2VDbGllbnQuanM/YWJiYSJdLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBjcmVhdGVDbGllbnQgfSBmcm9tICdAc3VwYWJhc2Uvc3VwYWJhc2UtanMnO1xuXG5jb25zdCBzdXBhYmFzZVVybCA9IHByb2Nlc3MuZW52Lk5FWFRfUFVCTElDX1NVUEFCQVNFX1VSTDtcbmNvbnN0IHN1cGFiYXNlS2V5ID1cbiAgcHJvY2Vzcy5lbnYuTkVYVF9QVUJMSUNfU1VQQUJBU0VfUFVCTElTSEFCTEVfS0VZIHx8XG4gIHByb2Nlc3MuZW52Lk5FWFRfUFVCTElDX1NVUEFCQVNFX0FOT05fS0VZO1xuXG4vLyBObyBoYXJkY29kZWQgZmFsbGJhY2tzOiBhIHByb2plY3QgVVJMIG9yIGtleSBlbWJlZGRlZCBpbiBzb3VyY2UgaXMgZXhwb3NlZFxuLy8gdG8gYW55b25lIHdobyByZWFkcyB0aGUgYnVuZGxlLiBCb3RoIG11c3QgY29tZSBmcm9tIHRoZSBlbnZpcm9ubWVudC5cbmlmICghc3VwYWJhc2VVcmwpIHtcbiAgdGhyb3cgbmV3IEVycm9yKFxuICAgICdNaXNzaW5nIFN1cGFiYXNlIHByb2plY3QgVVJMLiBTZXQgTkVYVF9QVUJMSUNfU1VQQUJBU0VfVVJMIGluIHlvdXIgZW52aXJvbm1lbnQuJ1xuICApO1xufVxuXG5pZiAoIXN1cGFiYXNlS2V5KSB7XG4gIHRocm93IG5ldyBFcnJvcihcbiAgICAnTWlzc2luZyBTdXBhYmFzZSBwdWJsaXNoYWJsZSBrZXkuIFNldCBORVhUX1BVQkxJQ19TVVBBQkFTRV9QVUJMSVNIQUJMRV9LRVkgb3IgTkVYVF9QVUJMSUNfU1VQQUJBU0VfQU5PTl9LRVkgaW4geW91ciBlbnZpcm9ubWVudC4nXG4gICk7XG59XG5cbmV4cG9ydCBjb25zdCBzdXBhYmFzZSA9IGNyZWF0ZUNsaWVudChzdXBhYmFzZVVybCwgc3VwYWJhc2VLZXkpO1xuIl0sIm5hbWVzIjpbImNyZWF0ZUNsaWVudCIsInN1cGFiYXNlVXJsIiwicHJvY2VzcyIsImVudiIsIk5FWFRfUFVCTElDX1NVUEFCQVNFX1VSTCIsInN1cGFiYXNlS2V5IiwiTkVYVF9QVUJMSUNfU1VQQUJBU0VfUFVCTElTSEFCTEVfS0VZIiwiTkVYVF9QVUJMSUNfU1VQQUJBU0VfQU5PTl9LRVkiLCJFcnJvciIsInN1cGFiYXNlIl0sInNvdXJjZVJvb3QiOiIifQ==\n//# sourceURL=webpack-internal:///(ssr)/./src/lib/supabaseClient.js\n");

/***/ })

};
;