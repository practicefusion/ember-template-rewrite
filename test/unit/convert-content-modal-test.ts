import assert from 'test/helpers/assert';
import preprocess from 'ember-template-rewrite/preprocess';
import convertContentModal from 'ember-template-rewrite/formulas/convert-content-modal';

const printEqual = (template, expected) => {
  const ast = preprocess(template);
  assert.equal(convertContentModal(ast, template), expected);
};

describe('Unit: convertContentModal', () => {
  it('converts empty content modal', () => {
    const input = '{{#content-modal}}{{/content-modal}}';
    const output = `{{#content-modal-v2 as |section|}}
    {{section.header isCloseByXorOutsideVisible=true}}
    {{section.body}}
    {{section.footer}}
{{/content-modal-v2}}`;
    printEqual(input, output);
  });

  it('moves attributes to correct children', () => {
    const input = '{{#content-modal buttonLeftAction="leftAction" buttonLeftText="leftText" title="title" '
      + 'isCloseByXorOutsideVisible=false}}{{/content-modal}}';
    const output = `{{#content-modal-v2 isCloseByXorOutsideVisible=false as |section|}}
    {{section.header title="title"}}
    {{section.body}}
    {{section.footer buttonLeftAction=(action "leftAction") buttonLeftText="leftText"}}
{{/content-modal-v2}}`;
    printEqual(input, output);
  });

  it('moves the content to section.body', () => {
    const input = '{{#content-modal}}<h1>Test</h1>{{/content-modal}}';
    const output = `{{#content-modal-v2 as |section|}}
    {{section.header isCloseByXorOutsideVisible=true}}
    {{#section.body}}<h1>Test</h1>
    {{/section.body}}
    {{section.footer}}
{{/content-modal-v2}}`;
    printEqual(input, output);
  });

  it('moves the subcomponents to the correct sections', () => {
    const input = `{{#content-modal as |sectionContext|}}
      {{#content-modal-header sectionContext=sectionContext}}<h1>Custom header</h1>{{/content-modal-header}}
      {{#content-modal-body sectionContext=sectionContext}}<p>Test</p>{{/content-modal-body}}
      {{#content-modal-footer sectionContext=sectionContext}}<button>Done</button>{{/content-modal-footer}}
    {{/content-modal}}`;
    const output = `{{#content-modal-v2 as |section|}}
    {{#section.header isCloseByXorOutsideVisible=true}}<h1>Custom header</h1>
    {{/section.header}}
    {{#section.body}}<p>Test</p>
    {{/section.body}}
    {{#section.footer}}<button>Done</button>
    {{/section.footer}}
{{/content-modal-v2}}`;
    printEqual(input, output);
  });
});
