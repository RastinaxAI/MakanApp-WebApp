import { contract, operationFor, validator } from './contract';
// One runtime contract and one matcher prevent literal paths (e.g. invitations)
// from being interpreted as parameterized resource IDs.
export const clientContract = contract;
export const clientValidator = validator;
export const clientOperationFor = operationFor;
