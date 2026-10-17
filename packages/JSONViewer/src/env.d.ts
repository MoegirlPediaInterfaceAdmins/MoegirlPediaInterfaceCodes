/** CSS 副作用导入的模块声明（本仓入口与 react18-json-view 的样式导入，esbuild 打包语义）。 */
declare module "*.css";

/** 构建期由 esbuild `define` 注入：dev watch 构建取 true，发布构建取 false。 */
declare const __DEV__: boolean;
