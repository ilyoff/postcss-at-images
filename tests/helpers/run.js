const postcss = require('postcss');
const path = require('path');
const plugin = require('../../');

const baseOptions = {
    assetDirectory: path.resolve(__dirname, '../fixtures'),
    includeFileExtensions: ['.jpg', '.jpeg', '.png'],
    resolutions: {
        192: {
            suffix: ['@2x'],
            mediaQuery: '(-webkit-min-device-pixel-ratio: 2), (min-resolution: 192dpi)'
        },

        288: {
            suffix: ['@3x'],
            mediaQuery: '(-webkit-min-device-pixel-ratio: 3), (min-resolution: 288dpi)'
        },

        384: {
            suffix: ['@4x'],
            mediaQuery: '(-webkit-min-device-pixel-ratio: 4), (min-resolution: 384dpi)'
        }
    }
};

const run = async (input, options) => {
    const result = await postcss([plugin(options)]).process(input, { from: 'tests/test.css' });

    return {
        output: result.css,
        parsed: postcss.parse(result.css),
        warnings: result.warnings()
    };
};

module.exports = { run, baseOptions };
