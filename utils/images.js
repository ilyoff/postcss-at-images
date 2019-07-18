const fs = require('fs');
const path = require('path');

const URL_EXTRACT_REGEX = new RegExp(/url\((?:'|")?(.*?)(?:'|")?\)/);
const URL_REGEX = new RegExp(/http(s)?:\/\//);
const IMAGE_PROPERTY_REGEX = new RegExp(/^(background(-image))|(list-style-image)?$/);
const UNNECESSARY_RETINA_IMAGE_WARNING =
    'Unncessary image provided; the same will be generated automatically';
const PROPERTY_TRANSLATIONS = {
    'background': 'background-image',
    'background-image': 'background-image',
    'list-style-image': 'list-style-image'
};

/**
 * Generates warning message for missing image
 *
 * @param { string } imagePath - path to image
 * @param { string|string[] } suffixes - possible image suffixes
 * @returns {string} warning message
 */

function missingImageWarning(imagePath, suffixes) {
    const sfxs = typeof suffixes === 'string' ? [suffixes] : suffixes;
    return `Could not find high resolution version for \`${imagePath}\`` +
         ` with suffixes ${sfxs.join('/')}`;
}

/**
 * Check if the URL path is a full URL
 *
 * @param {string} imagePath
 * @return {boolean}
 */
function isUrlPath(imagePath) {
    return URL_REGEX.test(imagePath);
}

/**
 * Extracts image path from css background property
 *
 * @param {postcss.decl} decl
 * @return {string} path to image
 */
function extractUrlValue(value) {
    const backgroundPropertyPath = URL_EXTRACT_REGEX.exec(value);
    return backgroundPropertyPath && backgroundPropertyPath[1];
}

/**
 * Checks if file exists
 *
 * @param {string} imagePath path to image
 * @return {boolean}
 */
function fileExists(imagePath) {
    try {
        fs.accessSync(imagePath);
        return true;
    } catch (e) {
        return false;
    }
}

/**
 * Generates path to high resolution image
 *
 * @param {string} filePath path to original image
 * @param {string} suffix high res suffix
 * @return {string} path to image with suffix
 */
function getHighResImagePath(filePath, suffix) {
    const fileExt = path.extname(filePath);
    const fileDir = filePath.substr(0, filePath.length - fileExt.length);
    return `${fileDir}${suffix}${fileExt}`;
}

/**
 * Checks, if high resolution image exists
 *
 * @param {string} filePath - relative path to file
 * @param {string} assetDirectory - absolute path to image folder
 * @param {(string|string[])} retinaSuffixes - possible image suffixes
 * @returns {string} first founded image
 */
function findRetinaImage(filePath, assetDirectory, retinaSuffixes = []) {
    if (typeof retinaSuffixes === 'string') {
        retinaSuffixes = [retinaSuffixes];
    }

    return retinaSuffixes
        .map((sfx) => getHighResImagePath(filePath, sfx))
        .find(retinaFileName => fileExists(path.join(assetDirectory, retinaFileName)));
}

module.exports = {
    findRetinaImage,
    extractUrlValue,
    isUrlPath,
    missingImageWarning,
    URL_EXTRACT_REGEX,
    PROPERTY_TRANSLATIONS,
    IMAGE_PROPERTY_REGEX,
    UNNECESSARY_RETINA_IMAGE_WARNING
};
