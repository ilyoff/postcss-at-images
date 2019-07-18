# PostCSS At Images

[PostCSS]: https://github.com/postcss/postcss
[postcss-retina-bg-img]: https://github.com/alexlafroscia/postcss-retina-bg-img

[PostCSS] plugin searches and adds high resolution background images.

Totally based, inspired and extends functionality of [postcss-retina-bg-img] plugin 

## What does it do
It searches background images in your CSS code and, if a high resolution version of the same file is found, automatically adds that file within a appropriate media query. Differs from [postcss-retina-bg-img] in that you can use not only retina images, but also 3x and 4x images. 
                                               
### Input

```css
.foo {
  background: url('/assets/images/foo.png');
}

.bar {
  background-image: url('/assets/images/bar.png');
}
```

### Output 

```css

.foo {
  background: url('/assets/images/foo.png');
}

@media (-webkit-min-device-pixel-ratio: 2), (min-resolution: 192dpi) {
  .foo {
    background-image: url('/assets/images/foo@2x.png');
  }
}

@media (-webkit-min-device-pixel-ratio: 3), (min-resolution: 288dpi) {
  .foo {
    background-image: url('/assets/images/foo@3x.png');
  }
}

@media (-webkit-min-device-pixel-ratio: 4), (min-resolution: 384dpi) {
  .foo {
    background-image: url('/assets/images/foo@2x.png');
  }
}

.bar {
  background-image: url('/assets/images/bar.png');
}

@media (-webkit-min-device-pixel-ratio: 2), (min-resolution: 192dpi) {
  .bar {
    background-image: url('/assets/images/bar@2x.png');
  }
}

@media (-webkit-min-device-pixel-ratio: 3), (min-resolution: 288dpi) {
  .bar {
    background-image: url('/assets/images/bar@3x.png');
  }
}

@media (-webkit-min-device-pixel-ratio: 4), (min-resolution: 384dpi) {
  .bar {
    background-image: url('/assets/images/bar@4x.png');
  }
}
```
## Install
#### NPM

`npm install postcss-at-images --save`

## Usage

```js
const postcss = require('postcss');
const atImages = require('postcss-at-images')

const retinaBgImage = require('postcss-retina-bg-img');

const options = {
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

return postcss([ atImages(options) ]).process(input);
```

#### Options

##### assetDirectory* (required)
Type: `string`

The path to your asset directory. This should be the location on the filesystem that your files are served from.

For example, if your CSS links to an image like so:
```css
.foo {
  background-image: url('/assets/images/foo.png');
}
```

then the assetDirectory should be the absolute path on the filesystem to wherever assets lives. This is necessary because this plugin will only add media queries for files that actually exist; to determine their existence, we must be able to actually find the file.

##### includeFileExtensions (optional)
Type: `string[]` 
Default `['png', 'jpg']`

The file extensions to act on. Without a whitelist of file types, you'll end up checking for retina versions of svg files and the like, which you may not actually want to act on. If you need to check anything other than png or jpg files, simply define an array of file extensions here.

##### Resolutions (optional)
Type: `Object` 
Default: `{192: {...}, 288: {...}, 384: {...}}`

Map with 3 basic screen resolutions. Each item contains two fields: `suffix`es array and `mediaQuery` string. If you don't want to use any of the resolution, just set it to `null`:

```js
const options = {
  assetDirectory: null,
      includeFileExtensions: ['.jpg', '.jpeg', '.png'],
      resolutions: {
          192: {
              suffix: ['@2x'],
              mediaQuery: '(-webkit-min-device-pixel-ratio: 2), (min-resolution: 192dpi)'
          },
  
          288: null,
  
          384: {
              suffix: ['@4x'],
              mediaQuery: '(-webkit-min-device-pixel-ratio: 4), (min-resolution: 384dpi)'
          }
      }
}

```

###### Suffix (optional)
Type: `string[] | string` Default `[@2x] | [@3x] | [@4x]`
 
The possible suffixes to find a retina image with. For example, if the background image is `foo.png`, and you've specified `@2x` as the `suffix`, then the file foo@2x.png would be used as the retina version. Note that the media query is only added if the file actually exists; if you don't have a foo@2x.png then this plugin won't change a thing.
                                                                  
If an array of suffixes is provided, then any of the given strings will be matched against. If you have a situation where multiple files could satisfy the settings, such as `suffix: ['@2x', '_2x']` with the following files:
```
foo.png
foo@2x.png
foo_2x.png
```
Then the first one in the `suffix` array will be used.

###### mediaQuery (optional)
Type: `string`
Default: `(-webkit-min-device-pixel-ratio: 2), (min-resolution: 192dpi) | (-webkit-min-device-pixel-ratio: 3), (min-resolution: 288dpi) | (-webkit-min-device-pixel-ratio: 4), (min-resolution: 384dpi)`

The media query to use to target high resolution displays. The defaults should be sufficient, but if you need something custom, feel free to provide your own.

## Usage

See the [PostCSS documentation](https://github.com/postcss/postcss#usage) for examples for your environment.

## Gotchas

A few things to note when using this plugin:

- Media queries are only added if the retina version of the file is found.  Make sure your retina images follow some kind of pattern so that they can be located based on the name of the non-retina file.
- Selectors with a background image that are inside a media query already will create a new, combined media query to target both the existing one and retina displays.  For example, the following should happen:

    ```css
    /* Input */
    .foo {
      background: url('/assets/images/foo-mobile.png');
    }

    @media (min-width: 600px) {
      .foo {
        background: url('/assets/images/foo.png');
      }
    }
    ```

    ```css
    /* Output */
    .foo {
      background: url('/assets/images/foo-mobile.png');
    }

    @media (min-width: 600px) {
      .foo {
        background: url('/assets/images/foo.png');
      }
    }

    @media (-webkit-min-device-pixel-ratio: 2), (min-resolution: 192dpi) {
      .foo {
        background-image: url('/assets/images/foo-mobile@2x.png');
      }
    }

    @media (-webkit-min-device-pixel-ratio: 2) and (min-width: 600px), (min-resolution: 192dpi) and (min-width: 600px) {
      .foo {
        background-image: url('/assets/images/foo@2x.png');
      }
    }
    ```

    If this does not seem to be working correctly, please [file a ticket][issues] so I can make the rule combination more robust.


## Contributing

Pull requests are welcome. If you add functionality, then please add unit tests to cover it.

## License

MIT © [Ilya Ovsyanikov](https://github.com/ilyoff/postcss-at-images)
