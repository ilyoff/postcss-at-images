const {
    queryCoversRange,
    distributeQueryAcrossQuery
} = require('../utils/media-queries');

describe('queryCoversRange', () => {
    describe('matches', () => {
        /* eslint-disable max-len */
        const sets = [
            {
                name: 'an exact match',
                less: '(min-width: 600px)',
                more: '(min-width: 600px)'
            },
            {
                name: 'the same query in a different order (AND)',
                less: '(min-width: 600px) and (max-width: 800px)',
                more: '(max-width: 800px) and (min-width: 600px)'
            },
            {
                name: 'the same query in a different order (OR)',
                less: '(min-width: 600px), (max-width: 800px)',
                more: '(max-width: 800px), (min-width: 600px)'
            },
            {
                name: 'a complex query with multiple `OR` and `AND` parts',
                less:
                    '(min-width: 600px) and (max-width: 650px), (min-width: 700px) and (max-width: 750px)',
                more:
                    '(min-width: 600px) and (max-width: 650px) and screen, (min-width: 700px) and (max-width: 750px) and screen'
            },
            {
                name: 'the same query parts combined with different operators',
                less: '(min-width: 600px), (max-width: 800px)',
                more: '(min-width: 600px) and (max-width: 800px)'
            }
        ];
        /* eslint-enable */
        sets.forEach(({ name, less, more }) => {
            it(`accepts ${name}`, () => {
                expect(queryCoversRange(less, more)).toBeTruthy();
            });
        });
    });

    describe('not matches', () => {
        const sets = [
            {
                name: 'a complete mismatch of query parts',
                less: '(min-width: 600px)',
                more: '(max-width: 800px)'
            },
            {
                name:
                    'a less restrictive query with parts not in the more restrictive query',
                less: '(min-width: 600px) and (max-width: 800px)',
                more: '(min-width: 600px)'
            }
        ];

        sets.forEach(({ name, less, more }) => {
            it(`rejects ${name}`, () => {
                expect(queryCoversRange(less, more)).toBeFalsy();
            });
        });
    });
});

describe('distributeQueryAcrossQuery', () => {
    it('combines two basic queries', () => {
        const a = '(min-width: 600px)';
        const b = '(max-width: 800px)';
        const result = distributeQueryAcrossQuery(a, b);

        expect(result).toBe(`${a} and ${b}`);
    });

    it('distributes a retina query with multiple parts', () => {
        const a = '(min-width: 600px), (max-width: 800px)';
        const b = 'screen';
        const result = distributeQueryAcrossQuery(a, b);

        expect(result).toBe(
            '(min-width: 600px) and screen, (max-width: 800px) and screen'
        );
    });

    it('combines a media query with more than two parts', () => {
        const a = '(min-width: 600px), (min-width: 700px), (min-width: 800px)';
        const b = 'screen';
        const result = distributeQueryAcrossQuery(a, b);

        expect(result).toBe(
            '(min-width: 600px) and screen, (min-width: 700px) and screen, (min-width: 800px) and screen'
        );
    });

    it('combines two media queries with multiple parts', () => {
        const a = 'foo, bar';
        const b = 'baz, bop';
        const result = distributeQueryAcrossQuery(a, b);

        expect(result).toBe(
            'foo and baz, foo and bop, bar and baz, bar and bop'
        );
    });
});
