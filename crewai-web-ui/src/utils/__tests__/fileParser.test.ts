import { parseFileBlocks, GeneratedFile } from '../fileParser';

describe('parseFileBlocks', () => {
    it('should parse a single file block', () => {
        const script = `[START_FILE:test.py]
def hello():
    print("Hello, World!")
[END_FILE:test.py]`;

        const result = parseFileBlocks(script);
        expect(result).toHaveLength(1);
        expect(result[0].name).toBe('test.py');
        expect(result[0].content).toBe('def hello():\n    print("Hello, World!")');
    });

    it('should parse multiple file blocks', () => {
        const script = `[START_FILE:app.py]
import main
[END_FILE:app.py]
[START_FILE:main.py]
def main():
    print("Hello")
[END_FILE:main.py]`;

        const result = parseFileBlocks(script);
        expect(result).toHaveLength(2);
        expect(result[0].name).toBe('app.py');
        expect(result[1].name).toBe('main.py');
    });

    it('should strip markdown code block notation', () => {
        const script = `[START_FILE:script.py]
\`\`\`python
def hello():
    print("Hello")
\`\`\`
[END_FILE:script.py]`;

        const result = parseFileBlocks(script);
        expect(result[0].content).toBe('def hello():\n    print("Hello")');
    });

    it('should return empty array when no file blocks found and script is not empty', () => {
        const script = `print("Hello, World!")`;

        const result = parseFileBlocks(script);
        expect(result).toHaveLength(0);
    });

    it('should parse markdown code block as file when no file blocks found', () => {
        const script = `\`\`\`toml
[project]
name = "my-app"
version = "1.0.0"
\`\`\``;

        const result = parseFileBlocks(script);
        expect(result).toHaveLength(1);
        expect(result[0].name).toBe('pyproject.toml');
        expect(result[0].content).toBe(`[project]
name = "my-app"
version = "1.0.0"`);
    });

    it('should parse yaml markdown code block as file when no file blocks found', () => {
        const script = `\`\`\`yaml
id: vla_sota_report_updater
description: Updates the VLA Robotics Model Report
\`\`\``;

        const result = parseFileBlocks(script);
        expect(result).toHaveLength(1);
        expect(result[0].name).toBe('config.yaml');
        expect(result[0].content).toBe(`id: vla_sota_report_updater
description: Updates the VLA Robotics Model Report`);
    });

    it('should return empty array for empty string', () => {
        const result = parseFileBlocks('');
        expect(result).toHaveLength(0);
    });

    it('should handle file names with special characters', () => {
        const script = `[START_FILE:path/to/file.ts]
const x = 1;
[END_FILE:path/to/file.ts]`;

        const result = parseFileBlocks(script);
        expect(result[0].name).toBe('path/to/file.ts');
    });

    it('should handle file blocks with extra whitespace', () => {
        const script = `[START_FILE:app.py]
def hello():
    pass
[END_FILE:app.py]`;

        const result = parseFileBlocks(script);
        expect(result[0].name).toBe('app.py');
        expect(result[0].content).toBe('def hello():\n    pass');
    });
});
