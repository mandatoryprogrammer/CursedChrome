/**
* Map all the error code here
*
*/

'use strict';

module.exports = {
  ROOT_CA_NOT_EXISTS: 'ROOT_CA_NOT_EXISTS', // root CA has not been generated yet
  ROOT_CA_EXISTED: 'ROOT_CA_EXISTED', // root CA was existed, be ware that it will be overwrited
  ROOT_CA_COMMON_NAME_UNSPECIFIED: 'ROOT_CA_COMMON_NAME_UNSPECIFIED' // commonName for rootCA is required
};
