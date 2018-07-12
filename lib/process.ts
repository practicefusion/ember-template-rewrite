import { unescape } from '../lib/whitespace';
import convertBindAttr from './formulas/convert-bind-attr';
import convertBindings from './formulas/convert-bindings';
import convertEachIn from './formulas/convert-each-in';
import convertContentModal from './formulas/convert-content-modal';
import preprocess from './preprocess';
import print from './printer';

export interface IProcessOptions {
  formulas?: any[];
  quotes?: {
    mustache: string;
  };
}

const plugins = {
  'convert-bind-attr': convertBindAttr,
  'convert-bindings': convertBindings,
  'convert-content-modal': convertContentModal,
  'convert-each-in': convertEachIn,
};

function getPlugins(formulas) {
  return (formulas || []).map((f) => plugins[f]);
}

function transform(ast, formulas) {
  const usedPlugins = getPlugins(formulas);
  usedPlugins.forEach((p) => p(ast));
  return ast;
}

function isConvertContentModal(options) {
  return options.formulas[0] === 'convert-content-modal';
}

export default function process(template, options: IProcessOptions = { formulas: [] }) {
  const ast = preprocess(template);
  if (isConvertContentModal(options)) {
    return convertContentModal(ast, template);
  }
  transform(ast, options.formulas);
  return unescape(print(ast, options));
}
