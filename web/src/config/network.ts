import settings from '../../config/network.json';
/** Canonical settings live in web/config/network.json; environment overrides are optional. */
export const network = Object.freeze(settings);
