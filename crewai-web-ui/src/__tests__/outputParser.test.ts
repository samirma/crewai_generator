import { parseStreamlitUrl } from '../utils/outputParser';

describe('parseStreamlitUrl', () => {
    it('should extract the Local URL from a log line', () => {
        const logLine = "  Local URL: http://localhost:8502";
        const url = parseStreamlitUrl(logLine);
        expect(url).toBe('http://localhost:8502');
    });

    it('should return null if Local URL is not present', () => {
        const logLine = "  Network URL: http://192.168.1.5:8502";
        const url = parseStreamlitUrl(logLine);
        expect(url).toBeNull();
    });

    it('should handle log lines with extra whitespace', () => {
        const logLine = "   Local URL:   http://localhost:8503  ";
        const url = parseStreamlitUrl(logLine);
        expect(url).toBe('http://localhost:8503');
    });

    it('should extract URL even if surrounded by other text', () => {
        const logLine = "[Streamlit]   Local URL: http://localhost:8501 is ready";
        const url = parseStreamlitUrl(logLine);
        expect(url).toBe('http://localhost:8501');
    });
});
