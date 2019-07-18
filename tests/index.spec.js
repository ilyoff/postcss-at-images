const postcss = require('postcss');
const { run, baseOptions } = require('./helpers/run');
const plugin = require('../');

describe('PostCSS plugin', () => {
    describe('options', () => {
        it('does not uses resolutions with null values', async () => {
            const css = `
              a {
                background-image: url('file-with-all-res.png');
              }
            `;

            const opts = {
                ...baseOptions,
                resolutions: {
                    288: null,
                    384: null
                }
            };

            const { parsed, warnings } = await run(css, opts);
            expect(parsed.nodes.length).toBe(2);
            expect(parsed.nodes[0].type).toBe('rule');
            expect(parsed.nodes[1].type).toBe('atrule');
            expect(parsed.nodes[1].name).toBe('media');
            expect(parsed.nodes[1].nodes[0].nodes[0].value).toBe('url(\'file-with-all-res@2x.png\')');

            expect(warnings.length).toBe(0);
        });

        it('can be given an retina suffix', async () => {
            const css = `
                a {
                  background: url('file-with-other-retina.png');
                }
            `;

            const opts = {
                ...baseOptions,
                resolutions: {
                    192: {
                        ...baseOptions.resolutions['192'],
                        suffix: '_2x'
                    },
                    288: null,
                    384: null
                }
            };

            const { parsed } = await run(css, opts);
            const mq = parsed.nodes[1];
            const [mqRule] = mq.nodes;
            const [decl] = mqRule.nodes;

            expect(decl.value).toBe('url(\'file-with-other-retina_2x.png\')');
        });

        it('can be given a media query to use', async () => {
            const css = `
                a {
                  background: url('file-with-one-retina.png');
                }
            `;

            const opts = {
                ...baseOptions,
                resolutions: {
                    192: {
                        suffix: '@2x',
                        mediaQuery: 'foo'

                    },
                    288: null,
                    384: null
                }
            };

            const { parsed } = await run(css, opts);
            const mq = parsed.nodes[1];

            expect(mq.params).toBe('foo');
        });

        it('can be given includeFileExtensions', async () => {
            const css = `
                a {
                  background-image: url('file-with-svg-ext.svg');
                }
                div {
                  background-image: url('file-with-one-retina.png');
                }
            `;

            const { parsed } = await run(css, {
                ...baseOptions,
                includeFileExtensions: ['.svg', '.png']
            });
            const nodes = parsed.nodes;

            expect(nodes[0].nodes[0].value).toBe('url(\'file-with-svg-ext.svg\')');
            expect(nodes[1].nodes[0].nodes[0].value).toBe(
                'url(\'file-with-svg-ext@2x.svg\')'
            );
            expect(nodes[2].nodes[0].value).toBe(
                'url(\'file-with-one-retina.png\')'
            );
            expect(nodes[3].nodes[0].nodes[0].value).toBe(
                'url(\'file-with-one-retina@2x.png\')'
            );
        });

        describe('default options', () => {
            it('errors if an asset directory is not specified', () => {
                const processCSS = postcss([plugin({})]).process('a {}');

                return expect(processCSS).rejects.toThrow(
                    'You must provide an assets directory'
                );
            });

            it('uses the "CSS-Tricks" recommended media query if none is provided', async () => {
                const css = `
                  a {
                    background-image: url('file-with-all-res.png');
                  }
                `;

                const { parsed } = await run(css, baseOptions);
                const mq2x = parsed.nodes[1];
                const mq3x = parsed.nodes[2];
                const mq4x = parsed.nodes[3];

                expect(mq2x.params).toBe(baseOptions.resolutions['192'].mediaQuery);
                expect(mq3x.params).toBe(baseOptions.resolutions['288'].mediaQuery);
                expect(mq4x.params).toBe(baseOptions.resolutions['384'].mediaQuery);
            });

            it('uses `@2x/@3x/@4x` as the default suffixes if none is provided', async () => {
                const css = `
                  a {
                    background-image: url('file-with-all-res.png');
                  }
                `;

                const { parsed } = await run(css, baseOptions);
                const [, mq2x, mq3x, mq4x] = parsed.nodes;

                expect(mq2x.nodes[0].nodes[0].value).toBe('url(\'file-with-all-res@2x.png\')');
                expect(mq3x.nodes[0].nodes[0].value).toBe('url(\'file-with-all-res@3x.png\')');
                expect(mq4x.nodes[0].nodes[0].value).toBe('url(\'file-with-all-res@4x.png\')');
            });

            it('uses `.png, .jpg, .jpeg` as the default extensions if none is provided', async () => {
                const css = `
                  a {
                    background-image: url('file-with-svg-ext.svg');
                  }
                  
                  div {
                    background-image: url('file-with-one-retina.png');
                  }
                `;

                const { parsed } = await run(css, baseOptions);
                const nodes = parsed.nodes;

                expect(nodes[0].nodes[0].value).toBe(
                    'url(\'file-with-svg-ext.svg\')'
                );
                expect(nodes[1].nodes[0].value).toBe(
                    'url(\'file-with-one-retina.png\')'
                );
                expect(nodes[2].nodes[0].nodes[0].value).toBe(
                    'url(\'file-with-one-retina@2x.png\')'
                );
            });
        });
    });

    it('does not add the media query if the image is not found', async () => {
        const css = `
          a {
            background-image: url('file-without-retina.png');
          }
        `;

        const { output, warnings } = await run(css, baseOptions);
        expect.assertions(5);
        expect(output).toBe(css);
        expect(warnings.length).toBe(3);
        expect(warnings[0].text).toBe(
            'Could not find high resolution version for `file-without-retina.png` with suffixes @2x'
        );
        expect(warnings[1].text).toBe(
            'Could not find high resolution version for `file-without-retina.png` with suffixes @3x'
        );
        expect(warnings[2].text).toBe(
            'Could not find high resolution version for `file-without-retina.png` with suffixes @4x'
        );
    });

    it('merges media queries', async () => {
        const css = `
            @media (min-width: 600px) {
                a {
                  background-image: url('file-with-all-res.png');
                }
            }
        `;

        const { parsed, warnings } = await run(css, baseOptions);
        const [originalMq, mq2x, mq3x, mq4x] = parsed.nodes;

        expect.assertions(9);
        expect(warnings.length).toBe(0);
        expect(originalMq.params).toBe('(min-width: 600px)');

        /* eslint-disable max-len */
        expect(mq2x.params).toBe(
            '(-webkit-min-device-pixel-ratio: 2) and (min-width: 600px), (min-resolution: 192dpi) and (min-width: 600px)'
        );
        expect(mq3x.params).toBe(
            '(-webkit-min-device-pixel-ratio: 3) and (min-width: 600px), (min-resolution: 288dpi) and (min-width: 600px)'
        );
        expect(mq4x.params).toBe(
            '(-webkit-min-device-pixel-ratio: 4) and (min-width: 600px), (min-resolution: 384dpi) and (min-width: 600px)'
        );
        /* eslint-enable */

        expect(originalMq.nodes[0].nodes[0].value).toBe('url(\'file-with-all-res.png\')');
        expect(mq2x.nodes[0].nodes[0].value).toBe('url(\'file-with-all-res@2x.png\')');
        expect(mq3x.nodes[0].nodes[0].value).toBe('url(\'file-with-all-res@3x.png\')');
        expect(mq4x.nodes[0].nodes[0].value).toBe('url(\'file-with-all-res@4x.png\')');
    });

    describe('handling different types of background images', () => {
        it('maintains absolute URL paths to images', async () => {
            const css = `
                a {
                  background-image: url('/file-with-all-res.png');
                }
            `;

            const { parsed } = await run(css, baseOptions);
            const value2x = parsed.nodes[1].nodes[0].nodes[0].value;
            const value3x = parsed.nodes[2].nodes[0].nodes[0].value;
            const value4x = parsed.nodes[3].nodes[0].nodes[0].value;
            expect.assertions(3);
            expect(value2x).toBe('url(\'/file-with-all-res@2x.png\')');
            expect(value3x).toBe('url(\'/file-with-all-res@3x.png\')');
            expect(value4x).toBe('url(\'/file-with-all-res@4x.png\')');
        });

        it('ignores full URL paths to images', async () => {
            const css = `
            a {
                background-image: url('http://foo.com/bar.jpg');
            }
    
            b {
                background-image: url('https://foo.com/bar.jpg');
            }
      `;
            expect.assertions(1);
            const { parsed } = await run(css, baseOptions);
            expect(parsed.nodes.length).toBe(2);
        });

        it('finds images with relative paths', async () => {
            const css = `
                a {
                    background-image: url('./fixtures/file-with-one-retina.png');
                }
            `;

            const { parsed } = await run(css, { assetDirectory: '' });
            const [, mq] = parsed.nodes;
            const [retinaRule] = mq.nodes;
            const [bgDecl] = retinaRule.nodes;
            expect.assertions(2);
            expect(parsed.nodes.length).toBe(2);
            expect(bgDecl.value).toBe(
                'url(\'./fixtures/file-with-one-retina@2x.png\')'
            );
        });

        it('finds multiple images when provided', async () => {
            const css = `
        a {
          background-image: url('./fixtures/file-with-one-retina.png'), url(./fixtures/file-with-one-retina-2.png);
        }
      `;

            const { parsed } = await run(css, {});
            const [, mq] = parsed.nodes;
            const [retinaRule] = mq.nodes;
            const [bgDecl] = retinaRule.nodes;

            expect(bgDecl.value).toBe(
                'url(\'./fixtures/file-with-one-retina@2x.png\'), url(\'./fixtures/file-with-one-retina-2@2x.png\')'
            );
        });

        it('includes original image with no retine alternative when multiple images are provided', async () => {
            const css = `
        a {
          background-image: url('./fixtures/file-with-one-retina.png'), url(./fixtures/file-without-retina.png);
        }
      `;

            const { parsed } = await run(css, {});
            const [, mq] = parsed.nodes;
            const [retinaRule] = mq.nodes;
            const [bgDecl] = retinaRule.nodes;

            expect(bgDecl.value).toBe(
                'url(\'./fixtures/file-with-one-retina@2x.png\'), url(\'./fixtures/file-without-retina.png\')'
            );
        });
    });

    describe('`background-image` property', () => {
        it('adds the high resolution versions of the provided image', async () => {
            const css = `
        a {
          background-image: url('file-with-all-res.png');
        }
      `;

            const { parsed } = await run(css, baseOptions);
            const [, ...mediaQueries] = parsed.nodes;

            expect.assertions(9);
            mediaQueries.forEach((mq, i) => {
                const rule = mq.nodes[0];
                const [decl] = rule.nodes;
                const suffix = i + 2;

                expect(rule.selector).toBe('a');
                expect(decl.prop).toBe('background-image');
                expect(decl.value).toBe(`url('file-with-all-res@${suffix}x.png')`);
            });

        });

        it('does not add anything if an image is not present', async () => {
            const css = `
                a {
                  background: red;
                }
            `;

            const { parsed } = await run(css, baseOptions);
            expect(parsed.nodes.length).toBe(1);

            const [rule] = parsed.nodes;
            const [decl] = rule.nodes;

            expect(decl.value).toBe('red');
        });

        it('adds the retina image even if the property contains additional information', async () => {
            const css = `
                a {
                  background: url('file-with-one-retina.png') no-repeat center center;
                }
            `;

            const { parsed } = await run(css, baseOptions);
            const mq = parsed.nodes[1];
            expect(mq.type).toBe('atrule');
            expect(mq.name).toBe('media');

            const [mqRule] = mq.nodes;
            expect(mqRule.selector).toBe('a');

            const [decl] = mqRule.nodes;
            expect(decl.prop).toBe('background-image');
            expect(decl.value).toBe('url(\'file-with-one-retina@2x.png\')');
        });
    });

    describe('`list-style-image` property', () => {
        it('adds the retina version of the provided image', async () => {
            const css = `
                li {
                  list-style-image: url('file-with-one-retina.png');
                }
            `;

            const { parsed } = await run(css, baseOptions);
            const [, mq] = parsed.nodes;
            const [mqRule] = mq.nodes;
            const [decl] = mqRule.nodes;

            expect(parsed.nodes.length).toBe(2);
            expect(decl.value).toBe('url(\'file-with-one-retina@2x.png\')');
        });
    });

    describe('avoiding existing retina images', () => {
        it('does not add a retina rule of one already exists for the selector', async () => {
            const mediaQuery = baseOptions.resolutions['192'].mediaQuery;
            const providedRetinaBackgroundProperty = 'url(\'some-other-retina-image.png\')';
            const css = `
                a {
                  background-image: url('file-with-one-retina.png');
                }
        
                @media ${mediaQuery} {
                  a {
                    background-image: ${providedRetinaBackgroundProperty};
                  }
                }
            `;

            const { parsed, warnings } = await run(css, baseOptions);
            expect(parsed.nodes.length).toBe(2);

            const oldMediaQuery = parsed.nodes[1];

            expect(oldMediaQuery.type).toBe('atrule');
            expect(oldMediaQuery.name).toBe('media');

            const [rule] = oldMediaQuery.nodes;
            const [decl] = rule.nodes;

            expect(decl.value).toBe(providedRetinaBackgroundProperty);
            expect(warnings.length).toBe(0);
        });

        it('issues a warning to the developer if a manually defined bg image matches the generated one', async () => {
            const mediaQuery = baseOptions.resolutions['192'].mediaQuery;
            const providedRetinaBackgroundProperty = 'url(\'file-with-one-retina@2x.png\')';
            const css = `
        a {
          background-image: url('file-with-one-retina.png');
        }

        @media ${mediaQuery} {
          a {
            background-image: ${providedRetinaBackgroundProperty};
          }
        }
            `;

            const { parsed, warnings } = await run(css, baseOptions);
            expect(parsed.nodes.length).toBe(2);

            const oldMediaQuery = parsed.nodes[1];

            expect(oldMediaQuery.type).toBe('atrule');
            expect(oldMediaQuery.name).toBe('media');

            const [rule] = oldMediaQuery.nodes;
            const [decl] = rule.nodes;

            expect(decl.value).toBe(providedRetinaBackgroundProperty);

            const [warning] = warnings;

            expect(warnings.length).toBe(1);
            expect(warning.line).toBe(8);
            expect(warning.column).toBe(13);
            expect(warning.text).toBe(
                'Unncessary image provided; the same will be generated automatically'
            );
        });

        it('does nothing with existing media queries that do not specify a background image', async () => {
            const mediaQuery = baseOptions.resolutions['192'].mediaQuery;
            const css = `
                a {
                  background: red;
                }
        
                @media ${mediaQuery} {
                  a {
                    background: blue;
                  }
                }
            `;

            const { parsed, warnings } = await run(css, baseOptions);

            expect(parsed.nodes.length).toBe(2);
            expect(warnings.length).toBe(0);
        });

        it('works with nested media queries', async () => {
            /* eslint-disable max-len */
            const css = `
                @media (min-width: 600px) {
                  a {
                    background-image: url('file-with-one-retina.png');
                  }
                }
        
                @media (-webkit-min-device-pixel-ratio: 2) and (min-width: 600px), (min-resolution: 192dpi) and (min-width: 600px) {
                  a {
                    background-image: url('file-with-one-retina@2x.png');
                  }
                }
            `;
            /* eslint-enable */
            const opts = {
                ...baseOptions,
                resolutions: {
                    ...baseOptions.resolutions,
                    288: null,
                    384: null
                }
            };
            const { parsed, warnings } = await run(css, opts);

            expect(parsed.nodes.length).toBe(2);

            parsed.nodes.forEach((mq) => {
                expect(mq.type).toBe('atrule');
                expect(mq.name).toBe('media');
            });

            const [firstRule, secondRule] = parsed.nodes;

            expect(firstRule.params).toBe('(min-width: 600px)');
            /* eslint-disable max-len */
            expect(secondRule.params).toBe(
                '(-webkit-min-device-pixel-ratio: 2) and (min-width: 600px), (min-resolution: 192dpi) and (min-width: 600px)'
            );
            /* eslint-enable */
            expect(warnings.length).toBe(1);
        });
    });

    describe('handling quotes URLs', () => {
        it('works with single quotes', async () => {
            const css = `
                a {
                  background-image: url('file-with-one-retina.png');
                }
            `;

            const { parsed } = await run(css, baseOptions);
            const mq = parsed.nodes[1];
            const [mqRule] = mq.nodes;
            const [decl] = mqRule.nodes;

            expect(decl.value).toBe('url(\'file-with-one-retina@2x.png\')');
        });

        it('works with double quotes', async () => {
            const css = `
                a {
                  background-image: url("file-with-one-retina.png");
                }
            `;

            const { parsed } = await run(css, baseOptions);
            const mq = parsed.nodes[1];
            const [mqRule] = mq.nodes;
            const [decl] = mqRule.nodes;

            expect(decl.value).toBe('url(\'file-with-one-retina@2x.png\')');
        });

        it('works with no quotes', async () => {
            const css = `
                a {
                  background-image: url(file-with-one-retina.png);
                }
            `;

            const { parsed } = await run(css, baseOptions);
            const mq = parsed.nodes[1];
            const [mqRule] = mq.nodes;
            const [decl] = mqRule.nodes;

            expect(decl.value).toBe('url(\'file-with-one-retina@2x.png\')');
        });
    });
});

