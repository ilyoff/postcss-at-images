const postcss = require('postcss');
const path = require('path');
const merge = require('deepmerge');
const {
    findRetinaImage,
    extractUrlValue,
    isUrlPath,
    missingImageWarning,
    URL_EXTRACT_REGEX,
    PROPERTY_TRANSLATIONS,
    IMAGE_PROPERTY_REGEX,
    UNNECESSARY_RETINA_IMAGE_WARNING
} = require('./utils/images');

const {
    queryCoversRange,
    distributeQueryAcrossQuery,
    nodeIsMediaQuery
} = require('./utils/media-queries');

const defaultOpts = {
    assetDirectory: null,
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

module.exports = postcss.plugin('postcss-at-images', (opts) => {
    const options = merge(defaultOpts, opts, { arrayMerge: (destinationArray, sourceArray) => sourceArray });

    return function (root, result) {
        const ruleSource = root.source.input.file;
        const resolutions = Object.values(options.resolutions).filter(r => !!r);
        const includeFileExt = options.includeFileExtensions;
        const ruleBlacklist = {};
        let assetDirectory = options.assetDirectory;
        let newMediaQueries = [];

        if (!Array.isArray(includeFileExt)) {
            throw new Error(
                'Option `includeFileExtensions` must be an array. You passed: ' +
                includeFileExt
            );
        }

        if (!assetDirectory) {
            if (typeof ruleSource === 'string') {
                assetDirectory = path.dirname(ruleSource);
            } else {
                throw new Error('You must provide an assets directory');
            }
        }

        root.walkAtRules('media', (atRule) => {
            const { params } = atRule;
            const coversRange = resolutions.some(
                ({ mediaQuery }) => queryCoversRange(mediaQuery, params)
            );

            if (!coversRange) {
                return;
            }

            atRule.walkRules((rule) => {
                const { selector } = rule;

                rule.walkDecls(IMAGE_PROPERTY_REGEX, (decl) => {
                    const imgPath = extractUrlValue(decl.value);

                    if (imgPath) {
                        ruleBlacklist[params] = ruleBlacklist[params] || {};
                        ruleBlacklist[params][selector] = { imgPath, decl };
                    }
                });
            });
        });

        root.walkRules((rule) => {
            const { selector } = rule;
            const { parent: parentRule } = rule;
            let mediaQueries = [...resolutions.filter(r => !!r)];

            // The rule to add the new media query after
            let anchor = rule;

            // If the rule is inside a media query...
            if (parentRule && nodeIsMediaQuery(parentRule)) {
                const queriesCoverRange = mediaQueries.some(
                    ({ mediaQuery }) => queryCoversRange(mediaQuery, parentRule.params)
                );

                // Short-circuit if the rule is already inside a retina media query
                if (queriesCoverRange) {
                    return;
                }

                // Add the new media query after the parent one
                anchor = parentRule;
                mediaQueries = mediaQueries.map(
                    (mq) => ({
                        ...mq,
                        mediaQuery: distributeQueryAcrossQuery(mq.mediaQuery, parentRule.params)
                    })
                );
            }

            mediaQueries = mediaQueries.map((mq) => ({
                ...mq,
                rule: postcss.rule({ selector: rule.selector })
            }));

            // Create the media query and rule that we'll attach declarations to
            rule.walkDecls(IMAGE_PROPERTY_REGEX, (decl) => {
                const { prop, value } = decl;
                let backgroundsList = value.split(',');

                for (let i = 0; i < backgroundsList.length; i++) {
                    let backgroundPropertyPath = URL_EXTRACT_REGEX.exec(
                        backgroundsList[i]
                    );

                    if (!(backgroundPropertyPath && backgroundPropertyPath[1])) {
                        return;
                    }

                    const relativeImagePath = backgroundPropertyPath[1];

                    if (isUrlPath(relativeImagePath)) {
                        return;
                    }

                    const fileExtension = path.extname(relativeImagePath);

                    if (includeFileExt.indexOf(fileExtension) === -1) {
                        return;
                    }

                    for (let mq of mediaQueries) {
                        const { suffix, mediaQuery } = mq;
                        let imagePath = findRetinaImage(
                            relativeImagePath,
                            assetDirectory,
                            suffix
                        );

                        if (!imagePath) {
                            decl.warn(result, missingImageWarning(relativeImagePath, mq.suffix));
                            imagePath = backgroundPropertyPath[1];
                        } else {
                            mq.imageFound = true;
                        }


                        if (
                            ruleBlacklist[mediaQuery] &&
                            ruleBlacklist[mediaQuery][selector]
                        ) {
                            const { imgPath, decl: existingDecl } = ruleBlacklist[mediaQuery][
                                selector
                            ];

                            if (imgPath === imagePath) {
                                existingDecl.warn(result, UNNECESSARY_RETINA_IMAGE_WARNING);
                            }

                            return;
                        }

                        if (Array.isArray(mq.imageList)) {
                            mq.imageList.push(imagePath);
                        } else {
                            mq.imageList = [imagePath];
                        }
                    }
                }

                for (let mq of mediaQueries.reverse()) {
                    if (!mq.imageFound) {
                        continue;
                    }

                    let newDecl = mq.imageList.map((bg) => `url('${bg}')`);

                    if (newDecl.length) {
                        const retinaImageDecl = postcss.decl({
                            prop: PROPERTY_TRANSLATIONS[prop],
                            value: `${newDecl.join(', ')}`
                        });
                        mq.rule.append(retinaImageDecl);
                    }
                }

            });

            mediaQueries.forEach(({ rule: mqRule, mediaQuery }) => {
                // Only add the media query to the page if there are declarations in it
                if (mqRule.nodes.length > 0) {
                    const mq = postcss.atRule({
                        name: 'media',
                        params: mediaQuery
                    });

                    mq.append(mqRule);
                    newMediaQueries.push({ anchor, mq });
                }
            });
        });

        // Insert the media query after the rule in the root
        newMediaQueries.forEach(({ anchor, mq }) => {
            root.insertAfter(anchor, mq);
        });
    };
});
