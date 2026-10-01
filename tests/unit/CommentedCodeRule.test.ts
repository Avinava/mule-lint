import { CommentedCodeRule } from '../../src/rules/operations/CommentedCodeRule';
import { parseXml } from '../../src/core/XmlParser';
import { ValidationContext } from '../../src/types';

const context: ValidationContext = {
  filePath: 'app.xml',
  relativePath: 'src/main/mule/app.xml',
  projectRoot: '/project',
  config: { enabled: true },
};

function run(body: string) {
  const xml = `<mule xmlns="http://www.mulesoft.org/schema/mule/core">${body}</mule>`;
  return new CommentedCodeRule().validate(parseXml(xml, 'app.xml').document!, context);
}

describe('CommentedCodeRule (HYG-002)', () => {
  it('reports commented-out flow code', () => {
    const issues = run('<!-- <flow name="old"><logger message="x"/></flow> -->');
    expect(issues).toHaveLength(1);
    expect(issues[0]?.ruleId).toBe('HYG-002');
  });

  it.each(['<logger level="INFO"/>', '<choice>', '<try>', '<db:select/>', '<http:request/>'])(
    'detects pattern %s',
    (snippet) => {
      expect(run(`<!-- ${snippet} -->`)).toHaveLength(1);
    },
  );

  it('reports one issue per comment even with several patterns', () => {
    expect(run('<!-- <flow name="a"> <logger message="x"/> -->')).toHaveLength(1);
  });

  it('reports each offending comment separately', () => {
    expect(run('<!-- <logger message="a"/> --><!-- <set-payload value="b"/> -->')).toHaveLength(2);
  });

  it('ignores prose comments', () => {
    expect(run('<!-- This flow handles orders -->')).toHaveLength(0);
  });

  it('returns nothing for documents without comments', () => {
    expect(run('<flow name="f"><logger message="x"/></flow>')).toHaveLength(0);
  });
});
