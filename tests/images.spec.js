const path = require('path');
const {
    isUrlPath,
    findRetinaImage,
    extractUrlValue
} = require('../utils/images');
const fixturePath = path.join(__dirname, 'fixtures');

describe('isUrlPath', () => {
    it('accepts an HTTP string', () => {
        expect(isUrlPath('http://foo.com/bar.png')).toBeTruthy();
    });

    it('accepts an HTTPS string', () => {
        expect(isUrlPath('https://foo.com/bar.png')).toBeTruthy();
    });

    it('rejects a relative path', () => {
        expect(isUrlPath('foo.png')).not.toBeTruthy();
    });

    it('rejects an absolute path', () => {
        expect(isUrlPath('/foo.png')).not.toBeTruthy();
    });
});

describe('extractUrlValue', () => {
    it('returns raw image path from url declaration value', () => {
        const imagePath = extractUrlValue('url(\'background-image.png\')');
        expect(imagePath).toBe('background-image.png');
    });
});

describe('finding the retina image', () => {
    it('works with relative paths', () => {
        const retinaName = findRetinaImage(
            './file-with-one-retina.png',
            fixturePath,
            '@2x'
        );

        expect(retinaName).toBe('./file-with-one-retina@2x.png');
    });

    it('works when a single suffix is provided', () => {
        const retinaName = findRetinaImage(
            'file-with-one-retina.png',
            fixturePath,
            '@2x'
        );

        expect(retinaName).toBe('file-with-one-retina@2x.png');
    });

    it('works when multiple suffixes are provided', () => {
        const retinaName = findRetinaImage(
            'file-with-other-retina.png',
            fixturePath,
            ['@2x', '_2x']
        );

        expect(retinaName).toBe('file-with-other-retina_2x.png');
    });

    it('fails to locate a file without a matching retina version', () => {
        const retinaName = findRetinaImage(
            'file-without-retina.png',
            fixturePath,
            '@2x'
        );

        expect(retinaName).toBeUndefined();
    });

    it('works when the filename shows up in the filepath', () => {
        const retinaName = findRetinaImage('subfolder/2/2.png', fixturePath, '@2x');

        expect(retinaName).toBe('subfolder/2/2@2x.png');
    });
});
