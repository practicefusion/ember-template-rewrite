// tslint:disable:no-console
import {
  Walker,
} from 'glimmer-engine/dist/node_modules/glimmer-syntax';
import print from '../printer';
import { unescape } from '../../lib/whitespace';

const CONVERT_TO_CLOSURE_ACTION = {
  buttonLeftAction: true,
  buttonRightPrimaryAction: true,
  buttonRightSecondaryAction: true,
  buttonRightTertiaryAction: true,
};

const HASH_TO_SECTION = {
  buttonLeftAction: 'footer',
  buttonLeftText: 'footer',
  buttonRightPrimaryAction: 'footer',
  buttonRightPrimaryText: 'footer',
  buttonRightSecondaryAction: 'footer',
  buttonRightSecondaryText: 'footer',
  buttonRightTertiaryAction: 'footer',
  buttonRightTertiaryText: 'footer',
  hasCustomBody: 'none',
  hasCustomFooter: 'none',
  hasCustomHeader: 'none',
  notifyCloseByX: 'header',
  subtitle: 'header',
  title: 'header',
};

const BLOCK_TO_SECTION = {
  'content-modal-body': 'body',
  'content-modal-footer': 'footer',
  'content-modal-header': 'header',
};

const OPEN_CONTENT_MODAL = '{{#content-modal';
const OPEN_CONTENT_MODAL_V2 = '{{#content-modal-v2';
const CLOSE_CONTENT_MODAL = '{{/content-modal}}';

function isContentModal(node) {
  const name = node.path && node.path.original;
  return node.type === 'BlockStatement' && name === 'content-modal';
}

function formatHashValue(hashValue) {
  const { type } = hashValue;
  let { value } = hashValue;
  if (type === 'StringLiteral') {
    value = `"${value}"`;
  } else if (type === 'PathExpression') {
    value = hashValue.parts.join('.');
  } else if (type === 'SubExpression') {
    value = `(${formatHashValue(hashValue.path)} `;
    value += `${hashValue.params.map((param) => formatHashValue(param)).join(' ')})`;
  }
  return value;
}

function getHash(node) {
  const hash = {
    body: {},
    footer: {},
    header: {},
    none: {},
    root: {},
  };
  const closeKey = 'isCloseByXorOutsideVisible';
  node.hash.pairs.slice().forEach((p) => {
    const { key } = p;
    const section = HASH_TO_SECTION[key] || 'root';
    let value = formatHashValue(p.value);
    if (CONVERT_TO_CLOSURE_ACTION[key]) {
      value = `(action ${value})`;
    }
    hash[section][key] = value;
  });

  if (hash.root[closeKey] !== false) {
    hash.header[closeKey] = 'true';
  }

  return hash;
}

function formatHash(hash, indent) {
  const keys = Object.keys(hash);
  const newLines = keys.length > 2;
  const separator = newLines ? `\n${indent}    ` : ' ';
  return Object.keys(hash).map((key) => `${separator}${key}=${hash[key]}`).join('');
}

function convertChildNode(name, hash, indent) {
  return `${indent}{{${name}${formatHash(hash, indent)}}}\n`;
}

function convertChildBlock(name, hash, body, indent) {
  if (!body || body.length === 0) {
    return convertChildNode(name, hash, indent);
  }
  let template = `${indent}{{#${name}${formatHash(hash, indent)}}}`;
  template += `${body}\n`;
  template += `${indent}{{/${name}}}\n`;
  return template;
}

function getBlocks(node, hash) {
  const nodesToRemove = [];
  const { program } = node;
  const { body } = program;
  const blocks = {
    body: null,
    footer: null,
    header: null,
  };
  body.forEach((child) => {
    const name = child.path && child.path.original;
    const section = BLOCK_TO_SECTION[name];
    if (section) {
      nodesToRemove.push(node);
      blocks[section] = `${unescape(print(child.program).trim())}`;
      child.hash.pairs.slice().forEach((p) => {
        const { key } = p;
        if (key !== 'sectionContext') {
          hash[section][key] = formatHashValue(p.value);
        }
      });
    }
  });
  if (!blocks.body) {
    nodesToRemove.forEach((child) => {
      const index = body.indexOf(child);
      body.splice(index, 1);
    });
    blocks.body = `${unescape(print(program).trim())}`;
  }
  return blocks;
}

function convertContentModalNode(node, indent) {
  let template = '';
  const hash = getHash(node);
  const blocks = getBlocks(node, hash);
  const childIndent = `${indent}    `;
  template += `{{#content-modal-v2${formatHash(hash.root, indent)} as |section|}}\n`;
  template += convertChildBlock('section.header', hash.header, blocks.header, childIndent);
  template += convertChildBlock('section.body', hash.body, blocks.body, childIndent);
  template += convertChildBlock('section.footer', hash.footer, blocks.footer, childIndent);
  template += `${indent}{{/content-modal-v2}}`;
  return template;
}

function findContentModalIndex(template, startAt) {
  const index = template.indexOf(OPEN_CONTENT_MODAL, startAt);
  if (index === template.indexOf(OPEN_CONTENT_MODAL_V2, startAt)) {
    return findContentModalIndex(template, index + 1);
  }
  return index;
}

export default function convertContentModal(ast, template) {
  const walker = new Walker(ast);
  let printed = null;

  walker.visit(ast, (node) => {
    if (isContentModal(node)) {
      if (!printed) {
        printed = template;
      }
      const column = node.loc.start.column;
      const startIndex = findContentModalIndex(printed, 0);
      const endIndex = printed.indexOf(CLOSE_CONTENT_MODAL) + CLOSE_CONTENT_MODAL.length;
      const beforeText = startIndex === 0 ? '' : printed.substring(0, startIndex);
      let indent = '';
      for (let i = 0; i < column; i++) {
        indent += ' ';
      }

      printed = `${beforeText}${convertContentModalNode(node, indent)}${printed.substring(endIndex)}`;
    }
  });

  if (printed) {
    return printed;
  }

  return template;
}
